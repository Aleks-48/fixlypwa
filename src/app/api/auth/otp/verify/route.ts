import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { normalizeKzPhone } from "@/lib/phone";
import { verifyOtp } from "@/lib/auth/otp";
import { createSession, setSessionCookie, pickDefaultOsi } from "@/lib/auth/session";
import { publicUser } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  phone: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, "Код — 6 цифр"),
});

// POST /api/auth/otp/verify — проверить код, создать сессию жителя (REQ-001, ADR-0005).
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Errors.validation("Укажите телефон и 6-значный код");

  const phone = normalizeKzPhone(parsed.data.phone);
  if (!phone) return Errors.validation("Некорректный номер телефона");

  const result = await verifyOtp(phone, parsed.data.code);
  if (!result.ok) {
    // Не различаем «неверный код» и «истёк» слишком детально, но подскажем повтор.
    const message =
      result.reason === "too_many_attempts"
        ? "Слишком много попыток. Запросите новый код."
        : result.reason === "expired"
          ? "Код истёк. Запросите новый."
          : "Неверный код.";
    return Errors.validation(message);
  }

  const activeOsiId = pickDefaultOsi(result.user.roles);
  const { token, expiresAt } = await createSession(result.user.id, activeOsiId);
  await setSessionCookie(token, expiresAt);

  return ok({ user: publicUser(result.user), activeOsiId });
}
