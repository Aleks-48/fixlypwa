import type { DictionaryKey } from "./dictionaries";

/** Ключи словаря для категорий заявок */
export const REQUEST_CATEGORY_KEYS = {
  PLUMBING: "cat_plumbing",
  ELEVATOR: "cat_elevator",
  CLEANING: "cat_cleaning",
  ELECTRICITY: "cat_electricity",
  OTHER: "cat_other",
} as const satisfies Record<string, DictionaryKey>;

/** Ключи словаря для типов инфо-раздела */
export const INFO_TYPE_KEYS = {
  TRASH_SCHEDULE: "info_trash_schedule",
  EMERGENCY_CONTACTS: "info_emergency_contacts",
  PAYMENT_DETAILS: "info_payment_details",
  CHAIRMAN_CONTACTS: "info_chairman_contacts",
  OTHER: "info_other",
} as const satisfies Record<string, DictionaryKey>;

/** Ключи словаря для категорий документов */
export const DOC_CATEGORY_KEYS = {
  GOV_REGULATION: "doc_gov_regulation",
  REPORT: "doc_report",
  PROTOCOL: "doc_protocol",
  CONTRACT: "doc_contract",
  TECHNICAL: "doc_technical",
  OTHER: "doc_other",
} as const satisfies Record<string, DictionaryKey>;

/** Ключи словаря для категорий iKomek */
export const IKOMEK_CATEGORY_KEYS = {
  HEATING: "ikomek_heating",
  WATER_SUPPLY: "ikomek_water",
  YARD: "ikomek_yard",
  GARBAGE: "ikomek_garbage",
  LIGHTING: "ikomek_lighting",
  OTHER: "ikomek_other",
} as const satisfies Record<string, DictionaryKey>;

/** Ключи словаря для типов нарушений по мусору */
export const GARBAGE_ISSUE_KEYS = {
  OVERFLOW: "garbage_overflow",
  NO_SCHEDULE: "garbage_no_schedule",
  BULKY_WASTE: "garbage_bulky",
  BROKEN_CONTAINER: "garbage_broken",
} as const satisfies Record<string, DictionaryKey>;

export const FINANCE_CATEGORY_KEYS = {
  MAINTENANCE: "charge_maintenance",
  TARGETED: "finance_targeted_fee",
  CAPITAL_REPAIR: "charge_cap_repair",
} as const satisfies Record<string, DictionaryKey>;
