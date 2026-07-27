import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/db/prisma";
import { getCurrentAuth as getAuthContext } from "@/lib/auth/session";
import { IncomeCategory, ExpenseCategory, Prisma } from "@prisma/client";

interface ImportItemPayload {
  bankRef: string;
  date: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  purpose: string;
  matchedAccountId?: string;
  buildingId?: string;
  bankAccountId?: string;
  incomeCategory?: IncomeCategory;
  expenseCategory?: ExpenseCategory;
  isDuplicate?: boolean;
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext();
    // Замени строку 23:
const osiId = (auth as any)?.tenantId || (auth as any)?.osiId || (auth as any)?.session?.activeOsiId;

    if (!auth || !osiId) {
      return NextResponse.json(
        { error: "Необходима авторизация в ОСИ" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const items: ImportItemPayload[] = body.items || [];

    if (!items.length) {
      return NextResponse.json(
        { error: "Список транзакций пуст" },
        { status: 400 }
      );
    }

    let paymentsCreated = 0;
    let expensesCreated = 0;
    let skippedDuplicates = 0;

    // Выполняем запись транзакцией
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of items) {
        if (item.isDuplicate) {
          skippedDuplicates++;
          continue;
        }

        if (item.type === "INCOME") {
          if (!item.matchedAccountId) continue; // Пропускаем несопоставленные

          await tx.payment.create({
            data: {
              osiId,
              accountId: item.matchedAccountId,
              amount: item.amount,
              paidAt: new Date(item.date),
              method: "Банковская выписка",
              bankRef: item.bankRef,
              incomeCategory:
                item.incomeCategory ||
                (IncomeCategory as any)?.RESIDENT_DUES ||
                "RESIDENT_DUES",
            } as any,
          });
          paymentsCreated++;
        } else if (item.type === "EXPENSE") {
          if (!item.buildingId || !item.bankAccountId) continue;

          await tx.expense.create({
            data: {
              osiId,
              buildingId: item.buildingId,
              bankAccountId: item.bankAccountId,
              expenseCategory:
                item.expenseCategory ||
                (ExpenseCategory as any)?.HOUSEHOLD ||
                "HOUSEHOLD",
              date: new Date(item.date),
              amount: item.amount,
              purpose: item.purpose,
              bankRef: item.bankRef,
            } as any,
          });
          expensesCreated++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      paymentsCreated,
      expensesCreated,
      skippedDuplicates,
    });
  } catch (error: any) {
    console.error("Error committing bank import:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка проведения выписки" },
      { status: 500 }
    );
  }
}