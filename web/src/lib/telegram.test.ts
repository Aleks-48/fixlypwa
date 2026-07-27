import { afterEach, describe, expect, it, vi } from "vitest";

// telegram.ts (REQ-009, telegram-otp.md). handleTelegramUpdate трогает identity-таблицу
// TelegramLink напрямую (вне RLS) — мокаем prisma, реальная БД тут не нужна (в отличие от
// integration-тестов RLS-таблиц). env.ts кеширует значения при первом обращении — как в
// sms.test.ts, vi.resetModules() + динамический import нужны для своего env на сценарий.
const { upsertMock } = vi.hoisted(() => ({ upsertMock: vi.fn() }));
vi.mock("./db/prisma", () => ({
  prisma: { telegramLink: { upsert: upsertMock } },
}));

describe("telegram.ts — транспорт и обработчик апдейтов (REQ-009)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    upsertMock.mockReset();
  });

  it("sendTelegramMessage: console-режим печатает в лог, сеть не трогает", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("TELEGRAM_PROVIDER", "console");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const { sendTelegramMessage } = await import("./telegram");
    await sendTelegramMessage("555", "Код: 123456");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("[TELEGRAM:console]"));
    infoSpy.mockRestore();
  });

  it("sendTelegramMessage: bot-режим без токена — явная ошибка, без сети", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("TELEGRAM_PROVIDER", "bot");
    // Явно затираем — в .env разработчика может лежать настоящий токен бота (демо-стенд), а
    // сценарий теста именно про его ОТСУТСТВИЕ (review 2026-07-22: без этого тест ловит
    // реальный токен из .env через авто-загрузку Vite и падает на другом шаге).
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { sendTelegramMessage } = await import("./telegram");
    await expect(sendTelegramMessage("555", "Код: 123456")).rejects.toThrow("TELEGRAM_BOT_TOKEN");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sendTelegramMessage: bot-режим — успешная отправка, верный URL и тело", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("TELEGRAM_PROVIDER", "bot");
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    const { sendTelegramMessage } = await import("./telegram");
    await sendTelegramMessage("555", "Код: 123456");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/bottest-token/sendMessage");
    expect(JSON.parse(init.body as string)).toEqual({ chat_id: "555", text: "Код: 123456" });
  });

  it("sendTelegramMessage: bot-режим — ok:false в ответе даёт понятную ошибку", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("TELEGRAM_PROVIDER", "bot");
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, description: "chat not found" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendTelegramMessage } = await import("./telegram");
    await expect(sendTelegramMessage("555", "Код")).rejects.toThrow("chat not found");
  });

  it("handleTelegramUpdate: /start отправляет клавиатуру «Поделиться номером», привязка не трогается", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("TELEGRAM_PROVIDER", "console");
    vi.stubGlobal("fetch", vi.fn());
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const { handleTelegramUpdate } = await import("./telegram");
    await handleTelegramUpdate({ message: { chat: { id: 42 }, text: "/start" } });

    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("Поделиться номером"));
    expect(upsertMock).not.toHaveBeenCalled();
    infoSpy.mockRestore();
  });

  it("handleTelegramUpdate: contact привязывает нормализованный номер к chatId (upsert)", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("TELEGRAM_PROVIDER", "console");
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "info").mockImplementation(() => {});

    const { handleTelegramUpdate } = await import("./telegram");
    await handleTelegramUpdate({
      message: { chat: { id: 42 }, contact: { phone_number: "77011234567" } },
    });

    expect(upsertMock).toHaveBeenCalledWith({
      where: { phone: "+77011234567" },
      create: { phone: "+77011234567", chatId: "42" },
      update: { chatId: "42" },
    });
  });

  it("handleTelegramUpdate: нераспознанный номер — привязка НЕ создаётся", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("TELEGRAM_PROVIDER", "console");
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "info").mockImplementation(() => {});

    const { handleTelegramUpdate } = await import("./telegram");
    await handleTelegramUpdate({
      message: { chat: { id: 42 }, contact: { phone_number: "123" } },
    });

    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("handleTelegramUpdate: сообщение без text/contact — ничего не делает", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("TELEGRAM_PROVIDER", "console");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { handleTelegramUpdate } = await import("./telegram");
    await handleTelegramUpdate({ message: { chat: { id: 42 } } });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
