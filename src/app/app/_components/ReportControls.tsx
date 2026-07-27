"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/apiClient";
import { selectClassName } from "@/lib/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Генерация отчёта одним действием (REQ-040) за месяц/квартал/год (REQ-045)
// + публикация жителям (REQ-043). Селекторы — нативные (e2e-паттерн проекта).

export function GenerateReportForm({ buildingId }: { buildingId: string }) {
  const router = useRouter();
  const now = new Date();
  const year = now.getFullYear();
  const [kind, setKind] = useState<"month" | "quarter" | "year">("month");
  const [month, setMonth] = useState(`${year}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [quarter, setQuarter] = useState(`Q${Math.floor(now.getMonth() / 3) + 1}`);
  const [yearVal, setYearVal] = useState(String(year));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // REQ-045: период на API — «ГГГГ-ММ» | «ГГГГ-Qn» | «ГГГГ».
  const period =
    kind === "month" ? month : kind === "quarter" ? `${yearVal}-${quarter}` : yearVal;

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await postJson("/api/reports", { buildingId, period });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={run} className="flex flex-wrap gap-2">
      <select
        aria-label="Тип периода"
        value={kind}
        onChange={(e) => setKind(e.target.value as typeof kind)}
        data-testid="report-kind"
        className={`${selectClassName} w-auto flex-none`}
      >
        <option value="month">Месяц</option>
        <option value="quarter">Квартал</option>
        <option value="year">Год</option>
      </select>

      {kind === "month" && (
        <Input
          aria-label="Период"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          data-testid="report-period"
          className="flex-1 basis-[140px]"
        />
      )}
      {kind === "quarter" && (
        <>
          <select
            aria-label="Квартал"
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            data-testid="report-quarter"
            className={`${selectClassName} w-auto flex-none`}
          >
            <option value="Q1">I квартал</option>
            <option value="Q2">II квартал</option>
            <option value="Q3">III квартал</option>
            <option value="Q4">IV квартал</option>
          </select>
          <Input
            aria-label="Год"
            type="number"
            min={2020}
            max={2100}
            value={yearVal}
            onChange={(e) => setYearVal(e.target.value)}
            data-testid="report-year"
            className="w-24 flex-none"
          />
        </>
      )}
      {kind === "year" && (
        <Input
          aria-label="Год"
          type="number"
          min={2020}
          max={2100}
          value={yearVal}
          onChange={(e) => setYearVal(e.target.value)}
          data-testid="report-year"
          className="w-24 flex-none"
        />
      )}

      <Button type="submit" disabled={busy} data-testid="report-generate" className="w-auto">
        {busy ? "Формируем…" : "Сформировать отчёт"}
      </Button>
      {error && (
        <p role="alert" className="m-0 basis-full text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

export function PublishButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function publish() {
    setBusy(true);
    try {
      await postJson(`/api/reports/${reportId}/publish`, {});
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={publish}
      disabled={busy}
      data-testid="report-publish"
      className="h-8 rounded-full"
    >
      {busy ? "…" : "Опубликовать жителям"}
    </Button>
  );
}
