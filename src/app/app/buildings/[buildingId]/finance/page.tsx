import { notFound, redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { getBuilding } from "@/lib/onboarding/service";
import { listTariffs, buildingAccounts, monthlyIncome } from "@/lib/finance/service";
import { Card, CardContent } from "@/components/ui/card";
import { TariffForm, GenerateChargesForm, PaymentForm } from "../../../_components/FinanceForms";
import { PageBody, PageHeader } from "../../../_components/PageHeader";
import { BarChart } from "../../../_components/BarChart";

// Импорт через относительные пути без применения алиаса @/
import { ApartmentsDebtTable } from "../../../_components/ApartmentsDebtTable";
import type { ApartmentFinanceAccount } from "../../../_components/ApartmentsDebtTable";

export const dynamic = "force-dynamic";

const CAT: Record<string, string> = {
  MAINTENANCE: "Содержание",
  TARGETED: "Целевой",
  CAPITAL_REPAIR: "Кап. ремонт",
};

// «Финансы» дома (Фаза 2): тарифы → начисления → платежи → таблица ЕОСИ по квартирам.
export default async function FinancePage({ params }: { params: Promise<{ buildingId: string }> }) {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");
  const osiId = activeChairmanOsi(auth);
  if (!osiId) redirect("/app");

  const { buildingId } = await params;
  const building = await getBuilding(osiId, buildingId);
  if (!building) notFound();

  const [tariffs, rows, income] = await Promise.all([
    listTariffs(osiId, buildingId),
    buildingAccounts(osiId, buildingId),
    monthlyIncome(osiId, buildingId),
  ]);

  const accounts = rows
    .filter((r) => r.accountId)
    .map((r) => ({ accountId: r.accountId!, number: r.number }));

  // Сводка по дому: суммы по всем бакетам всех квартир.
  const sum = { charged: 0, paid: 0, debt: 0 };
  for (const r of rows) {
    if (!r.balances) continue;
    for (const b of Object.values(r.balances)) {
      sum.charged += b.charged;
      sum.paid += b.paid;
      sum.debt += b.debt;
    }
  }

  const debtors = rows.filter((r) => {
    if (!r.balances) return false;
    return Object.values(r.balances).some((b) => b.debt > 0);
  });

  const fmt = (n: number) => `₸ ${Math.round(n).toLocaleString("ru-RU")}`;
  const hasIncome = income.some((m) => m.total > 0);

  // Трансформация реальных данных бэкенда в иерархический формат таблицы ЕОСИ
  const tableData: ApartmentFinanceAccount[] = rows.map((r) => {
    const categories = [];

    if (r.balances) {
      if (r.balances.MAINTENANCE) {
        categories.push({
          title: "Текущие взносы на управление (РСЖ)",
          startBalance: (r.balances.MAINTENANCE as any).startBalance ?? 0,
          accrued: r.balances.MAINTENANCE.charged ?? 0,
          adjustments: (r.balances.MAINTENANCE as any).adjustments ?? 0,
          paid: r.balances.MAINTENANCE.paid ?? 0,
          penalty: (r.balances.MAINTENANCE as any).penalty ?? 0,
        });
      }
      if (r.balances.TARGETED) {
        categories.push({
          title: "Целевой сбор",
          startBalance: (r.balances.TARGETED as any).startBalance ?? 0,
          accrued: r.balances.TARGETED.charged ?? 0,
          adjustments: (r.balances.TARGETED as any).adjustments ?? 0,
          paid: r.balances.TARGETED.paid ?? 0,
          penalty: (r.balances.TARGETED as any).penalty ?? 0,
        });
      }
      if (r.balances.CAPITAL_REPAIR) {
        categories.push({
          title: "Накопительные взносы на кап. ремонт",
          startBalance: (r.balances.CAPITAL_REPAIR as any).startBalance ?? 0,
          accrued: r.balances.CAPITAL_REPAIR.charged ?? 0,
          adjustments: (r.balances.CAPITAL_REPAIR as any).adjustments ?? 0,
          paid: r.balances.CAPITAL_REPAIR.paid ?? 0,
          penalty: (r.balances.CAPITAL_REPAIR as any).penalty ?? 0,
        });
      }
    }

    // Достаем ФИО из вариантов структуры от бэкенда
    const realOwnerName =
      (r as any).ownerName ||
      (r as any).ownerFullName ||
      (r as any).owner?.fullName ||
      (r as any).owner?.name ||
      (r as any).residentName ||
      "—";

    return {
      id: r.apartmentId,
      number: r.number,
      ownerName: realOwnerName,
      role: (r as any).role || "Собственник",
      categories,
    };
  });

  return (
    <>
      <PageHeader
        title="Финансы дома"
        subtitle={building.address}
        back={{ href: `/app/buildings/${buildingId}`, label: building.address }}
      />
      <PageBody wide>
        <section className="grid gap-6">
          {/* Сводные карточки (hero) */}
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
            <Card className="rounded-2xl border-none bg-primary text-primary-foreground shadow-sm">
              <CardContent className="pt-6">
                <p className="m-0 text-sm opacity-85">Поступило всего</p>
                <p className="m-0 mt-1 text-3xl font-extrabold tracking-tight lg:text-4xl">
                  {fmt(sum.paid)}
                </p>
                <p className="m-0 mt-1.5 text-[13px] opacity-85">
                  {sum.charged > 0
                    ? `${Math.round((sum.paid / sum.charged) * 100)}% от начисленного`
                    : "начислений пока нет"}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6">
                <p className="m-0 text-sm text-muted-foreground">Начислено</p>
                <p className="m-0 mt-1 text-2xl font-extrabold tracking-tight lg:text-3xl">
                  {fmt(sum.charged)}
                </p>
                <p className="m-0 mt-1.5 text-[13px] text-muted-foreground">{rows.length} квартир</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6">
                <p className="m-0 text-sm text-muted-foreground">Долг</p>
                <p
                  className={`m-0 mt-1 text-2xl font-extrabold tracking-tight lg:text-3xl ${
                    sum.debt > 0 ? "text-destructive" : "text-emerald-600"
                  }`}
                >
                  {fmt(sum.debt)}
                </p>
                <p className="m-0 mt-1.5 text-[13px] text-muted-foreground">
                  {debtors.length > 0 ? `${debtors.length} квартир с долгом` : "должников нет"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* График поступлений по месяцам */}
          {hasIncome && (
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6">
                <h2 className="m-0 mb-4 text-base font-bold">Поступления по месяцам</h2>
                <BarChart
                  bars={income.map((m) => ({
                    label: m.month.toLocaleDateString("ru-RU", { month: "short", timeZone: "UTC" }),
                    value: m.total,
                  }))}
                />
              </CardContent>
            </Card>
          )}

          {/* Формы управления: Тарифы, Начисления, Платёж */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="grid gap-3">
              <h2 className="m-0 text-base font-semibold">Тарифы</h2>
              {tariffs.filter((t) => !t.periodTo).length > 0 && (
                <ul className="m-0 grid list-none gap-1 p-0">
                  {tariffs
                    .filter((t) => !t.periodTo)
                    .map((t) => (
                      <li key={t.id} className="text-sm" data-testid="tariff-row">
                        {CAT[t.category]}: {String(t.rate)} {t.rateType === "PER_SQM" ? "₸/м²" : "₸ фикс."}
                      </li>
                    ))}
                </ul>
              )}
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="pt-6">
                  <TariffForm buildingId={buildingId} />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-3">
              <h2 className="m-0 text-base font-semibold">Начисления</h2>
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="pt-6">
                  <GenerateChargesForm buildingId={buildingId} />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-3">
              <h2 className="m-0 text-base font-semibold">Платёж</h2>
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="pt-6">
                  <PaymentForm accounts={accounts} />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Интерактивная ведомость задолженностей в стиле ЕОСИ */}
          <div className="grid gap-3">
            <h2 className="m-0 text-base font-semibold">Задолженность по квартирам</h2>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Квартир нет.</p>
            ) : (
              <ApartmentsDebtTable data={tableData} />
            )}
          </div>
        </section>
      </PageBody>
    </>
  );
}