import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { getBuilding } from "@/lib/onboarding/service";
import { getReport, type ReportData } from "@/lib/finance/report";
import { reportPeriodLabel } from "@/lib/finance/periodLabel";
import { ReportView } from "../../../../_components/ReportView";

export const dynamic = "force-dynamic";

// Внутренний просмотр отчёта (председатель — всё видно, включая ФИО контрагентов-физлиц).
export default async function ReportViewPage({
  params,
}: {
  params: Promise<{ buildingId: string; reportId: string }>;
}) {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");
  const osiId = activeChairmanOsi(auth);
  if (!osiId) redirect("/app");

  const { buildingId, reportId } = await params;
  const building = await getBuilding(osiId, buildingId);
  if (!building) notFound();
  const report = await getReport(osiId, reportId, false);
  if (!report?.data) notFound();

  const period = reportPeriodLabel(report.type, report.periodFrom);

  return (
    <main className="max-w-3xl px-5 pb-16 pt-6 lg:px-7">
      <Link
        href={`/app/buildings/${buildingId}/reports`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground no-underline print:hidden"
      >
        <ArrowLeft aria-hidden size={14} /> Отчёты
      </Link>
      <div className="mt-4">
        <ReportView data={report.data as ReportData} address={building.address} period={period} />
      </div>
    </main>
  );
}
