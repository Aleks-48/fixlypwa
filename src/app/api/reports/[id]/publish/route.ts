import { ok, Errors } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { publishReport } from "@/lib/finance/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/reports/[id]/publish — публикация жителям (REQ-043).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  const { id } = await params;
  const rep = await publishReport(ctx.osiId, id);
  if (!rep) return Errors.notFound("Отчёт");
  return ok({ report: { id: rep.id, status: rep.status } });
}
