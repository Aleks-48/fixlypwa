import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { requestOtp } from "@/lib/auth/otp";
import { parseIdentifier } from "@/lib/identifier";
import { checkOtpRequestAllowed } from "@/lib/auth/rateLimit";

// Провал доставки не должен считаться попыткой для rate-limit (review 2026-07-22, otp.ts) —
// иначе несколько подряд сбоев транспорта (например, Resend отклонил чужой адрес в
// sandbox-режиме) блокируют идентификатор на час, хотя пользователь ни разу не получил код.
// SMS_PROVIDER=mobizon без ключа падает СИНХРОННО до сети (sms.ts: `if (!MOBIZON_API_KEY) throw`)
// — детерминированный способ форсировать провал транспорта без мока fetch. Отдельный файл — тот
// же принцип изоляции env.ts на первый доступ (Vitest isolate=true), что у telegram-otp*.
process.env.SMS_PROVIDER = "mobizon";
process.env.MOBIZON_API_KEY = ""; // может быть настоящим в .env разработчика — затираем явно
process.env.PHONE_OTP_CHANNEL = "sms";

const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const uniqPhone = () => `+7786${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

afterAll(async () => {
  await admin.otpChallenge.deleteMany({ where: { identifier: { startsWith: "+7786" } } });
  await admin.$disconnect();
});

describe("Провал доставки OTP не ест rate-limit (review 2026-07-22)", () => {
  it("сбой транспорта пробрасывается, OtpChallenge не остаётся, повтор сразу же разрешён", async () => {
    const phone = uniqPhone();
    const identifier = parseIdentifier(phone)!;

    await expect(requestOtp(identifier, "127.0.0.1")).rejects.toThrow("MOBIZON_API_KEY");

    const count = await admin.otpChallenge.count({ where: { identifier: phone } });
    expect(count).toBe(0);

    // Без фикса эта попытка уже засчиталась бы в cooldown/окно — теперь второй запрос
    // немедленно разрешён, а не ждёт OTP_RESEND_COOLDOWN_SECONDS.
    const rate = await checkOtpRequestAllowed(phone, "127.0.0.1");
    expect(rate.allowed).toBe(true);
  });
});
