import { z } from "zod";
import { env } from "@/lib/env";
import { ok, fail, Errors, clientIp } from "@/lib/http";
import { parseIdentifier } from "@/lib/identifier";
import { checkOtpRequestAllowed } from "@/lib/auth/rateLimit";
import { requestOtp } from "@/lib/auth/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// identifier — телефон или email (REQ-005); legacy-поле phone принимается на время перехода.
const Body = z.object({
  identifier: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
});

// POST /api/auth/otp/request — отправить одноразовый код на телефон или email
// (REQ-005/006/091, NFR-054, auth-email.md). Ответ не раскрывает существование аккаунта (REQ-008).
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  const raw = parsed.success ? (parsed.data.identifier ?? parsed.data.phone) : undefined;
  if (!raw) return Errors.validation("Укажите телефон или email");

  const identifier = parseIdentifier(raw);
  if (!identifier) return Errors.validation("Некорректный телефон или email");

  // Прод без SMS-шлюза (auth-email.md §6): телефонный код уйдёт «в лог», не в SMS — пользователь
  // будет ждать сообщение, которое не придёт. Отказываем явно с подсказкой, пока Q-030 не закрыт.
  // Гард скоуплен на PHONE_OTP_CHANNEL!=telegram (REQ-009) — в telegram-режиме SMS не участвует
  // вовсе, эта проблема не про него. OTP_DEV_ECHO=1 — признак dev/e2e-окружения.
  if (
    identifier.kind === "phone" &&
    env.PHONE_OTP_CHANNEL !== "telegram" &&
    env.SMS_PROVIDER === "console" &&
    env.NODE_ENV === "production" &&
    env.OTP_DEV_ECHO !== "1"
  ) {
    return fail(
      "SMS_UNAVAILABLE",
      "Вход по SMS временно недоступен — используйте email",
      503,
    );
  }

  const ip = clientIp(req);
  const rate = await checkOtpRequestAllowed(identifier.value, ip);
  if (!rate.allowed) {
    return fail(
      "RATE_LIMITED",
      `Слишком много запросов. Повторите через ${rate.retryAfterSec} с.`,
      429,
    );
  }

  let result;
  try {
    result = await requestOtp(identifier, ip);
  } catch (err) {
    // Транспорт (SMTP/SMS/Telegram) упал на стороне провайдера (напр. Resend в sandbox-режиме
    // без домена отклоняет письма на чужие адреса) — не даём голому 500 дойти до клиента,
    // иначе UI показывает бесполезное «Что-то пошло не так» (postJson в LoginForm.tsx).
    console.error("[otp/request] отправка кода упала:", err);
    return fail(
      "OTP_SEND_FAILED",
      "Не удалось отправить код. Попробуйте другой способ входа (телефон/email).",
      502,
    );
  }
  // REQ-009: телефон без привязки к Telegram-боту — нечего слать, UI должен показать
  // deep-link на бота вместо экрана ввода кода.
  if (result.status === "needs_telegram_link") {
    return ok({ needsTelegramLink: true, telegramBotUsername: result.botUsername });
  }
  // devCode присутствует только при console-провайдере канала + OTP_DEV_ECHO=1 (dev/test).
  return ok({
    sent: true,
    channel: identifier.kind,
    ...(result.devCode ? { devCode: result.devCode } : {}),
  });
}
