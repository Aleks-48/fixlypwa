import { NextResponse } from "next/server";
import { getCurrentAuth as getAuthContext } from "@/lib/auth/session";  
import { prisma } from "@/lib/db/prisma";

// GET: Получение списка уже импортированных банковских референсов (bankRef)
export async function GET(req: Request) {
  try {
    const auth = await getAuthContext();
    const tenantId = (auth as any)?.tenantId || (auth as any)?.osiId || (auth as any)?.session?.activeOsiId;

    if (!auth || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const osiId = tenantId;

    const existingPayments = await prisma.payment.findMany({
      where: { osiId, bankRef: { not: null } } as any,
      select: { bankRef: true } as any,
    });

    const existingExpenses = await prisma.expense.findMany({
      where: { osiId, bankRef: { not: null } } as any,
      select: { bankRef: true } as any,
    });

    const importedRefs = Array.from(
      new Set([
        ...existingPayments.map((p: any) => p.bankRef).filter(Boolean),
        ...existingExpenses.map((e: any) => e.bankRef).filter(Boolean),
      ])
    );

    return NextResponse.json({ importedRefs });
  } catch (error: any) {
    console.error("Error fetching imported refs:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка получения банковских референсов" },
      { status: 500 }
    );
  }
}

// POST: Разбор и сопоставление транзакций банковской выписки
export async function POST(req: Request) {
  try {
    const auth = await getAuthContext();
    const tenantId = (auth as any)?.tenantId || (auth as any)?.osiId || (auth as any)?.session?.activeOsiId;

    if (!auth || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const osiId = tenantId;
    const body = await req.json().catch(() => ({}));
    const { transactions = [], buildingId } = body;

    // 1. Загружаем существующие bankRef для проверки дубликатов
    const existingPayments = await prisma.payment.findMany({
      where: { osiId, bankRef: { not: null } } as any,
      select: { bankRef: true } as any,
    });

    const existingExpenses = await prisma.expense.findMany({
      where: { osiId, bankRef: { not: null } } as any,
      select: { bankRef: true } as any,
    });

    const existingRefs = new Set([
      ...existingPayments.map((p: any) => p.bankRef),
      ...existingExpenses.map((e: any) => e.bankRef),
    ]);

    // 2. Загружаем квартиры дома вместе со счетами, владельцами и жильцами
    const apartments: any[] = await prisma.apartment.findMany({
      where: buildingId ? { buildingId } : { building: { osiId } },
      include: {
        account: true,
        owners: true,
        occupants: true,
      },
    } as any);

    // 3. Сопоставляем транзакции
    const items = transactions.map((tx: any) => {
      const isDuplicate = tx.bankRef ? existingRefs.has(tx.bankRef) : false;

      let matchedAccountId: string | undefined = undefined;
      let matchedApartmentNumber: string | undefined = undefined;

      if (tx.type === "INCOME") {
        let matchedApartment: any = null;

        // Поиск по номеру квартиры
        if (tx.detectedApartmentNumber) {
          matchedApartment = apartments.find(
            (apt: any) => String(apt.number) === String(tx.detectedApartmentNumber)
          );
        }

        // Поиск по ИИН/БИН
        if (!matchedApartment && tx.counterpartyIinBin) {
          matchedApartment = apartments.find((apt: any) =>
            apt.owners?.some((owner: any) => owner.iin === tx.counterpartyIinBin)
          );
        }

        // Поиск по ФИО в назначении или имени плательщика
        if (!matchedApartment && tx.counterpartyName) {
          const nameLower = tx.counterpartyName.toLowerCase();
          matchedApartment = apartments.find(
            (apt: any) =>
              apt.owners?.some(
                (owner: any) =>
                  owner.fullName &&
                  owner.fullName.trim().length > 2 &&
                  nameLower.includes(owner.fullName.toLowerCase())
              ) ||
              apt.occupants?.some(
                (occ: any) =>
                  occ.fullName &&
                  occ.fullName.trim().length > 2 &&
                  nameLower.includes(occ.fullName.toLowerCase())
              )
          );
        }

        if (matchedApartment) {
          matchedAccountId = matchedApartment.account?.id;
          matchedApartmentNumber = matchedApartment.number;
        }
      }

      return {
        ...tx,
        isDuplicate,
        matchedAccountId,
        matchedApartmentNumber,
      };
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("Error parsing/matching bank import:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка обработки банковской выписки" },
      { status: 500 }
    );
  }
}