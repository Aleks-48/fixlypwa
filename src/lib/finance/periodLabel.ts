import type { ReportType } from "@prisma/client";

const QUARTERS = ["I", "II", "III", "IV"] as const;

// Подпись периода отчёта (REQ-045, report-spec.md §4а):
// «июль 2026» / «II квартал 2026» / «2026 год». Даты периода — UTC.
export function reportPeriodLabel(type: ReportType, periodFrom: Date): string {
  const y = periodFrom.getUTCFullYear();
  if (type === "ANNUAL") return `${y} год`;
  if (type === "QUARTERLY") {
    return `${QUARTERS[Math.floor(periodFrom.getUTCMonth() / 3)]} квартал ${y}`;
  }
  return periodFrom.toLocaleDateString("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" });
}
