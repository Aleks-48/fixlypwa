import type { IncomeCategory, ExpenseCategory, Prisma, TariffCategory } from "@prisma/client";
import { forTenant } from "@/lib/db/tenant";
import { notifyChargesCreated } from "@/lib/notifications/service";

// Best-effort: сбой уведомления не должен ронять начисление, оно уже записано (тот же паттерн,
// что fireAndLog в comms/service.ts).
function fireAndLog(p: Promise<void>): Promise<void> {
  return p.catch((err) => {
    console.error("[notify] trigger failed:", err instanceof Error ? err.message : err);
  });
}

// Фаза 2: тарифы → начисления → платежи → балансы + счета/расходы (REQ-020..031, 025/026).
// Все мутации Charge/Payment/Tariff/Expense журналируются в AuditLog (REQ-090/NFR-055) —
// в тех же forTenant-транзакциях, append-only.

type Tx = Prisma.TransactionClient;

function audit(
  tx: Tx,
  osiId: string,
  actorUserId: string,
  entityType: "CHARGE" | "PAYMENT" | "TARIFF" | "EXPENSE",
  entityId: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  diff?: unknown,
) {
  return tx.auditLog.create({
    data: {
      osiId,
      entityType,
      entityId,
      action,
      actorUserId,
      diff: diff === undefined ? undefined : (diff as Prisma.InputJsonValue),
    },
  });
}

// Соответствие категории поступления бакету задолженности (REQ-024, schema.prisma).
export function incomeToBucket(cat: IncomeCategory): TariffCategory | null {
  switch (cat) {
    case "RESIDENT_DUES":
    case "PARKING_STORAGE_DUES":
      return "MAINTENANCE";
    case "CAPITAL_REPAIR_CONTRIBUTION":
      return "CAPITAL_REPAIR";
    case "TARGETED_RESIDENT":
    case "TARGETED_PARKING":
      return "TARGETED";
    default:
      return null; // аренда/иное — вне бакетов долга
  }
}

// ================= Тарифы (REQ-020) =================
export function listTariffs(osiId: string, buildingId: string) {
  return forTenant(osiId, (tx) =>
    tx.tariff.findMany({ where: { buildingId }, orderBy: [{ category: "asc" }, { periodFrom: "desc" }] }),
  );
}

export function createTariff(
  osiId: string,
  actorUserId: string,
  input: {
    buildingId: string;
    category: TariffCategory;
    rateType: "PER_SQM" | "FIXED";
    rate: number;
    periodFrom: Date;
  },
) {
  return forTenant(osiId, async (tx) => {
    // Новый тариф той же статьи закрывает предыдущий открытый (periodTo = periodFrom нового).
    await tx.tariff.updateMany({
      where: { buildingId: input.buildingId, category: input.category, periodTo: null },
      data: { periodTo: input.periodFrom },
    });
    const tariff = await tx.tariff.create({ data: { osiId, ...input } });
    await audit(tx, osiId, actorUserId, "TARIFF", tariff.id, "CREATE", {
      category: input.category,
      rate: input.rate,
      rateType: input.rateType,
    });
    return tariff;
  });
}

// ================= Начисления (REQ-021/023) =================
type ByApartment = { apartmentId: string; accountId: string; period: Date; amount: number };

