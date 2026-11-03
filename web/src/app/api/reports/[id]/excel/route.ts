import { activeChairmanOsi } from "@/lib/auth/guards";
import { getCurrentAuth } from "@/lib/auth/session";
import { generateReportExcel } from "@/lib/finance/excelExport";
import { getReport,type ReportData } from "@/lib/finance/report";
import { Errors } from "@/lib/http";
import { getBuilding } from "@/lib/onboarding/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/reports/[id]/excel — скачивание отчёта в формате .xlsx
// Только Председатель (activeChairmanOsi). Данные — полный снимок без скрытия ПДн.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const osiId = activeChairmanOsi(auth);
  if (!osiId) return Errors.forbidden();

  const { id: reportId } = await params;

  const report = await getReport(osiId, reportId, false /* publicView = false */);
  if (!report?.data) return Errors.notFound();

  // Получаем адрес дома для заголовка файла
  const building = await getBuilding(osiId, report.buildingId).catch(() => null);

  try {
    const buffer = await generateReportExcel(
      report.data as ReportData,
      building?.address ?? "Дом",
      report.type,
      report.periodFrom,
    );

    // Безопасное имя файла: «отчет_2025-06.xlsx»
    const dateStr = report.periodFrom.toISOString().slice(0, 7);
    const filename = `отчет_${dateStr}.xlsx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[reports/excel] generation error:", err);
    return new Response(JSON.stringify({ error: "Ошибка генерации Excel" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
