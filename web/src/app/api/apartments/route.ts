import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { listApartments, createApartment, OnboardingError } from "@/lib/onboarding/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  buildingId: z.string().uuid(),
  number: z.string().min(1, "Укажите номер квартиры"),
  area: z.number().positive().optional(),
});

// GET /api/apartments?buildingId=… — квартиры дома (REQ-011).
export async function GET(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const buildingId = new URL(req.url).searchParams.get("buildingId");
  if (!buildingId) return Errors.validation("Укажите buildingId");

  return ok({ apartments: await listApartments(ctx.osiId, buildingId) });
}

// POST /api/apartments — добавить квартиру (REQ-011).
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  try {
    const apartment = await createApartment(ctx.osiId, parsed.data);
    return ok({ apartment }, { status: 201 });
  } catch (err) {
    if (err instanceof OnboardingError) return Errors.notFound("Дом");
    throw err;
  }
}
