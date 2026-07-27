import { randomBytes, createHash, randomInt, timingSafeEqual } from "node:crypto";

// Опаковый токен сессии (ADR-0005, паттерн Lucia): клиенту отдаётся сырой токен (в cookie),
// в БД хранится только его sha256-хеш (Session.id). Утечка БД не даёт действующих токенов.
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// OTP-код: 6 цифр, криптостойкий источник (randomInt). Диапазон включает ведущие нули.
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// Код в открытом виде не хранится: держим sha256(phone:code). Соль-привязка к телефону не даёт
// переиспользовать радужные таблицы между номерами.
export function hashOtp(phone: string, code: string): string {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

// Постоянное по времени сравнение hex-хешей одинаковой длины (защита от timing-атак).
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
