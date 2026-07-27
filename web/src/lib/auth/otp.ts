import type { OtpChannel, User, UserOsiRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { sendSms } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { sendTelegramMessage } from "@/lib/telegram";
import type { Identifier } from "@/lib/identifier";
import { generateOtpCode, hashOtp, safeEqualHex } from "./crypto";

// OTP-флоу входа (ADR-0005 + ревизия 2026-07-15, REQ-001/005/006/091). Идентификатор —
// телефон ИЛИ email (auth-email.md); канал доставки следует из типа. Rate-limit проверяется
// в route handler ДО вызова requestOtp (см. rateLimit.ts) — здесь только генерация/сверка.

export type UserWithContext = User & {
  roles: UserOsiRole[];
};

export type RequestOtpResult =
  | { status: "sent"; devCode?: string }
  | { status: "needs_telegram_link"; botUsername: string | null };

export async function requestOtp(
  identifier: Identifier,
  ip: string | null,
): Promise<RequestOtpResult> {
  let channel: OtpChannel = identifier.kind === "email" ? "EMAIL" : "SMS";
  let telegramChatId: string | null = null;

  // REQ-009 (telegram-otp.md): пока PHONE_OTP_CHANNEL=sms (дефолт), поведение телефона не
  // меняется вовсе. При telegram — привязанный номер получает код по-настоящему в Telegram.
  if (identifier.kind === "phone" && env.PHONE_OTP_CHANNEL === "telegram") {
    const link = await prisma.telegramLink.findUnique({ where: { phone: identifier.value } });
    if (link) {
      channel = "TELEGRAM";
      telegramChatId = link.chatId;
    } else if (env.OTP_DEV_ECHO !== "1") {
      // Прод/без dev-эха: непривязанному номеру нечего слать (Telegram не позволяет написать в
      // несуществующий чат) — просим сначала привязать бота.
      return { status: "needs_telegram_link", botUsername: env.TELEGRAM_BOT_USERNAME ?? null };
    }
    // OTP_DEV_ECHO=1 и привязки нет: НЕ блокируем — channel остаётся SMS (дефолт выше), sendSms()
    // при SMS_PROVIDER=console просто логирует (см. sms.ts), код сгенерируется и уйдёт devCode'ом
    // ниже. Тестовые/придуманные номера работают без похода в бота; уже привязанные номера
    // (ветка выше) всё равно получают код по-настоящему в Telegram — единый режим для обоих
    // случаев, не нужно вручную переключать PHONE_OTP_CHANNEL между sms/telegram.
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);

  const challenge = await prisma.otpChallenge.create({
    data: {
      identifier: identifier.value,
      channel,
      codeHash: hashOtp(identifier.value, code),
      requestIp: ip,
      expiresAt,
    },
  });

  const message = `Код для входа в ОСИ: ${code}. Действует ${Math.round(env.OTP_TTL_SECONDS / 60)} мин.`;
  try {
    if (channel === "EMAIL") {
      await sendEmail(identifier.value, "Код для входа", message);
    } else if (channel === "TELEGRAM") {
      await sendTelegramMessage(telegramChatId!, message);
    } else {
      await sendSms(identifier.value, message);
    }
  } catch (err) {
    // Провал доставки не должен считаться попыткой для rate-limit (review 2026-07-22) — иначе
    // несколько подряд сбоев транспорта (например, Resend отклонил чужой адрес в sandbox-режиме)
    // блокируют идентификатор на час, хотя пользователь ни разу не получил код. Ошибку пробрасываем
    // дальше — route handler уже ловит её и отвечает OTP_SEND_FAILED.
    await prisma.otpChallenge.delete({ where: { id: challenge.id } });
    throw err;
  }

  // devCode отдаётся при явном OTP_DEV_ECHO=1 — НЕЗАВИСИМО от провайдера (ревизия 2026-07-21,
  // запрос демо-прогона: код нужен сразу в UI И реальная доставка в Telegram/email/SMS
  // одновременно, чтобы не сверяться с чужим устройством на каждый тестовый вход).
  // ⚠️ СЕКЬЮРИТИ (сохраняется даже при реальных провайдерах): пока OTP_DEV_ECHO=1, ЛЮБОЙ,
  // кто знает чужой телефон/email, получает его код входа прямо в ответе API — рабочий вектор
  // захвата аккаунта. Это ДОПУСТИМО только на этом локальном/демо-инстансе за ngrok, который
  // никто кроме вас сегодня не найдёт; ПЕРЕД реальным продом/публичным доступом OTP_DEV_ECHO
  // обязателен = 0 (или не задан вовсе) — раньше это подстраховывал провайдер=console, теперь
  // единственная защита — сам флаг.
  return env.OTP_DEV_ECHO === "1" ? { status: "sent", devCode: code } : { status: "sent" };
}

export type VerifyResult =
  | { ok: true; user: UserWithContext }
  | { ok: false; reason: "expired" | "invalid" | "too_many_attempts" };

export async function verifyOtp(
  identifier: Identifier,
  code: string,
  fullName?: string,
): Promise<VerifyResult> {
  const challenge = await prisma.otpChallenge.findFirst({
    where: { identifier: identifier.value, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return { ok: false, reason: "expired" };

  // Атомарно занимаем попытку: инкремент проходит только если лимит ещё не исчерпан
  // (условие в WHERE) — иначе параллельные запросы могли бы превысить OTP_MAX_ATTEMPTS (гонка).
  const claimed = await prisma.otpChallenge.updateMany({
    where: {
      id: challenge.id,
      consumedAt: null,
      attempts: { lt: env.OTP_MAX_ATTEMPTS },
    },
    data: { attempts: { increment: 1 } },
  });
  if (claimed.count === 0) {
    // Лимит попыток исчерпан — гасим челлендж, нужен новый код.
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    return { ok: false, reason: "too_many_attempts" };
  }

  if (!safeEqualHex(challenge.codeHash, hashOtp(identifier.value, code))) {
    return { ok: false, reason: "invalid" };
  }

  // Успех: гасим челлендж (одноразовость) и разрешаем пользователя.
  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  // Первый вход создаёт пользователя (REQ-007) — по email или телефону. Доступа к данным это
  // не даёт: без Occupant/роли RLS ничего не покажет — привязку делает председатель (REQ-013).
  // fullName — из формы регистрации (onboarding-unified.md §0, REQ-146); обычный вход её не
  // передаёт, поэтому существующее имя не затирается пустым update при повторном логине.
  const where =
    identifier.kind === "email" ? { email: identifier.value } : { phone: identifier.value };
  await prisma.user.upsert({
    where,
    update: fullName ? { fullName } : {},
    create: { ...where, ...(fullName ? { fullName } : {}) },
  });
  const user = await prisma.user.findUniqueOrThrow({
    where,
    include: { roles: true },
  });

  return { ok: true, user };
}
