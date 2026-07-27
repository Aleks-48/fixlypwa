import { z } from "zod";
import { ok, fail, Errors, clientIp } from "@/lib/http";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie, pickDefaultOsi, isMobileClient } from "@/lib/auth/session";
import { publicUser } from "@/lib/auth/guards";
import {
  isLoginBlocked,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/lib/auth/loginRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(1),
});

// POST /api/auth/login — вход председателя/суперадмина по email+паролю (ADR-0005).
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Errors.validation("Укажите email и пароль");

  const { email, password } = parsed.data;
  const ip = clientIp(req);

  // Перебор пароля: лимит неудачных попыток по ip+email (security-review 2026-07-02).
  if (isLoginBlocked(ip, email)) return Errors.rateLimited();

  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: true },
  });

  // Единый ответ при неверных данных, без утечки «есть ли такой email» (перечисление аккаунтов).
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    recordLoginFailure(ip, email);
    return fail("INVALID_CREDENTIALS", "Неверный email или пароль", 401);
  }

  recordLoginSuccess(ip, email);
  const activeOsiId = pickDefaultOsi(user.roles);
  const { token, expiresAt } = await createSession(user.id, activeOsiId);

  // Мобильный клиент (ADR-0012 §1, REQ-123): токен в теле ответа, без cookie — у Flutter
  // нет cookie jar. Веб — без изменений, cookie httpOnly как раньше.
  if (isMobileClient(req)) {
    return ok({ user: publicUser(user), activeOsiId, token, expiresAt: expiresAt.toISOString() });
  }
  await setSessionCookie(token, expiresAt);
  return ok({ user: publicUser(user), activeOsiId });
}
