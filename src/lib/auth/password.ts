import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

// Хеширование пароля председателя (ADR-0005, NFR-053). scrypt из stdlib — без внешних
// зависимостей (NFR-010). Формат хранения: `scrypt$<saltHex>$<hashHex>`.
const KEYLEN = 64;
const PARAMS = { N: 16384, r: 8, p: 1 } as const;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN, PARAMS);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, saltHex, hashHex] = parts;
  if (!saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length, PARAMS);
  // Постоянное по времени сравнение — защита от timing-атак (ADR-0005).
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
