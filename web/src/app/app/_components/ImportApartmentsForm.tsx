"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";

type ApartmentType = "RESIDENTIAL" | "NON_RESIDENTIAL" | "PARKING" | "STORAGE";

type ParsedRow = {
  rowNumber: number;
  number: string;
  ownerName: string | null;
  iin: string | null;
  phone: string | null;
  type: ApartmentType | null;
  accountNumber: string | null;
  area: number | null;
};

type ImportSummary = {
  apartmentsCreated: number;
  apartmentsUpdated: number;
  ownersCreated: number;
  ownersUpdated: number;
  ownersSkipped: number;
};

const TYPE_LABELS: Record<ApartmentType, string> = {
  RESIDENTIAL: "Жилое",
  NON_RESIDENTIAL: "Нежилое",
  PARKING: "Парковка",
  STORAGE: "Кладовка",
};

// Импорт реестра помещений из Excel (REQ-012 ревизия, excel-import.md): выбор файла →
// предпросмотр разобранных строк (parse, без записи в БД) → подтверждение (commit).
export function ImportApartmentsForm({ buildingId }: { buildingId: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [skippedRowCount, setSkippedRowCount] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // разрешить повторный выбор того же файла (после ошибки и т.п.)
    if (!file) return;
    setError(null);
    setSummary(null);
    setRows(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/apartments/import/parse", { method: "POST", body: form });
      const json = (await res.json().catch(() => null)) as
        | { data?: { rows: ParsedRow[]; skippedRowCount: number }; error?: { message?: string } }
        | null;
      if (!res.ok) throw new Error(json?.error?.message ?? "Не удалось разобрать файл");
      setRows(json?.data?.rows ?? []);
      setSkippedRowCount(json?.data?.skippedRowCount ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!rows) return;
    setError(null);
    setLoading(true);
    try {
      const result = await postJson<ImportSummary>("/api/apartments/import/commit", {
        buildingId,
        rows,
      });
      setSummary(result);
      setRows(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-1.5 text-sm">
        <span>Файл реестра (.xlsx)</span>
        <input
          type="file"
          accept=".xlsx"
          onChange={onFileChange}
          disabled={loading}
          data-testid="import-file-input"
          className="text-sm"
        />
      </label>

      {loading && <p className="m-0 text-sm text-muted-foreground">Обработка…</p>}
      {error && (
        <p role="alert" data-testid="error" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}

      {rows && rows.length > 0 && (
        <div className="grid gap-2.5">
          <p className="m-0 text-sm text-muted-foreground">
            Распознано {rows.length} помещений
            {skippedRowCount > 0 ? `, пропущено строк без номера: ${skippedRowCount}` : ""}.
            Проверьте и подтвердите импорт.
          </p>
          <div className="max-h-80 overflow-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="px-2.5 py-2 font-medium">№</th>
                  <th className="px-2.5 py-2 font-medium">Собственник</th>
                  <th className="px-2.5 py-2 font-medium">Телефон</th>
                  <th className="px-2.5 py-2 font-medium">Тип</th>
                  <th className="px-2.5 py-2 font-medium">Площадь</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowNumber} data-testid="import-row" className="border-t border-border">
                    <td className="px-2.5 py-1.5">{r.number}</td>
                    <td className="px-2.5 py-1.5">{r.ownerName ?? "—"}</td>
                    <td className="px-2.5 py-1.5">{r.phone ?? "—"}</td>
                    <td className="px-2.5 py-1.5">{r.type ? TYPE_LABELS[r.type] : "—"}</td>
                    <td className="px-2.5 py-1.5">{r.area ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            onClick={confirmImport}
            disabled={loading}
            data-testid="import-confirm"
          >
            {loading ? "Импортируем…" : `Импортировать ${rows.length} помещений`}
          </Button>
        </div>
      )}

      {summary && (
        <p data-testid="import-summary" className="m-0 text-sm text-muted-foreground">
          Готово: квартир создано {summary.apartmentsCreated}, обновлено{" "}
          {summary.apartmentsUpdated}; собственников создано {summary.ownersCreated}, обновлено{" "}
          {summary.ownersUpdated}
          {summary.ownersSkipped > 0 ? `, без ФИО пропущено ${summary.ownersSkipped}` : ""}.
        </p>
      )}
    </div>
  );
}
