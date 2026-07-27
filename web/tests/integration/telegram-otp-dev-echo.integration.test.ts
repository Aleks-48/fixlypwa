import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { requestOtp } from "@/lib/auth/otp";
import { parseIdentifier } from "@/lib/identifier";

// Единый Telegram/SMS-канал при OTP_DEV_ECHO=1 (review 2026-07-22, otp.ts): непривязанный номер
// больше не упирается в needs_telegram_link, если включено dev-эхо — код генерируется, уходит
// в SMS-консоль (не в Telegram, чат всё равно не существует) и возвращается в devCode. Отдельный
// файл — env.ts кеширует значения на первый доступ в пределах модульного графа файла (Vitest
// isolate=true), а соседний telegram-otp.integration.test.ts фиксирует ПРОТИВОПОЛОЖНый
// прод-контракт (OTP_DEV_ECHO=0) в том же процессе.
process.env.PHONE_OTP_CHANNEL = "telegram";
process.env.OTP_DEV_ECHO = "1";

const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const uniqPhone = () => `+7785${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

afterAll(async () => {
  await admin.otpChallenge.deleteMany({ where: { identifier: { startsWith: "+7785" } } });
  await admin.$disconnect();
});

describe("Telegram-канал OTP: dev-режим без привязки (REQ-009, review 2026-07-22)", () => {
  it("непривязанный номер + OTP_DEV_ECHO=1 — sent с devCode, канал SMS, не needs_telegram_link", async () => {
    const phone = uniqPhone();
    const identifier = parseIdentifier(phone)!;

    const result = await requestOtp(identifier, "127.0.0.1");
    expect(result).toMatchObject({ status: "sent" });
    expect((result as { devCode?: string }).devCode).toMatch(/^\d{6}$/);

    const challenge = await admin.otpChallenge.findFirstOrThrow({
      where: { identifier: phone },
    });
    expect(challenge.channel).toBe("SMS");
  });

  it("привязанный номер + OTP_DEV_ECHO=1 — devCode ЕСТЬ, канал всё равно TELEGRAM (реальная доставка не подменяется)", async () => {
    const phone = uniqPhone();
    const identifier = parseIdentifier(phone)!;
    await admin.telegramLink.create({ data: { phone, chatId: "999999" } });

    const result = await requestOtp(identifier, "127.0.0.1");
    expect(result).toMatchObject({ status: "sent" });
    expect((result as { devCode?: string }).devCode).toMatch(/^\d{6}$/);

    const challenge = await admin.otpChallenge.findFirstOrThrow({
      where: { identifier: phone },
    });
    expect(challenge.channel).toBe("TELEGRAM");

    await admin.telegramLink.deleteMany({ where: { phone } });
  });
});
