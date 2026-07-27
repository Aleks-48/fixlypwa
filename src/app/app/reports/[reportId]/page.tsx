import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/residentPage";
import { forTenant } from "@/lib/db/tenant";
import { getReport, type ReportData } from "@/lib/finance/report";
import { reportPeriodLabel } from "@/lib/finance/periodLabel";
import { BackLink } from "../../_components/BackLink";
import { ReportView } from "../../_components/ReportView";

export const dynamic = "force-dynamic";

// Публичный просмотр отчёта жителем (REQ-043/051): только PUBLISHED, ПДн физлиц скрыты (§2а).
export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { osiId } = await requireMember();
  const { reportId } = await params;

  const report = await getReport(osiId, reportId, true);
  if (!report?.data) notFound();

  const building = await forTenant(osiId, (tx) =>
    tx.building.findUnique({ where: { id: report.buildingId }, select: { address: true } }),
  );
  const period = reportPeriodLabel(report.type, report.periodFrom);

  return (
    <main className="max-w-3xl px-5 pb-24 pt-6 lg:px-7 lg:pb-10">
      <BackLink href="/app/payments" label="Финансы" />
      <div className="mt-4">
        <ReportView data={report.data as ReportData} address={building?.address ?? ""} period={period} />
      </div>
    </main>
  );
}
