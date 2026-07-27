import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { parseIdentifier } from "@/lib/identifier";
import { verifyOtp } from "@/lib/auth/otp";
import { createSession, setSessionCookie, pickDefaultOsi, isMobileClient } from "@/lib/auth/session";
import { publicUser } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// identifier — телефон или email (REQ-005); legacy-поле phone принимается на время перехода.
// fullName — ТОЛЬКО из формы регистрации (onboarding-unified.md §0/REQ-146); экран «Вход» его
// не отправляет, обычный повторный вход имя не трогает (см. verifyOtp).
const Body = z.object({
  identifier: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  code: z.string().regex(/^\d{6}$/, "Код — 6 цифр"),
  fullName: z.string().trim().min(2, "Укажите ФИО").max(200).optional(),
});

// POST /api/auth/otp/verify — проверить код, создать сессию (REQ-001/005/007, ADR-0005).
// Первый успешный вход создаёт аккаунт без ролей (регистрация, auth-email.md §3).
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Errors.validation("Укажите телефон/email и 6-значный код");
  const raw = parsed.data.identifier ?? parsed.data.phone;
  if (!raw) return Errors.validation("Укажите телефон или email");

  const identifier = parseIdentifier(raw);
  if (!identifier) return Errors.validation("Некорректный телефон или email");

  const result = await verifyOtp(identifier, parsed.data.code, parsed.data.fullName);
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

  // Мобильный клиент (ADR-0012 §1, REQ-123): токен в теле ответа, без cookie.
  if (isMobileClient(req)) {
    return ok({
      user: publicUser(result.user),
      activeOsiId,
      token,
      expiresAt: expiresAt.toISOString(),
    });
  }
  await setSessionCookie(token, expiresAt);
  return ok({ user: publicUser(result.user), activeOsiId });
}
