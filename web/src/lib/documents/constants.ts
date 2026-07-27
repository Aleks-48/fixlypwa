// src/lib/documents/constants.ts

export type DocumentCategory =
  | "GOV_REGULATION"
  | "REPORT"
  | "PROTOCOL"
  | "CONTRACT"
  | "TECHNICAL"
  | "OTHER";

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  GOV_REGULATION: "Нормативные акты",
  REPORT: "Отчёты",
  PROTOCOL: "Протоколы",
  CONTRACT: "Договоры",
  TECHNICAL: "Техническая документация",
  OTHER: "Прочее",
};

export const documentCategoryOrder: DocumentCategory[] = [
  "GOV_REGULATION",
  "REPORT",
  "PROTOCOL",
  "CONTRACT",
  "TECHNICAL",
  "OTHER",
];