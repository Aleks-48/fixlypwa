import { activeChairmanOsi } from "@/lib/auth/guards";
import { getCurrentAuth } from "@/lib/auth/session";
import { forTenant } from "@/lib/db/tenant";
import { Errors,ok } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/analytics/chairman?period=month|quarter|year
// Агрегированная статистика ОСИ для аналитики председателя в мобильном приложении.
// Все данные изолированы RLS через forTenant().
export async function GET(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const osiId = activeChairmanOsi(auth);
  if (!osiId) return Errors.forbidden();

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "month";

  const now = new Date();
  let from: Date;
  if (period === "year") {
    from = new Date(now.getFullYear(), 0, 1);
  } else if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    from = new Date(now.getFullYear(), q * 3, 1);
  } else {
    // month (default)
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  try {
    const data = await forTenant(osiId, async (tx) => {
      const [
        totalRequests,
        resolvedCount,
        inProgressCount,
        receivedCount,
        byCategory,
        chargesAgg,
        paymentsAgg,
        apartmentsTotal,
        activePolls,
      ] = await Promise.all([
        tx.request.count({ where: { createdAt: { gte: from } } }).catch(() => 0),
        tx.request.count({ where: { status: "RESOLVED", createdAt: { gte: from } } }).catch(() => 0),
        tx.request.count({ where: { status: "IN_PROGRESS" } }).catch(() => 0),
        tx.request.count({ where: { status: "RECEIVED" } }).catch(() => 0),
        tx.request.groupBy({
          by: ["category"],
          _count: { id: true },
          where: { createdAt: { gte: from } },
        }).catch(() => []),
        tx.charge.aggregate({
          _sum: { amount: true },
          where: { period: { gte: from } },
        }).catch(() => ({ _sum: { amount: null } })),
        tx.payment.aggregate({
          _sum: { amount: true },
          where: { paidAt: { gte: from } },
        }).catch(() => ({ _sum: { amount: null } })),
        tx.apartment.count().catch(() => 0),
        tx.poll.count({
          where: {
            OR: [
              { deadline: null },
              { deadline: { gte: new Date() } },
            ],
          },
        }).catch(() => 0),
      ]);

      let debtorApartments = 0;
      try {
        const debtors = await tx.charge.groupBy({
          by: ["accountId"],
          where: { status: { not: "PAID" } },
        });
        debtorApartments = debtors.length;
      } catch {
        debtorApartments = 0;
      }

      const totalCharged = Number(chargesAgg._sum?.amount ?? 0);
      const totalPaid = Number(paymentsAgg._sum?.amount ?? 0);
      const totalDebt = Math.max(0, totalCharged - totalPaid);

      const categoryMap: Record<string, number> = {};
      if (Array.isArray(byCategory)) {
        for (const c of byCategory) {
          if (c?.category) {
            categoryMap[c.category] = c._count?.id ?? 0;
          }
        }
      }

      return {
        requests: {
          total: totalRequests,
          resolved: resolvedCount,
          inProgress: inProgressCount,
          received: receivedCount,
          byCategory: categoryMap,
        },
        finance: {
          totalCharged,
          totalPaid,
          totalDebt,
          apartmentsWithDebt: debtorApartments,
          apartmentsTotal,
          progressPct: totalCharged > 0 ? Math.round((totalPaid / totalCharged) * 100) : 0,
        },
        polls: {
          active: activePolls,
        },
      };
    });

    return ok(data);
  } catch {
    // В случае любой необработанной ошибки возвращаем структуру с нулями вместо 500
    return ok({
      requests: { total: 0, resolved: 0, inProgress: 0, received: 0, byCategory: {} },
      finance: { totalCharged: 0, totalPaid: 0, totalDebt: 0, apartmentsWithDebt: 0, apartmentsTotal: 0, progressPct: 0 },
      polls: { active: 0 },
    });
  }
}
