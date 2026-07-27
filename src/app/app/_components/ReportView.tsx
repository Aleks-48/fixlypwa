import type { ReportData } from "@/lib/finance/report";
import { Card, CardContent } from "@/components/ui/card";

// Рендер 4 блоков формы отчёта (приказ №163, Прил.3). Официальный документ — сдержанная
// табличная вёрстка (не «весёлая»), print-friendly (Q-013: печать из браузера).
const INCOME_LABELS: [string, string][] = [
  ["RESIDENT_DUES", "6.1 Взносы на управление и содержание"],
  ["PARKING_STORAGE_DUES", "6.2 Взносы за парковки/кладовки"],
  ["CAPITAL_REPAIR_CONTRIBUTION", "6.3 Накопления на кап. ремонт"],
  ["RENTAL_INCOME", "6.4 Аренда общего имущества"],
  ["TARGETED_RESIDENT", "6.5 Целевые взносы (квартиры)"],
  ["TARGETED_PARKING", "6.6 Целевые взносы (парковки)"],
  ["OTHER_INCOME", "6.7 Иные поступления"],
];

const EXPENSE_LABELS: Record<string, string> = {
  LABOR_ACCOUNTING: "7.1.1 Оплата труда: бухучёт",
  LABOR_MANAGEMENT: "7.1.2 Оплата труда: управление",
  BUDGET_PAYMENTS: "7.1.3 Платежи в бюджет",
  BANK_SERVICES: "7.1.4 Банковские услуги",
  CASH_SERVICE: "7.1.5 РКО",
  OFFICE: "7.1.6 Содержание офиса",
  SERVICE_CONTRACT: "7.2.1 Услуги сервисных субъектов",
  CURRENT_REPAIR: "7.3 Текущий ремонт",
  UTILITIES: "7.4 Коммунальные на общее имущество",
  HOUSEHOLD: "7.5 Хозяйственные расходы",
  CAPITAL_REPAIR: "7.6 Капитальный ремонт",
};

const kzt = (n: number) => `${n.toLocaleString("ru-RU")} ₸`;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl shadow-sm print:border-none print:shadow-none">
      <CardContent className="pt-6">
        <h3 className="m-0 mb-2.5 text-sm font-semibold">{title}</h3>
        {children}
      </CardContent>
    </Card>
  );
}

export function ReportView({
  data,
  address,
  period,
}: {
  data: ReportData;
  address: string;
  period: string;
}) {
  return (
    <article className="grid gap-4" data-testid="report-view">
      <header>
        <h2 className="m-0 text-lg font-bold">
          Ежемесячный отчёт по управлению объектом кондоминиума
        </h2>
        <p className="m-0 mt-1 text-sm text-muted-foreground">
          {address} · период: {period}
        </p>
      </header>

      <Block title="1–2. Остатки на счетах">
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b border-border/60 last:border-none">
              <td className="py-1.5">1. Текущий счёт</td>
              <td className="py-1.5 text-right font-medium" data-testid="rep-current">
                {kzt(data.balances.current)}
              </td>
            </tr>
            <tr>
              <td className="py-1.5">2. Сберегательный счёт (кап. ремонт)</td>
              <td className="py-1.5 text-right font-medium">{kzt(data.balances.savings)}</td>
            </tr>
          </tbody>
        </table>
      </Block>

      <Block title="3–5. Задолженность">
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b border-border/60">
              <td className="py-1.5">3. По взносам на управление и содержание</td>
              <td className="py-1.5 text-right font-medium" data-testid="rep-debt-maint">
                {kzt(data.debt.maintenance)}
              </td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-1.5">4. По взносам за парковки/кладовки</td>
              <td className="py-1.5 text-right font-medium">{kzt(data.debt.parking)}</td>
            </tr>
            <tr>
              <td className="py-1.5">5. По накоплениям на кап. ремонт</td>
              <td className="py-1.5 text-right font-medium">{kzt(data.debt.capitalRepair)}</td>
            </tr>
          </tbody>
        </table>
      </Block>

      <Block title={`6. Поступления — всего ${kzt(data.income.total)}`}>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {INCOME_LABELS.map(([key, label]) => (
              <tr key={key} className="border-b border-border/60 last:border-none">
                <td className="py-1.5">{label}</td>
                <td className="py-1.5 text-right">
                  {kzt((data.income as Record<string, number>)[key] ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Block>

      <Block title={`7. Расходы — всего ${kzt(data.expenses.total)}`}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-1.5 font-normal">Дата</th>
              <th className="pb-1.5 font-normal">Статья</th>
              <th className="pb-1.5 font-normal">Контрагент</th>
              <th className="pb-1.5 text-right font-normal">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {data.expenses.rows.map((r, i) => (
              <tr key={i} className="border-b border-border/60 last:border-none" data-testid="rep-expense-row">
                <td className="py-1.5">{r.date}</td>
                <td className="py-1.5">{EXPENSE_LABELS[r.category] ?? r.category}</td>
                <td className="py-1.5">
                  {r.counterparty ? r.counterparty.name : "—"}
                  {r.counterparty?.bin && (
                    <span className="text-muted-foreground"> · БИН {r.counterparty.bin}</span>
                  )}
                </td>
                <td className="py-1.5 text-right">{kzt(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Block>
    </article>
  );
}
