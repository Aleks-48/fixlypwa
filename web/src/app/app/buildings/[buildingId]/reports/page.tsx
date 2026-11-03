import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { getBuilding } from "@/lib/onboarding/service";
import { listReports } from "@/lib/finance/report";
import { reportPeriodLabel } from "@/lib/finance/periodLabel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GenerateReportForm, PublishButton } from "../../../_components/ReportControls";
import { PageBody, PageHeader } from "../../../_components/PageHeader";
import { getTranslation } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// «Отчёты» дома (председатель): генерация одним действием за месяц/квартал/год
// (REQ-040/045) + публикация (REQ-043).
export default async function ReportsPage({ params }: { params: Promise<{ buildingId: string }> }) {
  const { t } = await getTranslation();
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");
  const osiId = activeChairmanOsi(auth);
  if (!osiId) redirect("/app");

  const { buildingId } = await params;
  const building = await getBuilding(osiId, buildingId);
  if (!building) notFound();

  const reports = await listReports(osiId, buildingId);

  return (
    <>
      <PageHeader
        title={t("title_chairman_reports")}
        subtitle={t("subtitle_reports")}
        back={{ href: `/app/buildings/${buildingId}`, label: building.address }}
      />
      <PageBody>
      <section className="grid gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="pt-6">
            <GenerateReportForm buildingId={buildingId} />
          </CardContent>
        </Card>

        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("label_no_reports")}</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {reports.map((r) => (
              <li key={r.id} data-testid="report-row">
                <Card className="rounded-2xl shadow-sm">
                  <CardContent className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <Link
                      href={`/app/buildings/${buildingId}/reports/${r.id}`}
                      className="font-semibold text-primary no-underline"
                    >
                      {reportPeriodLabel(r.type, r.periodFrom)}
                    </Link>
                    {r.status === "PUBLISHED" ? (
                      <Badge variant="secondary" className="rounded-full" data-testid="report-published">
                        {t("label_report_published")}
                      </Badge>
                    ) : (
                      <PublishButton reportId={r.id} />
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
      </PageBody>
    </>
  );
}
