import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { requestOtp } from "@/lib/auth/otp";
import { parseIdentifier } from "@/lib/identifier";
import { handleTelegramUpdate } from "@/lib/telegram";

// Telegram-канал OTP для телефона (REQ-009, telegram-otp.md) — временная замена SMS-шлюза
// до оформления ИП/юрлица (Q-030). PHONE_OTP_CHANNEL=telegram выставлен ДО первого обращения
// к env (ленивый Proxy кеширует на первый доступ, env.ts) — этот файл живёт в своём модульном
// графе (Vitest isolate=true по умолчанию для каждого test-файла; singleThread в конфиге
// отвечает только за пул воркеров, не за изоляцию), поэтому другие integration-файлы, где
// PHONE_OTP_CHANNEL остаётся дефолтным 'sms', не задеты.
process.env.PHONE_OTP_CHANNEL = "telegram";
// Этот файл фиксирует ПРОД-контракт (REQ-009): без dev-эха непривязанному номеру действительно
// некуда слать код. vitest.config.ts уже форсирует OTP_DEV_ECHO=0 для всего integration-прогона
// (review 2026-07-22) — дублируем здесь явно, чтобы само допущение не потерялось, если общий
// конфиг когда-нибудь изменят. Сценарий OTP_DEV_ECHO=1 — отдельным файлом
// (telegram-otp-dev-echo.integration.test.ts), т.к. env.ts кеширует значения на первый доступ
// в пределах одного файла (Vitest isolate=true даёт каждому файлу свежий модульный граф).
process.env.OTP_DEV_ECHO = "0";

const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const uniqPhone = () => `+7784${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

afterAll(async () => {
  await admin.otpChallenge.deleteMany({ where: { identifier: { startsWith: "+7784" } } });
  await admin.telegramLink.deleteMany({ where: { phone: { startsWith: "+7784" } } });
  await admin.$disconnect();
});

describe("Telegram-канал OTP для телефона (REQ-009)", () => {
  it("без привязки — needs_telegram_link, OtpChallenge НЕ создаётся (нечего слать)", async () => {
    const phone = uniqPhone();
    const identifier = parseIdentifier(phone)!;

    const result = await requestOtp(identifier, "127.0.0.1");
    expect(result).toMatchObject({ status: "needs_telegram_link" });

    const count = await admin.otpChallenge.count({ where: { identifier: phone } });
    expect(count).toBe(0);
  });

  it("с привязкой (TelegramLink) — канал TELEGRAM, OtpChallenge создаётся", async () => {
    const phone = uniqPhone();
    const identifier = parseIdentifier(phone)!;
    await admin.telegramLink.create({ data: { phone, chatId: "12345" } });

    const result = await requestOtp(identifier, "127.0.0.1");
    expect(result.status).toBe("sent");

    const challenge = await admin.otpChallenge.findFirstOrThrow({
      where: { identifier: phone },
    });
    expect(challenge.channel).toBe("TELEGRAM");
  });

  it("handleTelegramUpdate(contact) привязывает номер к чату — requestOtp сразу находит его", async () => {
    const phone = uniqPhone();
    const identifier = parseIdentifier(phone)!;

    // До привязки — тупик.
    const before = await requestOtp(identifier, "127.0.0.1");
    expect(before.status).toBe("needs_telegram_link");

    // Пользователь жмёт «Поделиться номером» в боте — тот же путь, что реальный вебхук
    // (см. /api/telegram/webhook), phone передаём БЕЗ "+", как реально шлёт Telegram.
    await handleTelegramUpdate({
      message: { chat: { id: 777 }, contact: { phone_number: phone.replace("+", "") } },
    });

    const after = await requestOtp(identifier, "127.0.0.1");
    expect(after.status).toBe("sent");
  });
});