// Массовая генерация за месяц: квартиры дома × активные тарифы. Идемпотентно
// (existing account+tariff+period пропускается). PER_SQM без площади — пропуск (skipped).
export async function generateCharges(
  osiId: string,
  actorUserId: string,
  buildingId: string,
  period: Date, // первый день месяца
) {
  const result = await forTenant(osiId, async (tx) => {
    const apartments = await tx.apartment.findMany({
      where: { buildingId },
      include: { account: true },
    });
    const tariffs = await tx.tariff.findMany({
      where: {
        buildingId,
        periodFrom: { lte: period },
        OR: [{ periodTo: null }, { periodTo: { gt: period } }],
      },
    });
    if (apartments.length === 0 || tariffs.length === 0) {
      return { created: 0, skipped: 0, byApartment: [] as ByApartment[] };
    }

    // Лицевой счёт — при первой генерации (Q-006: 1 квартира = 1 Account).
    for (const apt of apartments) {
      if (!apt.account) {
        apt.account = await tx.account.create({
          data: { osiId, apartmentId: apt.id, accountNumber: `A-${apt.number}` },
        });
      }
    }

    const existing = await tx.charge.findMany({
      where: { period, tariffId: { in: tariffs.map((t) => t.id) } },
      select: { accountId: true, tariffId: true },
    });
    const seen = new Set(existing.map((e) => `${e.accountId}:${e.tariffId}`));

    const dueDate = new Date(period.getFullYear(), period.getMonth() + 1, 10); // до 10-го след. месяца
    let created = 0;
    let skipped = 0;
    // Сумма НОВЫХ начислений за этот прогон, по квартире (REQ-106) — одно уведомление на
    // квартиру, а не по каждому тарифу отдельно.
    const byApartmentMap = new Map<string, ByApartment>();

    for (const apt of apartments) {
      for (const t of tariffs) {
        const key = `${apt.account!.id}:${t.id}`;
        if (seen.has(key)) {
          skipped++;
          continue;
        }
        let amount: number;
        if (t.rateType === "PER_SQM") {
          if (apt.area === null) {
            skipped++;
            continue;
          }
          amount = Math.round(Number(t.rate) * Number(apt.area) * 100) / 100;
        } else {
          amount = Number(t.rate);
        }
        const charge = await tx.charge.create({
          data: { osiId, accountId: apt.account!.id, tariffId: t.id, period, amount, dueDate },
        });
        await audit(tx, osiId, actorUserId, "CHARGE", charge.id, "CREATE", {
          period: period.toISOString().slice(0, 10),
          amount,
        });
        created++;
        const acc = byApartmentMap.get(apt.id);
        byApartmentMap.set(apt.id, {
          apartmentId: apt.id,
          accountId: apt.account!.id,
          period,
          amount: (acc?.amount ?? 0) + amount,
        });
      }
    }
    return { created, skipped, byApartment: [...byApartmentMap.values()] };
  });

  // REQ-106: уведомление жителям квартиры ПОСЛЕ коммита транзакции — best-effort, сбой
  // доставки не должен ронять уже записанное начисление (тот же паттерн, что в comms/service.ts).
  await fireAndLog(notifyChargesCreated(osiId, result.byApartment));
  return { created: result.created, skipped: result.skipped };
}

// ================= Платежи (REQ-030/024) =================
// FIFO-пересчёт статусов начислений бакета после платежа (REQ-023): оплачено/частично/открыто.
async function recomputeStatuses(tx: Tx, accountId: string, bucket: TariffCategory) {
  const [charges, paidAgg] = await Promise.all([
    tx.charge.findMany({
      where: { accountId, tariff: { category: bucket } },
      orderBy: { period: "asc" },
    }),
    tx.payment.aggregate({
      where: { accountId, incomeCategory: { in: bucketIncomeCategories(bucket) } },
      _sum: { amount: true },
    }),
  ]);
  let paid = Number(paidAgg._sum.amount ?? 0);
  for (const c of charges) {
    const amt = Number(c.amount);
    const status = paid >= amt ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : "OPEN";
    paid = Math.max(0, paid - amt);
    if (c.status !== status) {
      await tx.charge.update({ where: { id: c.id }, data: { status } });
    }
  }
}

function bucketIncomeCategories(bucket: TariffCategory): IncomeCategory[] {
  switch (bucket) {
    case "MAINTENANCE":
      return ["RESIDENT_DUES", "PARKING_STORAGE_DUES"];
    case "CAPITAL_REPAIR":
      return ["CAPITAL_REPAIR_CONTRIBUTION"];
    case "TARGETED":
      return ["TARGETED_RESIDENT", "TARGETED_PARKING"];
  }
}

export function addPayment(
  osiId: string,
  actorUserId: string,
  input: {
    accountId: string;
    amount: number;
    paidAt: Date;
    incomeCategory: IncomeCategory;
    method?: string;
    gatewayRef?: string;
  },
) {
  return forTenant(osiId, async (tx) => {
    const account = await tx.account.findUnique({ where: { id: input.accountId } });
    if (!account) return null;
    const payment = await tx.payment.create({
      data: { osiId, ...input, method: input.method ?? "ручной ввод" },
    });
    await audit(tx, osiId, actorUserId, "PAYMENT", payment.id, "CREATE", {
      amount: input.amount,
      incomeCategory: input.incomeCategory,
    });
    const bucket = incomeToBucket(input.incomeCategory);
    if (bucket) await recomputeStatuses(tx, input.accountId, bucket);
    return payment;
  });
}

