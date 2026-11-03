import type { ReportType } from "@prisma/client";
import ExcelJS from "exceljs";
import { reportPeriodLabel } from "./periodLabel";
import type { ReportData } from "./report";

// Локализованные названия статей доходов и расходов
const INCOME_LABELS: Record<string, string> = {
  MAINTENANCE: "6.1 Взносы на содержание и управление",
  TARGETED: "6.2 Целевые взносы",
  CAPITAL_REPAIR: "6.3 Взносы на капитальный ремонт",
  PARKING: "6.4 Аренда парковочных мест",
  COMMERCIAL: "6.5 Аренда коммерческих площадей",
  PENALTIES: "6.6 Пени и штрафы",
  OTHER: "6.7 Прочие поступления",
};

const EXPENSE_LABELS: Record<string, string> = {
  MANAGEMENT: "Управление ОСИ",
  MAINTENANCE: "Содержание и обслуживание",
  UTILITIES: "Коммунальные услуги МОП",
  CLEANING: "Уборка и вывоз мусора",
  SECURITY: "Охрана и видеонаблюдение",
  CAPITAL_REPAIR: "Капитальный ремонт",
  LANDSCAPING: "Благоустройство территории",
  SALARY: "ФОТ персонала",
  OTHER: "Прочие расходы",
};

// Основной стиль ячеек шапки
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF2E6BF0" },
};

const SUBHEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE8EFFD" },
};

const TOTAL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFF9E6" },
};

function applyHeaderStyle(cell: ExcelJS.Cell, isBold = true, fontSize = 11) {
  cell.fill = HEADER_FILL;
  cell.font = { bold: isBold, color: { argb: "FFFFFFFF" }, size: fontSize };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
  };
}

function applyDataStyle(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "hair" },
    bottom: { style: "hair" },
    left: { style: "thin" },
    right: { style: "thin" },
  };
  cell.alignment = { vertical: "middle", wrapText: true };
}

function applyTotalStyle(cell: ExcelJS.Cell) {
  cell.fill = TOTAL_FILL;
  cell.font = { bold: true, size: 11 };
  cell.border = {
    top: { style: "medium" },
    bottom: { style: "medium" },
    left: { style: "thin" },
    right: { style: "thin" },
  };
}

const _tenge = (n: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "KZT", maximumFractionDigits: 2 }).format(n);

/**
 * Генерирует .xlsx книгу отчёта ОСИ по форме Приказа №163.
 * Возвращает Buffer для отправки через Response.
 */
