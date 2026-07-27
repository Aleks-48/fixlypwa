import { normalizeKzPhone } from "./phone";

export type Identifier =
  | { kind: "phone"; value: string }
  | { kind: "email"; value: string };

// Разбор идентификатора входа (REQ-005, auth-email.md §1): содержит '@' → email
// (trim + lowercase), иначе — казахстанский телефон (normalizeKzPhone). Проверка формы email
// намеренно базовая: настоящая валидация — доставленный на ящик код.
export function parseIdentifier(raw: string): Identifier | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
    return { kind: "email", value: email };
  }
  const phone = normalizeKzPhone(trimmed);
  return phone ? { kind: "phone", value: phone } : null;
}
