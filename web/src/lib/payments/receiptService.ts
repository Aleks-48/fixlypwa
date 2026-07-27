import "server-only";
import { prisma } from "@/lib/db/prisma";
import { forTenant } from "@/lib/db/tenant";

export class ReceiptNotFoundError extends Error {
  constructor(message = "Квитанция не найдена") {
    super(message);
    this.name = "ReceiptNotFoundError";
  }
}

export type ReceiptData = {
  osi: {
    name: string;
    bin: string | null;
    address: string | null;
    ibanCurrent: string | null;
    ibanSavings: string | null;
  };
  building: {
    address: string;
  };
  apartment: {
    number: string;
    area: number | null;
    accountNumber: string;
    residentName: string;
  };
  period: string; // YYYY-MM
  charges: {
    category: string;
    title: string;
    amount: number;
  }[];
  previousBalance: number;
  totalCharged: number;
  totalDue: number;
};

/**
 * Сформировать квитанцию начисления по жителю/платежу в ОСИ (REQ-095)
 */
export async function getReceiptData(
  osiId: string,
  paymentOrUserId: string
): Promise<ReceiptData> {
  return forTenant(osiId, async (tx) => {
    let occupant: any = null;

    // 1. Попытка 1: Ищем напрямую по userId или occupantId
    occupant = await tx.occupant.findFirst({
      where: {
        OR: [{ userId: paymentOrUserId }, { id: paymentOrUserId }],
      } as any,
      include: {
        apartment: {
          include: {
            building: true,
            account: true, // В схеме используется единичное отношение account
          },
        },
      },
    });

    // 2. Попытка 2: Если передан paymentId, идем через payment -> account -> apartment
    if (!occupant) {
      const payment = (await tx.payment.findUnique({
        where: { id: paymentOrUserId } as any,
        include: {
          account: {
            include: {
              apartment: {
                include: {
                  building: true,
                  occupants: true,
                },
              },
            },
          },
        },
      })) as any;

      if (payment?.account?.apartment) {
        const apt = payment.account.apartment;
        const mainResident = apt.occupants?.[0];
        occupant = {
          fullName: mainResident?.fullName || "Жилец",
          apartment: apt,
        };
      }
    }

    if (!occupant || !occupant.apartment) {
      throw new ReceiptNotFoundError("Квитанция или жилец не найдены");
    }

    const apt = occupant.apartment;
    const account = apt.account || apt.accounts?.[0];

    // 3. Данные ОСИ
    const osi = await prisma.osi.findUnique({
      where: { id: osiId },
    });

    // 4. Банковские счета
    const bankAccounts = (await tx.bankAccount.findMany({
      where: { buildingId: apt.buildingId } as any,
    })) as any[];

    const currentAcc = bankAccounts.find((b) => b.type === "CURRENT");
    const savingsAcc = bankAccounts.find((b) => b.type === "SAVINGS");

    // 5. Начисления по лицевому счету
    const charges = account
      ? await tx.charge.findMany({
          where: { accountId: account.id } as any,
          orderBy: { period: "desc" },
          take: 10,
        })
      : [];

    const now = new Date();
    const periodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const chargeItems = charges.map((c: any) => {
      const category = c.incomeCategory || c.category || "OTHER";
      const title =
        category === "MAINTENANCE"
          ? "Управление и содержание МЖД"
          : category === "CAPITAL_REPAIR"
          ? "Накопительный взнос на капитальный ремонт"
          : c.title || "Целевые сборы";

      return {
        category,
        title,
        amount: Number(c.amount) || 0,
      };
    });

    const totalCharged = chargeItems.reduce((sum, item) => sum + item.amount, 0);
    const previousBalance = Number(account?.balance) || 0;

    return {
      osi: {
        name: osi?.name ?? "ОСИ",
        bin: osi?.bin ?? null,
        address: osi?.address ?? null,
        ibanCurrent: currentAcc?.accountNumber ?? currentAcc?.iban ?? null,
        ibanSavings: savingsAcc?.accountNumber ?? savingsAcc?.iban ?? null,
      },
      building: {
        address: apt.building?.address ?? "—",
      },
      apartment: {
        number: String(apt.number),
        area: apt.area ? Number(apt.area) : null,
        accountNumber: account
          ? account.accountNumber || `ACC-${String(apt.number).padStart(4, "0")}`
          : "—",
        residentName: occupant.fullName || "Жилец",
      },
      period: periodStr,
      charges: chargeItems,
      previousBalance,
      totalCharged,
      totalDue: totalCharged,
    };
  });
}