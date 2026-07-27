import type { User, UserOsiRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { sendSms } from "@/lib/sms";
import { generateOtpCode, hashOtp, safeEqualHex } from "./crypto";

// OTP-флоу входа жителя (ADR-0005, REQ-001/091). Rate-limit проверяется в route handler ДО
// вызова requestOtp (см. rateLimit.ts) — здесь только генерация/сверка кода.

export type UserWithContext = User & {
  roles: UserOsiRole[];
};

export async function requestOtp(
  phone: string,
  ip: string | null,
): Promise<{ devCode?: string }> {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);

  await prisma.otpChallenge.create({
    data: { phone, codeHash: hashOtp(phone, code), requestIp: ip, expiresAt },
  });

  await sendSms(phone, `Код для входа в ОСИ: ${code}. Действует ${Math.round(env.OTP_TTL_SECONDS / 60)} мин.`);

  // devCode отдаётся ТОЛЬКО при явном OTP_DEV_ECHO=1 (dev/e2e) И консольной заглушке.
  // Секьюрити: без явного флага код НЕ возвращается в ответе — иначе любой мог бы запросить
  // код чужого номера и получить его в API-ответе (захват аккаунта). Код печатается в лог.
  return env.SMS_PROVIDER === "console" && env.OTP_DEV_ECHO === "1"
    ? { devCode: code }
    : {};
}

export type VerifyResult =
  | { ok: true; user: UserWithContext }
  | { ok: false; reason: "expired" | "invalid" | "too_many_attempts" };

export async function verifyOtp(phone: string, code: string): Promise<VerifyResult> {
  const challenge = await prisma.otpChallenge.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
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

  if (!safeEqualHex(challenge.codeHash, hashOtp(phone, code))) {
    return { ok: false, reason: "invalid" };
  }

  // Успех: гасим челлендж (одноразовость) и разрешаем пользователя.
  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  // Первый вход по номеру создаёт пользователя. Доступа к данным это не даёт: без Occupant/роли
  // RLS ничего не покажет — привязку к квартире делает председатель (онбординг, срез 3).
  await prisma.user.upsert({ where: { phone }, update: {}, create: { phone } });
  const user = await prisma.user.findUniqueOrThrow({
    where: { phone },
    include: { roles: true },
  });

  return { ok: true, user };
}
