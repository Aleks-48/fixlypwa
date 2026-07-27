import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { generateReport, listReports } from "@/lib/finance/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// REQ-045: период — месяц «ГГГГ-ММ», квартал «ГГГГ-Q1..Q4» или год «ГГГГ».
const Body = z.object({
  buildingId: z.string().uuid(),
  period: z
    .string()
    .regex(/^\d{4}(-(0[1-9]|1[0-2])|-Q[1-4])?$/, "Период — ГГГГ-ММ, ГГГГ-Q1..Q4 или ГГГГ"),
});

function parsePeriod(period: string): {
  from: Date;
  to: Date;
  type: "MONTHLY" | "QUARTERLY" | "ANNUAL";
} {
  const year = Number(period.slice(0, 4));
  const q = period.match(/-Q([1-4])$/);
  if (q) {
    const startMonth = (Number(q[1]) - 1) * 3;
    return {
      from: new Date(Date.UTC(year, startMonth, 1)),
      to: new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59)),
      type: "QUARTERLY",
    };
  }
  if (period.length === 4) {
    return {
      from: new Date(Date.UTC(year, 0, 1)),
      to: new Date(Date.UTC(year, 12, 0, 23, 59, 59)),
      type: "ANNUAL",
    };
  }
  const m = Number(period.slice(5, 7));
  return {
    from: new Date(Date.UTC(year, m - 1, 1)),
    to: new Date(Date.UTC(year, m, 0, 23, 59, 59)), // последний день месяца
    type: "MONTHLY",
  };
}

// GET /api/reports?buildingId — список отчётов дома (председатель).
export async function GET(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  const buildingId = new URL(req.url).searchParams.get("buildingId");
  if (!buildingId) return Errors.validation("Укажите buildingId");
  return ok({ reports: await listReports(ctx.osiId, buildingId) });
}

// POST /api/reports — сгенерировать отчёт одним действием (REQ-040) за месяц/квартал/год (REQ-045).
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректно");

  const { from, to, type } = parsePeriod(parsed.data.period);
  const report = await generateReport(ctx.osiId, parsed.data.buildingId, from, to, type);
  return ok({ report: { id: report.id } }, { status: 201 });
}
