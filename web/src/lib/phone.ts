// Нормализация казахстанских номеров к E.164 (+7XXXXXXXXXX) — первичный идентификатор входа
// жителя (REQ-001, ADR-0005). Принимает распространённые форматы ввода: 8700…, +7700…, пробелы,
// дефисы, скобки. Возвращает null для невалидного номера — вызывающий отдаёт VALIDATION.
export function normalizeKzPhone(input: string): string | null {
  if (typeof input !== "string") return null;
  let d = input.replace(/\D/g, "");

  // Местная запись через 8 → код страны 7.
  if (d.length === 11 && d.startsWith("8")) d = "7" + d.slice(1);
  // Ввод без кода страны (10 цифр, начинается с мобильного 7xx).
  if (d.length === 10 && d.startsWith("7")) d = "7" + d;

  // Валидный номер РК: 11 цифр, код страны 7, мобильный префикс 7.
  if (d.length === 11 && d.startsWith("77")) return "+" + d;
  return null;
}

// Маска для логов/UI, чтобы не светить полный номер (NFR: не логировать ПДн целиком).
// null — телефон не указан (email-only аккаунт, auth-email.md): показываем placeholder.
export function maskPhone(e164: string | null | undefined): string {
  if (!e164) return "—";
  if (e164.length < 7) return "***";
  return e164.slice(0, 3) + "***" + e164.slice(-2);
}
