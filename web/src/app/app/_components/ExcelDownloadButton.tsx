"use client";

import { Button } from "@/components/ui/button";
import { FileSpreadsheet,Loader2 } from "lucide-react";
import { useState } from "react";

export function ExcelDownloadButton({ reportId }: { reportId: string }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/excel`);
      if (!res.ok) throw new Error("Ошибка генерации файла");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Читаем имя файла из заголовка если есть
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
      const filename = match?.[1]
        ? decodeURIComponent(match[1].replace(/"/g, ""))
        : "отчёт-ОСИ.xlsx";

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (caughtError) {
const err = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

      alert(err.message ?? "Ошибка скачивания");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={loading}
      variant="outline"
      size="sm"
      className="h-9 gap-2 rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500 print:hidden"
      title="Скачать отчёт в формате Excel (.xlsx)"
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          <span>Генерация…</span>
        </>
      ) : (
        <>
          <FileSpreadsheet className="size-4" />
          <span>Скачать .xlsx</span>
        </>
      )}
    </Button>
  );
}

