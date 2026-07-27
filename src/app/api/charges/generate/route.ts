import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { generateCharges } from "@/lib/finance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  buildingId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Период — ГГГГ-ММ"),
});

// POST /api/charges/generate — массовая генерация начислений за месяц (REQ-021, идемпотентно).
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректно");

  const [y, m] = parsed.data.period.split("-").map(Number);
  const period = new Date(Date.UTC(y!, m! - 1, 1));
  const result = await generateCharges(ctx.osiId, ctx.auth.user.id, parsed.data.buildingId, period);
  return ok(result, { status: 201 });
}