// ================= Онлайн-оплата (демо, REQ-033..036, payments-online.md/ADR-0010) =================
export type PayOnlineResult =
  | { success: true; alreadyPaid: true }
  | { success: true; alreadyPaid: false; gatewayRef: string; amount: number }
  | { success: false; reason: "insufficient_funds" }
  | { success: false; reason: "no_account" }
  | { success: false; reason: "amount_changed"; currentAmount: number };

// Бакет → статья поступления для онлайн-оплаты жителем (payments-online.md §4): варианты
// «парковка»/«аренда» недоступны здесь — это ручной ввод председателя (FinanceForms).
const BUCKET_INCOME_CATEGORY: Record<TariffCategory, IncomeCategory> = {
  MAINTENANCE: "RESIDENT_DUES",
  TARGETED: "TARGETED_RESIDENT",
  CAPITAL_REPAIR: "CAPITAL_REPAIR_CONTRIBUTION",
};

function totalDebt(balances: Balances): number {
  return Object.values(balances).reduce((s, b) => s + b.debt, 0);
}

// Симулятор эквайринга (payments-online.md §4, ADR-0010) — демо-режим, без реального банка.
// Сумма к списанию — весь текущий долг жителя по всем бакетам, пересчитанный на сервере (не
// принимается от клиента): исключает манипуляцию суммой и даёт идемпотентность (REQ-034) —
// повторный вызов при уже погашенном долге — no-op.
//
// expectedAmount (опционально) — сумма, которую жителю показали при открытии шторки. Если к
// моменту вызова реальный долг уже другой (например, председатель провёл платёж, пока шторка
// была открыта), вызов отклоняется явной ошибкой вместо тихого списания другой суммы (REQ-036).
//
// Долг перечитывается ПОСЛЕ имитации задержки, в одной транзакции со списанием — окно гонки
// при двойном клике сужено до времени одной транзакции, а не всей задержки (payments-online.md §4).
export async function payOnlineDemo(
  osiId: string,
  userId: string,
  method: "test_card" | "test_qr",
  expectedAmount?: number,
): Promise<PayOnlineResult> {
  const initial = await forTenant(osiId, async (tx) => {
    const occ = await tx.occupant.findFirst({
      where: { userId },
      select: { apartment: { select: { account: { select: { id: true } } } } },
    });
    const accountId = occ?.apartment.account?.id ?? null;
    if (!accountId) return { accountId: null as string | null, total: 0 };
    return { accountId, total: totalDebt(await accountBalances(tx, accountId)) };
  });
  if (!initial.accountId) return { success: false, reason: "no_account" };
  if (initial.total === 0) return { success: true, alreadyPaid: true };
  if (expectedAmount !== undefined && Math.abs(expectedAmount - initial.total) > 0.01) {
    return { success: false, reason: "amount_changed", currentAmount: initial.total };
  }
  const accountId = initial.accountId;

  // Имитация задержки эквайринга (реалистичность демо, как в исходном ТЗ).
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 5% симулированный отказ — данные не меняются (REQ-036).
  if (Math.random() < 0.05) return { success: false, reason: "insufficient_funds" };

  const gatewayRef = `TEST-TX-${Math.floor(Math.random() * 1_000_000)}`;
  const methodLabel = method === "test_card" ? "Тест: картой" : "Тест: QR";

  // Один forTenant на всё списание (не цикл addPayment с отдельной транзакцией на бакет) —
  // если бакетов с долгом несколько, платёж по ним атомарен: либо все, либо ни одного.
  return forTenant(osiId, async (tx) => {
    const balances = await accountBalances(tx, accountId);
    const debts = (Object.entries(balances) as [TariffCategory, BucketBalance][]).filter(
      ([, b]) => b.debt > 0,
    );
    // Долг мог исчезнуть за время задержки (погашен другим вызовом/председателем) — no-op.
    if (debts.length === 0) return { success: true, alreadyPaid: true };

    let total = 0;
    for (const [bucket, b] of debts) {
      const payment = await tx.payment.create({
        data: {
          osiId,
          accountId,
          amount: b.debt,
          paidAt: new Date(),
          incomeCategory: BUCKET_INCOME_CATEGORY[bucket],
          method: methodLabel,
          gatewayRef,
        },
      });
      await audit(tx, osiId, userId, "PAYMENT", payment.id, "CREATE", {
        amount: b.debt,
        incomeCategory: BUCKET_INCOME_CATEGORY[bucket],
      });
      await recomputeStatuses(tx, accountId, bucket);
      total += b.debt;
    }
    return { success: true, alreadyPaid: false, gatewayRef, amount: total };
  });
}

