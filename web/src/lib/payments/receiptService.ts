import "server-only";
import { Prisma } from "@prisma/client";
import { forTenant } from "@/lib/db/tenant";
import { incomeToBucket } from "@/lib/finance/service";
export class ReceiptNotFoundError extends Error {}
export type ReceiptData = {
  osi: {
    name: string;
    bin: string | null;
    address: string | null;
    ibanCurrent: string | null;
    ibanSavings: string | null;
  };
  building: { address: string };
  apartment: { number: string; area: number | null; accountNumber: string; residentName: string };
  period: string;
  charges: { category: string; title: string; amount: number }[];
  previousBalance: number;
  totalCharged: number;
  paidInPeriod: number;
  totalDue: number;
  balances: { title: string; debt: number; credit: number }[];
};
// ACCEPT-005: current-month statement, real ledger amounts, resident ownership enforced.
export function getReceiptData(
  osiId: string,
  paymentOrUserId: string,
  viewerUserId = paymentOrUserId,
): Promise<ReceiptData> {
  return forTenant(osiId, async (tx) => {
    const occupant = await tx.occupant.findUnique({
      where: { userId: viewerUserId },
      include: { apartment: { include: { building: true, account: true } } },
    });
    if (!occupant?.apartment.account) throw new ReceiptNotFoundError("Лицевой счёт не найден");
    const { apartment: apt } = occupant;
    const account = apt.account!;
    if (paymentOrUserId !== viewerUserId) {
      const payment = await tx.payment.findFirst({
        where: { id: paymentOrUserId, accountId: account.id },
      });
      if (!payment) throw new ReceiptNotFoundError("Платёж не найден");
    }
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const [osi, banks, charges, payments] = await Promise.all([
      tx.osi.findUniqueOrThrow({ where: { id: osiId } }),
      tx.bankAccount.findMany({ where: { buildingId: apt.buildingId } }),
      tx.charge.findMany({
        where: { accountId: account.id, period: { lt: end } },
        include: { tariff: true },
        orderBy: { period: "asc" },
      }),
      tx.payment.findMany({ where: { accountId: account.id, paidAt: { lte: now } } }),
    ]);
    let previous = new Prisma.Decimal(0),
      charged = new Prisma.Decimal(0),
      paid = new Prisma.Decimal(0);
    const items: ReceiptData["charges"] = [];
    const labels = {
      MAINTENANCE: "Управление и содержание дома",
      CAPITAL_REPAIR: "Взнос на капитальный ремонт",
      TARGETED: "Целевой сбор",
    };
    const buckets = {
      MAINTENANCE: new Prisma.Decimal(0),
      CAPITAL_REPAIR: new Prisma.Decimal(0),
      TARGETED: new Prisma.Decimal(0),
    };
    for (const c of charges) {
      buckets[c.tariff.category] = buckets[c.tariff.category].add(c.amount);
      if (c.period < start) previous = previous.add(c.amount);
      else {
        charged = charged.add(c.amount);
        items.push({
          category: c.tariff.category,
          title: labels[c.tariff.category],
          amount: c.amount.toNumber(),
        });
      }
    }
    for (const p of payments) {
      const bucket = incomeToBucket(p.incomeCategory);
      if (!bucket) continue;
      buckets[bucket] = buckets[bucket].sub(p.amount);
      if (p.paidAt < start) previous = previous.sub(p.amount);
      else paid = paid.add(p.amount);
    }
    const balances = (Object.keys(buckets) as Array<keyof typeof buckets>).map((category) => ({
      title: labels[category],
      debt: Math.max(0, buckets[category].toNumber()),
      credit: Math.max(0, buckets[category].negated().toNumber()),
    }));
    return {
      osi: {
        name: osi.name,
        bin: osi.bin,
        address: osi.address,
        ibanCurrent: banks.find((b) => b.type === "CURRENT")?.accountNumber ?? null,
        ibanSavings: banks.find((b) => b.type === "SAVINGS")?.accountNumber ?? null,
      },
      building: { address: apt.building.address },
      apartment: {
        number: apt.number,
        area: apt.area?.toNumber() ?? null,
        accountNumber: account.accountNumber ?? "не указан",
        residentName: occupant.fullName,
      },
      period: start.toISOString().slice(0, 7),
      charges: items,
      previousBalance: previous.toNumber(),
      totalCharged: charged.toNumber(),
      paidInPeriod: paid.toNumber(),
      totalDue: Object.values(buckets)
        .reduce(
          (sum, amount) => (amount.greaterThan(0) ? sum.add(amount) : sum),
          new Prisma.Decimal(0),
        )
        .toNumber(),
      balances,
    };
  });
}
