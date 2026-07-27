import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { listTariffs, createTariff } from "@/lib/finance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  buildingId: z.string().uuid(),
  category: z.enum(["MAINTENANCE", "TARGETED", "CAPITAL_REPAIR"]),
  rateType: z.enum(["PER_SQM", "FIXED"]),
  rate: z.number().positive(),
  periodFrom: z.coerce.date(),
});

// GET /api/tariffs?buildingId — тарифы дома (REQ-020).
export async function GET(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  const buildingId = new URL(req.url).searchParams.get("buildingId");
  if (!buildingId) return Errors.validation("Укажите buildingId");
  return ok({ tariffs: await listTariffs(ctx.osiId, buildingId) });
}

// POST /api/tariffs — новый тариф статьи (закрывает предыдущий открытый).
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректно");
  const tariff = await createTariff(ctx.osiId, ctx.auth.user.id, parsed.data);
  return ok({ tariff }, { status: 201 });
}
