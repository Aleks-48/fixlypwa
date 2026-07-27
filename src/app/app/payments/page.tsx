import Link from "next/link";
import { Check, FileText } from "lucide-react";
import { requireMember } from "@/lib/auth/residentPage";
import { getOccupantBuilding } from "@/lib/comms/service";
import { listPublishedReports } from "@/lib/finance/report";
import { reportPeriodLabel } from "@/lib/finance/periodLabel";
import {
  listResidentCharges,
  listResidentPayments,
  residentBalances,
} from "@/lib/finance/service";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PayOnlineButton } from "../_components/PayOnlineButton";
import { PageBody, PageHeader } from "../_components/PageHeader";

export const dynamic = "force-dynamic";

const CAT: Record<string, string> = {
  MAINTENANCE: "Содержание дома",
  TARGETED: "Целевой взнос",
  CAPITAL_REPAIR: "Капремонт",
};

const fmt = (n: number) => `₸ ${n.toLocaleString("ru-RU")}`;

// «Финансы» жителя (ui-redesign.md §3, заметки п.6/7): вкладки Платежи | Отчёты.
// Платежи: долг по бакетам, начисления, история (реальные данные Фазы 2); онлайн-оплата —
// заглушка (§4). Отчёты: опубликованные отчёты дома (ПДн физлиц скрыты — REQ-043).
export default async function ResidentPaymentsPage() {
  const { auth, osiId } = await requireMember();
  const occ = await getOccupantBuilding(osiId, auth.user.id);
  const [balances, charges, payments, reports] = await Promise.all([
    residentBalances(osiId, auth.user.id),
    listResidentCharges(osiId, auth.user.id),
    listResidentPayments(osiId, auth.user.id),
    occ?.apartment
      ? listPublishedReports(osiId, occ.apartment.buildingId)
      : Promise.resolve([]),
  ]);

  const totalDebt = balances
    ? balances.MAINTENANCE.debt + balances.TARGETED.debt + balances.CAPITAL_REPAIR.debt
    : 0;

  // Начисления последнего периода — разбивка как в макете «Начисления за месяц».
  const lastPeriod = charges[0]?.period ?? null;
  const lastCharges = lastPeriod
    ? charges.filter((c) => c.period.getTime() === lastPeriod.getTime())
    : [];
  const periodLabel = lastPeriod
    ? lastPeriod.toLocaleDateString("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" })
    : null;

  return (
    <>
      <PageHeader title="Финансы" subtitle="Платежи и отчёты по вашему дому" />
      <PageBody>
        <Tabs defaultValue="payments">
          <TabsList className="mb-4">
            <TabsTrigger value="payments" data-testid="fin-tab-payments">
              Платежи
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="fin-tab-reports">
              Отчёты · {reports.length}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
        {!balances ? (
          <p className="text-sm text-muted-foreground">
            По вашей квартире пока нет лицевого счёта — начисления появятся после их формирования
            председателем.
          </p>
        ) : (
          <div className="grid gap-5">
            <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
              <Card className="rounded-2xl border-none bg-primary text-primary-foreground shadow-sm">
                <CardContent className="pt-6">
                  <p className="m-0 text-sm opacity-85">К оплате</p>
                  <p className="m-0 mt-1 text-4xl font-extrabold tracking-tight" data-testid="payments-total">
                    {fmt(totalDebt)}
                  </p>
                  <p className="m-0 mb-4 mt-1 text-[13px] opacity-85">
                    {totalDebt > 0 ? "Текущая задолженность по квартире" : "Задолженности нет"}
                  </p>
                  {totalDebt > 0 && <PayOnlineButton amount={totalDebt} hero />}
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm">
                <CardContent className="pt-6">
                  <h2 className="m-0 mb-3 text-[15px] font-bold">
                    {periodLabel ? `Начисления · ${periodLabel}` : "Начисления"}
                  </h2>
                  {lastCharges.length === 0 ? (
                    <p className="m-0 text-sm text-muted-foreground">Начислений пока нет.</p>
                  ) : (
                    <>
                      {lastCharges.map((c) => (
                        <div
                          key={c.id}
                          className="flex justify-between border-b border-border py-2 text-sm last:border-b-0"
                        >
                          <span className="text-muted-foreground">
                            {CAT[c.tariff.category] ?? c.tariff.category}
                          </span>
                          <span className="font-semibold">{fmt(Number(c.amount))}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-3 text-[15px]">
                        <span className="font-bold">Итого</span>
                        <span className="font-extrabold">
                          {fmt(lastCharges.reduce((s, c) => s + Number(c.amount), 0))}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6">
                <h2 className="m-0 mb-2 text-base font-bold">История платежей</h2>
                {payments.length === 0 ? (
                  <p className="m-0 text-sm text-muted-foreground">Платежей пока нет.</p>
                ) : (
                  <ul className="m-0 grid list-none p-0">
                    {payments.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between border-b border-border py-3 last:border-b-0"
                        data-testid="payment-history-row"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-xl bg-success-soft text-success">
                            <Check aria-hidden size={16} />
                          </span>
                          <span>
                            <span className="block text-sm font-semibold">
                              {p.paidAt.toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {p.method ?? "оплата"}
                            </span>
                          </span>
                        </span>
                        <span className="text-[15px] font-bold">{fmt(Number(p.amount))}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}
          </TabsContent>

          <TabsContent value="reports">
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Опубликованных отчётов пока нет — они появятся после публикации председателем.
              </p>
            ) : (
              <ul className="m-0 grid list-none gap-2 p-0">
                {reports.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/app/reports/${r.id}`}
                      data-testid="resident-report-link"
                      className="no-underline"
                    >
                      <Card className="rounded-2xl shadow-sm transition-colors hover:bg-muted/40">
                        <CardContent className="flex items-center gap-2.5 px-4 py-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                            <FileText aria-hidden size={15} />
                          </span>
                          <span className="text-sm font-medium text-primary">
                            Отчёт за {reportPeriodLabel(r.type, r.periodFrom)}
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}
