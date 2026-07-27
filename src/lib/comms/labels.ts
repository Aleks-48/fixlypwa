// Русские подписи для перечислений коммуникации (REQ-080). Вынесены отдельно — не хардкодить
// строки по компонентам (i18n-ready).
export const requestCategoryLabels: Record<string, string> = {
  PLUMBING: "Сантехника",
  ELEVATOR: "Лифт",
  CLEANING: "Уборка",
  ELECTRICITY: "Электрика",
  OTHER: "Другое",
};

export const requestStatusLabels: Record<string, string> = {
  RECEIVED: "Принята",
  IN_PROGRESS: "В работе",
  RESOLVED: "Решена",
};

export const requestStatusOrder = ["RECEIVED", "IN_PROGRESS", "RESOLVED"] as const;

export const infoTypeLabels: Record<string, string> = {
  TRASH_SCHEDULE: "Вывоз мусора",
  EMERGENCY_CONTACTS: "Аварийные службы",
  PAYMENT_DETAILS: "Реквизиты для оплаты",
  CHAIRMAN_CONTACTS: "Контакты председателя",
  OTHER: "Другое",
};

export const infoTypeOrder = [
  "TRASH_SCHEDULE",
  "EMERGENCY_CONTACTS",
  "PAYMENT_DETAILS",
  "CHAIRMAN_CONTACTS",
  "OTHER",
] as const;
