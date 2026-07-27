import ExcelJS from "exceljs";
import type { ApartmentType } from "@prisma/client";

// Парсер реестра помещений (REQ-012 ревизия, excel-import.md §1) — формат подтверждён
// реальной выгрузкой ОСИ «Центральный 2/2Б» (одна из систем учёта, не наш собственный экспорт).
// Шапка ищется ПО НАЗВАНИЯМ колонок (не по фиксированной строке 4) — устойчивее к вариациям
// между выгрузками разных ОСИ. Терпим к грязным данным: пустые ИИН/телефон — не ошибка,
// ФИО не нормализуем (лишние пробелы/регистр — на совести исходника).

export type ParsedApartmentRow = {
  rowNumber: number; // для предпросмотра/сообщений об ошибках (1-индексация листа)
  number: string;
  ownerName: string | null;
  iin: string | null;
  phone: string | null;
  type: ApartmentType | null;
  accountNumber: string | null;
  area: number | null;
};

export type ParseResult = {
  rows: ParsedApartmentRow[];
  // Строки, где "Номер" пуст (пропущены как не относящиеся к данным — итоговые строки и т.п.)
  skippedRowCount: number;
};

// Точное совпадение по нормализованному тексту (lower + trim + схлопнутые пробелы) — «Площадь»
// не должно случайно поймать «Полезная площадь» через includes().
const HEADER_FIELDS: Record<string, keyof Omit<ParsedApartmentRow, "rowNumber">> = {
  "номер": "number",
  "собственник": "ownerName",
  "иин": "iin",
  "телефон": "phone",
  "тип": "type",
  "лс оси": "accountNumber",
  "площадь": "area",
};

function normalizeHeader(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function cellText(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && "text" in value) value = (value as { text: string }).text;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function cellNumber(value: ExcelJS.CellValue): number | null {
  const s = cellText(value);
  if (s === null) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function mapApartmentType(raw: string | null): ApartmentType | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes("жил")) return "RESIDENTIAL";
  if (s.includes("парков")) return "PARKING";
  if (s.includes("кладов") || s.includes("склад")) return "STORAGE";
  return "NON_RESIDENTIAL";
}

const MAX_HEADER_SCAN_ROWS = 20;

export async function parseApartmentRegistry(buffer: Buffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  // exceljs типизирует свой Buffer-параметр под чуть иную версию @types/node (нет resizable/
  // resize и т.п.) — расхождение чисто типовое, в рантайме это тот же Node Buffer.
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  // Лист с реестром — первый лист, где вообще есть строки (образец содержал пустой "Sheet1"
  // перед листом "Помещенияквартиры").
  const sheet = workbook.worksheets.find((ws) => ws.rowCount > 0) ?? workbook.worksheets[0];
  if (!sheet) throw new Error("В файле нет листов с данными");

  // Найти строку шапки: сканируем первые MAX_HEADER_SCAN_ROWS строк, шапка — та, где
  // распознались колонки "номер" И "собственник" (минимальный надёжный сигнал).
  let headerRowNumber = -1;
  const columnFields = new Map<number, keyof Omit<ParsedApartmentRow, "rowNumber">>();

  for (let r = 1; r <= Math.min(MAX_HEADER_SCAN_ROWS, sheet.rowCount); r++) {
    const row = sheet.getRow(r);
    const candidate = new Map<number, keyof Omit<ParsedApartmentRow, "rowNumber">>();
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = cellText(cell.value);
      if (!text) return;
      const field = HEADER_FIELDS[normalizeHeader(text)];
      if (field) candidate.set(colNumber, field);
    });
    const found = new Set(candidate.values());
    if (found.has("number") && found.has("ownerName")) {
      headerRowNumber = r;
      candidate.forEach((field, col) => columnFields.set(col, field));
      break;
    }
  }

  if (headerRowNumber === -1) {
    throw new Error(
      "Не удалось распознать шапку реестра — нужны колонки «Номер» и «Собственник»",
    );
  }

  const rows: ParsedApartmentRow[] = [];
  let skippedRowCount = 0;

  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const raw: Partial<Record<keyof Omit<ParsedApartmentRow, "rowNumber">, ExcelJS.CellValue>> =
      {};
    columnFields.forEach((field, col) => {
      raw[field] = row.getCell(col).value;
    });

    const number = cellText(raw.number ?? null);
    if (!number) {
      skippedRowCount++;
      continue;
    }

    rows.push({
      rowNumber: r,
      number,
      ownerName: cellText(raw.ownerName ?? null),
      iin: cellText(raw.iin ?? null),
      phone: cellText(raw.phone ?? null),
      type: mapApartmentType(cellText(raw.type ?? null)),
      accountNumber: cellText(raw.accountNumber ?? null),
      area: cellNumber(raw.area ?? null),
    });
  }

  return { rows, skippedRowCount };
}