// ================= Балансы (REQ-024/031, вычисляются) =================
export type BucketBalance = { charged: number; paid: number; debt: number };
export type Balances = Record<TariffCategory, BucketBalance>;

export async function accountBalances(tx: Tx, accountId: string, until?: Date): Promise<Balances> {
  const buckets: TariffCategory[] = ["MAINTENANCE", "TARGETED", "CAPITAL_REPAIR"];
  const out = {} as Balances;
  for (const b of buckets) {
    const [ch, pm] = await Promise.all([
      tx.charge.aggregate({
        where: { accountId, tariff: { category: b }, ...(until ? { period: { lte: until } } : {}) },
        _sum: { amount: true },
      }),
      tx.payment.aggregate({
        where: {
          accountId,
          incomeCategory: { in: bucketIncomeCategories(b) },
          ...(until ? { paidAt: { lte: until } } : {}),
        },
        _sum: { amount: true },
      }),
    ]);
    const charged = Number(ch._sum.amount ?? 0);
    const paid = Number(pm._sum.amount ?? 0);
    out[b] = { charged, paid, debt: Math.max(0, Math.round((charged - paid) * 100) / 100) };
  }
  return out;
}

// Баланс жителя — по Account его квартиры (REQ-050/052: Occupant видит данные квартиры).
export function residentBalances(osiId: string, userId: string) {
  return forTenant(osiId, async (tx) => {
    const occ = await tx.occupant.findFirst({
      where: { userId },
      select: { apartment: { select: { account: { select: { id: true } } } } },
    });
    const accountId = occ?.apartment.account?.id;
    if (!accountId) return null;
    return accountBalances(tx, accountId);
  });
}

// Начисления жителя (страница «Платежи», ui-redesign.md §3). Read-only, последние периоды.
export function listResidentCharges(osiId: string, userId: string) {
  return forTenant(osiId, async (tx) => {
    const occ = await tx.occupant.findFirst({
      where: { userId },
      select: { apartment: { select: { account: { select: { id: true } } } } },
    });
    const accountId = occ?.apartment.account?.id;
    if (!accountId) return [];
    return tx.charge.findMany({
      where: { accountId },
      orderBy: { period: "desc" },
      take: 12,
      include: { tariff: { select: { category: true } } },
    });
  });
}

// История платежей жителя (страница «Платежи»). Read-only.
export function listResidentPayments(osiId: string, userId: string) {
  return forTenant(osiId, async (tx) => {
    const occ = await tx.occupant.findFirst({
      where: { userId },
      select: { apartment: { select: { account: { select: { id: true } } } } },
    });
    const accountId = occ?.apartment.account?.id;
    if (!accountId) return [];
    return tx.payment.findMany({
      where: { accountId },
      orderBy: { paidAt: "desc" },
      take: 12,
    });
  });
}

// Поступления по месяцам за N месяцев (гистограмма на «Финансах», ui-redesign.md §3).
// Read-only: платежи дома группируются в JS — объёмы MVP это позволяют.
export function monthlyIncome(osiId: string, buildingId: string, months = 6) {
  return forTenant(osiId, async (tx) => {
    const from = new Date();
    from.setUTCMonth(from.getUTCMonth() - (months - 1), 1);
    from.setUTCHours(0, 0, 0, 0);
    const payments = await tx.payment.findMany({
      where: { paidAt: { gte: from }, account: { apartment: { buildingId } } },
      select: { amount: true, paidAt: true },
    });
    const out: { month: Date; total: number }[] = [];
    for (let i = 0; i < months; i++) {
      const m = new Date(from);
      m.setUTCMonth(from.getUTCMonth() + i);
      out.push({ month: m, total: 0 });
    }
    for (const p of payments) {
      const idx =
        (p.paidAt.getUTCFullYear() - from.getUTCFullYear()) * 12 +
        (p.paidAt.getUTCMonth() - from.getUTCMonth());
      if (out[idx]) out[idx].total += Number(p.amount);
    }
    return out;
  });
}

