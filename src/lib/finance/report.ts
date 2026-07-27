import type { IncomeCategory, ExpenseCategory, Prisma, ReportType } from "@prisma/client";
import { forTenant } from "@/lib/db/tenant";
import { accountBalances } from "./service";

// Автоотчёт по форме приказа №163 Приложение 3 (report-spec.md §2): 4 блока —
// остатки / задолженность / поступления 6.1–6.7 / расходы 7.x. Снимок в Report.data
// (REQ-040/041), публикация открывает жителям (REQ-043). Публичное представление —
// §2а: ФИО физлиц-контрагентов скрываются («ФОТ персонала»), юрлица с БИН — показываются.

export type ReportData = {
  balances: { current: number; savings: number }; // блок 1–2
  debt: { maintenance: number; parking: number; capitalRepair: number }; // блок 3–5
  income: Partial<Record<IncomeCategory, number>> & { total: number }; // блок 6
  expenses: {
    total: number;
    byCategory: Partial<Record<ExpenseCategory, number>>;
    rows: {
      date: string;
      category: ExpenseCategory;
      counterparty: { name: string; bin: string | null; type: string | null } | null;
      purpose: string | null;
      amount: number;
    }[];
  }; // блок 7
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function generateReport(
  osiId: string,
  buildingId: string,
  periodFrom: Date,
  periodTo: Date,
  type: ReportType = "MONTHLY", // REQ-045: месяц/квартал/год — форма одна, период разный
) {
  return forTenant(osiId, async (tx) => {
    // Блок 1–2: остатки на счетах (вводятся председателем, REQ-026).
    const banks = await tx.bankAccount.findMany({ where: { buildingId } });
    const balances = {
      current: Number(banks.find((b) => b.type === "CURRENT")?.currentBalance ?? 0),
      savings: Number(banks.find((b) => b.type === "SAVINGS")?.currentBalance ?? 0),
    };

    // Счета дома.
    const accounts = await tx.account.findMany({
      where: { apartment: { buildingId } },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);

    // Блок 3–5: задолженность на конец периода, по бакетам (REQ-024).
    let maintenance = 0;
    let capitalRepair = 0;
    let targeted = 0;
    for (const id of accountIds) {
      const b = await accountBalances(tx, id, periodTo);
      maintenance += b.MAINTENANCE.debt;
      targeted += b.TARGETED.debt;
      capitalRepair += b.CAPITAL_REPAIR.debt;
    }
    // Форма: стр.3 — взносы на управление/содержание; стр.4 — парковки/кладовки (у нас
    // внутри MAINTENANCE, отдельного учёта парковок в MVP нет → 0); стр.5 — кап.ремонт.
    const debt = {
      maintenance: r2(maintenance + targeted),
      parking: 0,
      capitalRepair: r2(capitalRepair),
    };

    // Блок 6: поступления за период по категориям 6.1–6.7.
    const payments = await tx.payment.groupBy({
      by: ["incomeCategory"],
      where: { accountId: { in: accountIds }, paidAt: { gte: periodFrom, lte: periodTo } },
      _sum: { amount: true },
    });
    const income: ReportData["income"] = { total: 0 };
    for (const p of payments) {
      const v = r2(Number(p._sum.amount ?? 0));
      income[p.incomeCategory] = v;
      income.total = r2(income.total + v);
    }

    // Блок 7: расходы за период (без внутренних переводов — report-spec §3).
    const expenseRows = await tx.expense.findMany({
      where: {
        buildingId,
        isInternalTransfer: false,
        date: { gte: periodFrom, lte: periodTo },
      },
      orderBy: { date: "asc" },
      include: { counterparty: true },
    });
    const byCategory: ReportData["expenses"]["byCategory"] = {};
    let expTotal = 0;
    const rows = expenseRows.map((e) => {
      const amount = r2(Number(e.amount));
      expTotal = r2(expTotal + amount);
      byCategory[e.expenseCategory] = r2((byCategory[e.expenseCategory] ?? 0) + amount);
      return {
        date: e.date.toISOString().slice(0, 10),
        category: e.expenseCategory,
        counterparty: e.counterparty
          ? { name: e.counterparty.name, bin: e.counterparty.bin, type: e.counterparty.type }
          : null,
        purpose: e.purpose,
        amount,
      };
    });

    const data: ReportData = {
      balances,
      debt,
      income,
      expenses: { total: expTotal, byCategory, rows },
    };

    return tx.report.create({
      data: {
        osiId,
        buildingId,
        type,
        periodFrom,
        periodTo,
        status: "GENERATED",
        generatedAt: new Date(),
        data: data as unknown as Prisma.InputJsonValue,
      },
    });
  });
}

export function listReports(osiId: string, buildingId: string) {
  return forTenant(osiId, (tx) =>
    tx.report.findMany({
      where: { buildingId },
      orderBy: { periodFrom: "desc" },
      select: { id: true, type: true, periodFrom: true, periodTo: true, status: true, publishedAt: true },
    }),
  );
}

export function publishReport(osiId: string, reportId: string) {
  return forTenant(osiId, async (tx) => {
    const rep = await tx.report.findUnique({ where: { id: reportId }, select: { id: true } });
    if (!rep) return null;
    return tx.report.update({
      where: { id: reportId },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
  });
}

// Чтение отчёта. publicView (житель): только PUBLISHED + скрытие ПДн физлиц (§2а) —
// физлицо-контрагент заменяется агрегатом «ФОТ персонала (ДГП)», ИИН/BIN физлиц не отдаются.
export function getReport(osiId: string, reportId: string, publicView: boolean) {
  return forTenant(osiId, async (tx) => {
    const rep = await tx.report.findUnique({ where: { id: reportId } });
    if (!rep) return null;
    if (publicView && rep.status !== "PUBLISHED") return null;

    const data = rep.data as unknown as ReportData | null;
    if (data && publicView) {
      data.expenses.rows = data.expenses.rows.map((row) =>
        row.counterparty && row.counterparty.type === "физлицо"
          ? { ...row, counterparty: { name: "ФОТ персонала (ДГП)", bin: null, type: null }, purpose: null }
          : row,
      );
    }
    return { ...rep, data };
  });
}

// Опубликованные отчёты дома жителю (REQ-043/051 — весь отчёт дома).
export function listPublishedReports(osiId: string, buildingId: string) {
  return forTenant(osiId, (tx) =>
    tx.report.findMany({
      where: { buildingId, status: "PUBLISHED" },
      orderBy: { periodFrom: "desc" },
      select: { id: true, type: true, periodFrom: true, periodTo: true, publishedAt: true },
    }),
  );
}
