// Rate-limit входа по паролю (защита от перебора пароля председателя; security-review
// 2026-07-02). In-memory sliding window по ключу ip|email: до MAX_FAILS неудач за WINDOW_MS,
// успешный вход сбрасывает счётчик.
//
// ⚠️ Ограничение: состояние в памяти процесса — при нескольких инстансах Next.js (NFR-020)
// лимит действует per-инстанс (атакующий получает N×лимит). Для MVP на одном инстансе
// достаточно; при горизонтальном масштабировании перенести в durable-хранилище по образцу
// OtpChallenge (rateLimit.ts).

const WINDOW_MS = 15 * 60 * 1000; // 15 минут
const MAX_FAILS = 10;

type Entry = { fails: number; windowStart: number };
const store = new Map<string, Entry>();

function key(ip: string | null, email: string): string {
  return `${ip ?? "?"}|${email.toLowerCase()}`;
}

// Периодическая уборка, чтобы Map не рос бесконечно.
function sweep(now: number): void {
  if (store.size < 10_000) return;
  for (const [k, e] of store) {
    if (now - e.windowStart > WINDOW_MS) store.delete(k);
  }
}

export function isLoginBlocked(ip: string | null, email: string): boolean {
  const e = store.get(key(ip, email));
  if (!e) return false;
  if (Date.now() - e.windowStart > WINDOW_MS) return false;
  return e.fails >= MAX_FAILS;
}

export function recordLoginFailure(ip: string | null, email: string): void {
  const now = Date.now();
  sweep(now);
  const k = key(ip, email);
  const e = store.get(k);
  if (!e || now - e.windowStart > WINDOW_MS) {
    store.set(k, { fails: 1, windowStart: now });
  } else {
    e.fails += 1;
  }
}

export function recordLoginSuccess(ip: string | null, email: string): void {
  store.delete(key(ip, email));
}
