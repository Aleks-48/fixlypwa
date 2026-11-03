"use client";

import { Button } from "@/components/ui/button";
import { Card,CardContent } from "@/components/ui/card";
import { AlertCircle,CheckCircle2,Loader2,Sparkles } from "lucide-react";
import { useState } from "react";

export function HouseAiAnalyticsTab({ buildingId }: { buildingId: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    overview: string;
    categoryStats: Record<string, number>;
    keyRecommendations: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildingId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? " Ошибка аудита");
      setData(result);
    } catch (caughtError) {
const e = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl border-emerald-500/30 bg-emerald-500/[0.02] shadow-sm">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-500">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="m-0 text-base font-bold">ИИ-Аудитор документов Дома (Groq AI)</h3>
              <p className="m-0 text-xs text-muted-foreground">
                Автоматическая проверка полноты документации и соответствия Закону РК «О жилищных отношениях»
              </p>
            </div>
          </div>

          <Button
            onClick={runAudit}
            disabled={loading}
            className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {data ? "Обновить ИИ-Аудит" : "Запустить ИИ-Аудит"}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded-xl">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {data && (
          <div className="space-y-4 pt-3 border-t border-border/50">
            {/* Общая сводка */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Заключение ИИ
              </span>
              <p className="text-sm bg-background p-3.5 rounded-xl border border-border/60 leading-relaxed">
                {data.overview}
              </p>
            </div>

            {/* Рекомендации по документам */}
            {data.keyRecommendations?.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Ключевые задачи для Председателя
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.keyRecommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-3 rounded-xl border bg-card text-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