// Квартиры дома с балансами (экран «Финансы» председателя).
export function buildingAccounts(osiId: string, buildingId: string) {
  return forTenant(osiId, async (tx) => {
    const apartments = await tx.apartment.findMany({
      where: { buildingId },
      orderBy: { number: "asc" },
      include: { account: { select: { id: true } } },
    });
    const rows = [];
    for (const a of apartments) {
      rows.push({
        apartmentId: a.id,
        number: a.number,
        accountId: a.account?.id ?? null,
        balances: a.account ? await accountBalances(tx, a.account.id) : null,
      });
    }
    return rows;
  });
}

// ================= Банковские счета и расходы (REQ-025/026) =================
export function listBankAccounts(osiId: string, buildingId: string) {
  return forTenant(osiId, (tx) =>
    tx.bankAccount.findMany({ where: { buildingId }, orderBy: { type: "asc" } }),
  );
}

export function upsertBankAccount(
  osiId: string,
  input: {
    buildingId: string;
    type: "CURRENT" | "SAVINGS";
    bankName: string;
    accountNumber: string;
    currentBalance: number;
  },
) {
  return forTenant(osiId, async (tx) => {
    const existing = await tx.bankAccount.findFirst({
      where: { buildingId: input.buildingId, type: input.type },
    });
    if (existing) {
      return tx.bankAccount.update({
        where: { id: existing.id },
        data: {
          bankName: input.bankName,
          accountNumber: input.accountNumber,
          currentBalance: input.currentBalance,
        },
      });
    }
    return tx.bankAccount.create({ data: { osiId, ...input } });
  });
}

export function listExpenses(osiId: string, buildingId: string, from?: Date, to?: Date) {
  return forTenant(osiId, (tx) =>
    tx.expense.findMany({
      where: {
        buildingId,
        ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      orderBy: { date: "desc" },
      include: { counterparty: true },
    }),
  );
}

export function createExpense(
  osiId: string,
  actorUserId: string,
  input: {
    buildingId: string;
    bankAccountId: string;
    expenseCategory: ExpenseCategory;
    date: Date;
    amount: number;
    purpose?: string;
    counterpartyName?: string;
    counterpartyBin?: string;
    counterpartyType?: string; // ИП/ТОО/НАО/физлицо
    isInternalTransfer?: boolean;
  },
) {
  return forTenant(osiId, async (tx) => {
    let counterpartyId: string | null = null;
    if (input.counterpartyName) {
      // Unique по name нет — переиспользуем по имени в рамках тенанта, иначе создаём.
      const found = await tx.counterparty.findFirst({ where: { name: input.counterpartyName } });
      const cp = found
        ? await tx.counterparty.update({
            where: { id: found.id },
            data: { bin: input.counterpartyBin ?? found.bin, type: input.counterpartyType ?? found.type },
          })
        : await tx.counterparty.create({
            data: {
              osiId,
              name: input.counterpartyName,
              bin: input.counterpartyBin ?? null,
              type: input.counterpartyType ?? null,
            },
          });
      counterpartyId = cp.id;
    }
    const expense = await tx.expense.create({
      data: {
        osiId,
        buildingId: input.buildingId,
        bankAccountId: input.bankAccountId,
        expenseCategory: input.expenseCategory,
        date: input.date,
        amount: input.amount,
        purpose: input.purpose ?? null,
        counterpartyId,
        isInternalTransfer: input.isInternalTransfer ?? false,
      },
    });
    await audit(tx, osiId, actorUserId, "EXPENSE", expense.id, "CREATE", {
      category: input.expenseCategory,
      amount: input.amount,
    });
    return expense;
  });
}
