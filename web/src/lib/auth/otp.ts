import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import type { Identifier } from "@/lib/identifier";
import { sendSms } from "@/lib/sms";
import { sendTelegramMessage } from "@/lib/telegram";
import { isTestOtpPhone } from "./devOtp";
import type { OtpChannel,User,UserOsiRole } from "@prisma/client";
import { generateOtpCode,hashOtp,safeEqualHex,generateSessionToken,hashToken } from "./crypto";

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
  devEcho = env.OTP_DEV_ECHO === "1" && env.NODE_ENV !== "production",
  displayOnly = false,
): Promise<RequestOtpResult> {
  devEcho = devEcho && env.NODE_ENV !== "production";
  displayOnly = displayOnly && devEcho && isTestOtpPhone(identifier);
  let channel: OtpChannel = identifier.kind === "email" ? "EMAIL" : "SMS";
  let telegramChatId: string | null = null;

  // REQ-009 (telegram-otp.md): пока PHONE_OTP_CHANNEL=sms (дефолт), поведение телефона не
  // меняется вовсе. При telegram — привязанный номер получает код по-настоящему в Telegram.
  if (!displayOnly && identifier.kind === "phone" && env.PHONE_OTP_CHANNEL === "telegram") {
    const link = await prisma.telegramLink.findUnique({ where: { phone: identifier.value } });
    if (link) {
      channel = "TELEGRAM";
      telegramChatId = link.chatId;
    } else if (!devEcho) {
      // Прод/без dev-эха: непривязанному номеру нечего слать (Telegram не позволяет написать в
      // несуществующий чат) — просим сначала привязать бота.
      return { status: "needs_telegram_link", botUsername: env.TELEGRAM_BOT_USERNAME ?? null };
    }
    // Разрешено локальное dev-эхо и привязки нет: channel остаётся SMS, sendSms()
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
    if (displayOnly) {
      // TEST-OTP-003: fake numbers never require or trigger an external message.
    } else if (channel === "EMAIL") {
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

  // HTTP caller passes TECH-015's loopback-only decision; production always disables echo.
  return devEcho ? { status: "sent", devCode: code } : { status: "sent" };
}

export type VerifyResult =
  | { ok: true; user: UserWithContext; session?: { token: string; expiresAt: Date } }
  | { ok: false; reason: "expired" | "invalid" | "too_many_attempts" };

export async function verifyOtp(
  identifier: Identifier,
  code: string,
  fullName?: string,
  withSession = false,
): Promise<VerifyResult> {
  return prisma.$transaction(async (tx): Promise<VerifyResult> => {
  // ACCEPT-001: serialize verification for this identifier before reading the challenge.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${identifier.value}, 0))::text`;
  const challenge = await tx.otpChallenge.findFirst({
    where: { identifier: identifier.value, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return { ok: false, reason: "expired" };

  // Атомарно занимаем попытку: инкремент проходит только если лимит ещё не исчерпан
  const claimed = await tx.otpChallenge.updateMany({
    where: {
      id: challenge.id,
      consumedAt: null,
      attempts: { lt: env.OTP_MAX_ATTEMPTS },
    },
    data: { attempts: { increment: 1 } },
  });
  if (claimed.count === 0) {
    // Лимит попыток исчерпан — гасим челлендж, нужен новый код.
    await tx.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    return { ok: false, reason: "too_many_attempts" };
  }

  if (!safeEqualHex(challenge.codeHash, hashOtp(identifier.value, code))) {
    return { ok: false, reason: "invalid" };
  }

  // Успех: гасим челлендж (одноразовость) и разрешаем пользователя.
  await tx.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  // Явное разделение ветвления создаёт или получает пользователя без конфликтов типов TypeScript
  if (identifier.kind === "email") {
    await tx.user.upsert({
      where: { email: identifier.value },
      update: fullName ? { fullName } : {},
      create: { email: identifier.value, fullName },
    });
  } else {
    await tx.user.upsert({
      where: { phone: identifier.value },
      update: fullName ? { fullName } : {},
      create: { phone: identifier.value, fullName },
    });
  }

  const where =
    identifier.kind === "email" ? { email: identifier.value } : { phone: identifier.value };

  const user = await tx.user.findUniqueOrThrow({
    where,
    include: { roles: true },
  });

  if (!withSession) return { ok: true, user };
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 86400000);
  await tx.session.create({ data: {
    id: hashToken(token), userId: user.id, activeOsiId: user.roles[0]?.osiId ?? null, expiresAt,
  } });
  return { ok: true, user, session: { token, expiresAt } };
  }, { maxWait: 10000, timeout: 15000 });
}
