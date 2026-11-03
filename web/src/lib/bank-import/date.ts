export function parseStatementDate(value: unknown): Date {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  let year: number, month: number, day: number;
  if (typeof value === "number") {
    const serial = Math.floor(value);
    if (!Number.isFinite(value) || serial < 1 || serial > 2958465 || serial === 60) throw new RangeError("Некорректная дата выписки");
    const excelDate = new Date(Date.UTC(1899, 11, 31) + (serial > 60 ? serial - 1 : serial) * 86400000);
    year = excelDate.getUTCFullYear(); month = excelDate.getUTCMonth() + 1; day = excelDate.getUTCDate();
  } else if (typeof value === "string") {
    const local = value.trim().match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
    const iso = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (local) [day, month, year] = [Number(local[1]), Number(local[2]), Number(local[3])];
    else if (iso) [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    else throw new RangeError("Дата должна быть ДД.ММ.ГГГГ или ГГГГ-ММ-ДД");
  } else throw new RangeError("Отсутствует дата операции");
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new RangeError("Некорректная дата операции");
  return date;
}