export async function generateReportExcel(
  data: ReportData,
  address: string,
  reportType: ReportType,
  periodFrom: Date,
  osiName?: string,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Fixly";
  wb.lastModifiedBy = "Fixly";
  wb.created = new Date();

  const period = reportPeriodLabel(reportType, periodFrom);

  // ─────────────────────────────────────────────────────────────
  // Лист 1: Сводный отчёт
  // ─────────────────────────────────────────────────────────────
  const ws = wb.addWorksheet("Сводный отчёт", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
  });

  ws.columns = [
    { width: 50 }, // A — наименование
    { width: 22 }, // B — сумма
  ];

  // === Шапка ===
  ws.mergeCells("A1:B1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "ОТЧЁТ ОБ ИСПОЛНЕНИИ БЮДЖЕТА ОСИ";
  titleCell.fill = HEADER_FILL;
  titleCell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 14 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 36;

  ws.mergeCells("A2:B2");
  const subTitle = ws.getCell("A2");
  subTitle.value = `Адрес дома: ${address}${osiName ? ` (${osiName})` : ""}`;
  subTitle.font = { bold: true, size: 11 };
  subTitle.alignment = { horizontal: "center", vertical: "middle" };
  subTitle.fill = SUBHEADER_FILL;
  ws.getRow(2).height = 22;

  ws.mergeCells("A3:B3");
  const periodCell = ws.getCell("A3");
  periodCell.value = `Период: ${period} · Форма по Приказу МНЭ РК № 163`;
  periodCell.font = { italic: true, size: 10, color: { argb: "FF555555" } };
  periodCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(3).height = 18;

  let row = 5;

  // Функция-помощник для добавления секций
  const addSectionHeader = (title: string) => {
    ws.mergeCells(`A${row}:B${row}`);
    const cell = ws.getCell(`A${row}`);
    cell.value = title;
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    ws.getRow(row).height = 24;
    row++;
  };

  const addDataRow = (label: string, value: number | string, isBold = false) => {
    const r = ws.getRow(row);
    r.height = 20;
    const labelCell = ws.getCell(`A${row}`);
    labelCell.value = label;
    labelCell.font = isBold ? { bold: true, size: 10 } : { size: 10 };
    labelCell.alignment = { indent: isBold ? 1 : 2, vertical: "middle", wrapText: true };
    applyDataStyle(labelCell);

    const valCell = ws.getCell(`B${row}`);
    valCell.value = typeof value === "number" ? value : value;
    if (typeof value === "number") {
      valCell.numFmt = "#,##0.00 ₸";
      valCell.alignment = { horizontal: "right", vertical: "middle" };
    }
    valCell.font = isBold ? { bold: true, size: 10 } : { size: 10 };
    applyDataStyle(valCell);
    row++;
  };

  const addTotalRow = (label: string, value: number) => {
    const r = ws.getRow(row);
    r.height = 22;
    const labelCell = ws.getCell(`A${row}`);
    labelCell.value = label;
    applyTotalStyle(labelCell);
    const valCell = ws.getCell(`B${row}`);
    valCell.value = value;
    valCell.numFmt = "#,##0.00 ₸";
    valCell.alignment = { horizontal: "right", vertical: "middle" };
    applyTotalStyle(valCell);
    row++;
  };

  // === Блок 1–2: Остатки на счетах ===
  addSectionHeader("1. ОСТАТКИ ДЕНЕЖНЫХ СРЕДСТВ НА СЧЕТАХ");
  addDataRow("1.1 Текущий (расчётный) счёт", data.balances.current);
  addDataRow("1.2 Накопительный (сберегательный) счёт", data.balances.savings);
  addTotalRow("ИТОГО ОСТАТКОВ", data.balances.current + data.balances.savings);
  row++;

  // === Блок 3–5: Задолженность ===
  addSectionHeader("2. ЗАДОЛЖЕННОСТЬ ПО ВЗНОСАМ НА КОНЕЦ ПЕРИОДА");
  addDataRow("2.1 По взносам на содержание и управление", data.debt.maintenance);
  addDataRow("2.2 По взносам на парковки / нежилые помещения", data.debt.parking);
  addDataRow("2.3 По взносам на капитальный ремонт", data.debt.capitalRepair);
  addTotalRow("ИТОГО ЗАДОЛЖЕННОСТИ", data.debt.maintenance + data.debt.parking + data.debt.capitalRepair);
  row++;

  // === Блок 6: Поступления ===
  addSectionHeader("3. ПОСТУПЛЕНИЯ ЗА ОТЧЁТНЫЙ ПЕРИОД");
  for (const [key, label] of Object.entries(INCOME_LABELS)) {
    const val = data.income[key as keyof typeof data.income];
    if (val != null && val > 0) {
      addDataRow(label, val);
    }
  }
  addTotalRow("ИТОГО ПОСТУПЛЕНИЙ", data.income.total);
  row++;

  // === Блок 7: Расходы — сводка ===
  addSectionHeader("4. РАСХОДЫ ЗА ОТЧЁТНЫЙ ПЕРИОД — ИТОГИ ПО СТАТЬЯМ");
  for (const [key, label] of Object.entries(EXPENSE_LABELS)) {
    const val = data.expenses.byCategory[key as keyof typeof data.expenses.byCategory];
    if (val != null && val > 0) {
      addDataRow(label, val);
    }
  }
  addTotalRow("ИТОГО РАСХОДОВ", data.expenses.total);

  // ─────────────────────────────────────────────────────────────
  // Лист 2: Детализация расходов
  // ─────────────────────────────────────────────────────────────
  const ws2 = wb.addWorksheet("Реестр расходов", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });

  ws2.columns = [
    { header: "Дата", key: "date", width: 14 },
    { header: "Статья расходов", key: "category", width: 28 },
    { header: "Контрагент", key: "counterparty", width: 30 },
    { header: "БИН / ИИН", key: "bin", width: 18 },
    { header: "Назначение", key: "purpose", width: 38 },
    { header: "Сумма (₸)", key: "amount", width: 18 },
  ];

  // Стиль шапки таблицы
  const headerRow2 = ws2.getRow(1);
  headerRow2.height = 28;
  headerRow2.eachCell((cell) => {
    applyHeaderStyle(cell);
  });

  // Данные
  for (const expRow of data.expenses.rows) {
    const r = ws2.addRow({
      date: expRow.date,
      category: EXPENSE_LABELS[expRow.category] ?? expRow.category,
      counterparty: expRow.counterparty?.name ?? "—",
      bin: expRow.counterparty?.bin ?? "—",
      purpose: expRow.purpose ?? "—",
      amount: Number(expRow.amount),
    });
    r.height = 18;
    r.eachCell((cell) => {
      applyDataStyle(cell);
      cell.font = { size: 10 };
    });
    const amtCell = r.getCell("amount");
    amtCell.numFmt = "#,##0.00";
    amtCell.alignment = { horizontal: "right", vertical: "middle" };
  }

  // Итоговая строка
  const totalRow2 = ws2.addRow({
    date: "",
    category: "ИТОГО:",
    counterparty: "",
    bin: "",
    purpose: "",
    amount: data.expenses.total,
  });
  totalRow2.height = 22;
  totalRow2.eachCell((cell) => applyTotalStyle(cell));
  totalRow2.getCell("amount").numFmt = "#,##0.00";
  totalRow2.getCell("amount").alignment = { horizontal: "right", vertical: "middle" };

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
