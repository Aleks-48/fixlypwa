import { env } from "./env";
import { maskPhone } from "./phone";

const MOBIZON_ENDPOINT = "https://api.mobizon.kz/service/Message/SendSmsMessage";

// Транспорт OTP (ADR-0005, Q-030 решён 2026-07-18). Внешний шлюз только доставляет код, не
// хранит ПДн. В dev/test — заглушка 'console' (код в лог сервера). 'mobizon' (прод) — Mobizon.kz,
// ОБЩАЯ подпись отправителя (без параметра `from`) — юрлицо/альфа-имя НЕ требуются для этого
// режима (в отличие от именной подписи компании, которая осталась бы отдельным апгрейдом).
export async function sendSms(phone: string, message: string): Promise<void> {
  if (env.SMS_PROVIDER === "console") {
    // Телефон маскируем в логе; полный код печатаем только в dev-заглушке.
    console.info(`[SMS:console] ${maskPhone(phone)} → ${message}`);
    return;
  }

  if (!env.MOBIZON_API_KEY) {
    throw new Error("SMS_PROVIDER=mobizon: MOBIZON_API_KEY обязателен");
  }

  // Mobizon принимает номер в международном формате БЕЗ "+" — только цифры.
  const recipient = phone.replace(/\D/g, "");
  const body = new URLSearchParams({
    recipient,
    text: message,
    apiKey: env.MOBIZON_API_KEY,
    output: "json",
    api: "v1",
  });

  const res = await fetch(MOBIZON_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  // Конверт ответа Mobizon: { code, data, message }. code=0 — успех, любой другой — ошибка
  // (100 — постановка в очередь, для одиночного SMS на практике не встречается).
  const json = (await res.json().catch(() => null)) as
    | { code?: number; data?: unknown; message?: string }
    | null;
  if (!res.ok || !json || json.code !== 0) {
    // При code=1 причина по полю лежит в data (например, «направление недоступно» по
    // recipient — так проявляется неактивированный аккаунт), а message — общий текст.
    // Без деталей диагностика требует повторного запроса вручную (смоук Д3 2026-07-18).
    const detail =
      json?.data && typeof json.data === "object" && Object.keys(json.data).length > 0
        ? ` — ${JSON.stringify(json.data)}`
        : "";
    throw new Error(
      `Mobizon: не удалось отправить SMS (${json?.message ?? res.status}${detail})`,
    );
  }
}
