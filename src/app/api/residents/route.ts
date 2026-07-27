import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { normalizeKzPhone } from "@/lib/phone";
import { chairmanContext } from "@/lib/auth/context";
import { addResident, OnboardingError } from "@/lib/onboarding/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  apartmentId: z.string().uuid(),
  fullName: z.string().min(2, "Укажите ФИО"),
  phone: z.string().min(1, "Укажите телефон"),
});

// POST /api/residents — привязать жителя к квартире (REQ-013). Создаёт пользователя (по телефону),
// роль RESIDENT и Occupant. Житель затем входит по телефону+OTP и видит свою квартиру.
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  const phone = normalizeKzPhone(parsed.data.phone);
  if (!phone) return Errors.validation("Некорректный номер телефона");

  try {
    const result = await addResident(ctx.osiId, { ...parsed.data, phone });
    return ok({ resident: result.occupant }, { status: 201 });
  } catch (err) {
    if (err instanceof OnboardingError) return Errors.notFound("Квартира");
    throw err;
  }
}
