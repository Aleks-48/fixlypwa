import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { normalizeKzPhone } from "@/lib/phone";
import { chairmanContext } from "@/lib/auth/context";
import { addResident, OnboardingError } from "@/lib/onboarding/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Телефон И/ИЛИ email — минимум один (ревизия REQ-013, auth-email.md §4).
const Body = z.object({
  apartmentId: z.string().uuid(),
  fullName: z.string().min(2, "Укажите ФИО"),
  phone: z.string().optional(),
  email: z.string().optional(),
});

// POST /api/residents — привязать жителя к квартире (REQ-013). Создаёт пользователя (по
// телефону и/или email), роль RESIDENT и Occupant. Житель затем входит по коду и видит квартиру.
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  const rawPhone = parsed.data.phone?.trim();
  const rawEmail = parsed.data.email?.trim().toLowerCase();
  if (!rawPhone && !rawEmail) return Errors.validation("Укажите телефон или email");

  let phone: string | null = null;
  if (rawPhone) {
    phone = normalizeKzPhone(rawPhone);
    if (!phone) return Errors.validation("Некорректный номер телефона");
  }
  let email: string | null = null;
  if (rawEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rawEmail)) {
      return Errors.validation("Некорректный email");
    }
    email = rawEmail;
  }

  try {
    const result = await addResident(ctx.osiId, {
      apartmentId: parsed.data.apartmentId,
      fullName: parsed.data.fullName,
      phone,
      email,
    });
    return ok({ resident: result.occupant }, { status: 201 });
  } catch (err) {
    if (err instanceof OnboardingError) {
      return err.code === "IDENTIFIER_REQUIRED"
        ? Errors.validation(err.message)
        : Errors.notFound("Квартира");
    }
    throw err;
  }
}
