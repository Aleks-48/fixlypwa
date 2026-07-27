import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { listBuildings, createBuilding } from "@/lib/onboarding/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  address: z.string().min(3, "Укажите адрес дома"),
  apartmentsCount: z.number().int().positive().optional(),
  builtYear: z.number().int().gte(1900).lte(2100).optional(),
});

// GET /api/buildings — дома активной ОСИ (REQ-010).
export async function GET() {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  return ok({ buildings: await listBuildings(ctx.osiId) });
}

// POST /api/buildings — добавить дом (REQ-010).
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  const building = await createBuilding(ctx.osiId, parsed.data);
  return ok({ building }, { status: 201 });
}
