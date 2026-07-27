import { afterEach, describe, expect, it, vi } from "vitest";

// Транспорт OTP по SMS (Mobizon, Q-030). env.ts кеширует значения при первом обращении
// (модульный синглтон, src/lib/env.ts) — vi.resetModules() + динамический import нужны,
// чтобы каждый сценарий получил СВОЙ env со своими переменными, а не переиспользованный кеш
// из предыдущего теста.
describe("sendSms — транспорт OTP по SMS", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("console-режим печатает в лог, сеть не трогает", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("SMS_PROVIDER", "console");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const { sendSms } = await import("./sms");
    await sendSms("+77010000001", "Код: 123456");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("[SMS:console]"));
    infoSpy.mockRestore();
  });

  it("mobizon: без MOBIZON_API_KEY — явная ошибка, без сетевого вызова", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("SMS_PROVIDER", "mobizon");
    // Явно затираем — в .env разработчика может лежать настоящий ключ (демо-стенд), а сценарий
    // теста именно про его ОТСУТСТВИЕ (review 2026-07-22: без этого тест ловит реальный ключ
    // из .env через авто-загрузку Vite и падает на другом шаге).
    vi.stubEnv("MOBIZON_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { sendSms } = await import("./sms");
    await expect(sendSms("+77010000001", "Код: 123456")).rejects.toThrow("MOBIZON_API_KEY");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mobizon: успешная отправка — recipient без «+», нужные параметры в body", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("SMS_PROVIDER", "mobizon");
    vi.stubEnv("MOBIZON_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 0, data: { status: 2 }, message: "" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendSms } = await import("./sms");
    await sendSms("+77010000001", "Код: 123456");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.mobizon.kz/service/Message/SendSmsMessage");
    const body = init.body as URLSearchParams;
    expect(body.get("recipient")).toBe("77010000001");
    expect(body.get("text")).toBe("Код: 123456");
    expect(body.get("apiKey")).toBe("test-key");
    expect(body.get("from")).toBeNull(); // общая подпись — параметр НЕ передаём
  });

  it("mobizon: code!==0 — ошибка с сообщением шлюза", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("SMS_PROVIDER", "mobizon");
    vi.stubEnv("MOBIZON_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 1, message: "Invalid recipient" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendSms } = await import("./sms");
    await expect(sendSms("+77010000001", "Код: 123456")).rejects.toThrow("Invalid recipient");
  });

  it("mobizon: сетевой сбой/не-JSON ответ — понятная ошибка, не падает молча", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("SMS_PROVIDER", "mobizon");
    vi.stubEnv("MOBIZON_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("not json");
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendSms } = await import("./sms");
    await expect(sendSms("+77010000001", "Код: 123456")).rejects.toThrow("502");
  });
});
