"use client";

import { useState, useEffect } from "react";
import type { Document } from "@prisma/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShieldCheck, AlertTriangle, Lightbulb, Loader2 } from "lucide-react";
import type { DocumentAnalysisResult } from "@/lib/documents/aiAnalysis";

export function DocumentAiModal({
  doc,
  isOpen,
  onClose,
}: {
  doc: Document | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<DocumentAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doc || !isOpen) {
      setAnalysis(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch("/api/documents/ai-analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: doc.id }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data.error) setError(data.error);
          else setAnalysis(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || " Ошибка загрузки AI отчёта");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [doc, isOpen]);

  if (!doc) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl rounded-2xl p-6">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500 animate-pulse" />
            <DialogTitle className="text-lg font-bold">
              ИИ-Анализ: {doc.title}
            </DialogTitle>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-sm font-medium">Groq AI анализирует документ и проверяет нормы ЖКХ РК...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium">
            {error}
          </div>
        ) : analysis ? (
          <div className="space-y-4 pt-2">
            {/* Краткое резюме */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Суть документа
              </span>
              <p className="text-sm leading-relaxed">{analysis.summary}</p>
            </div>

            {/* Юридическая проверка */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Соответствие законам РК
              </div>
              <p className="text-sm bg-muted/40 p-3 rounded-xl border border-border/50">
                {analysis.legalCheck}
              </p>
            </div>

            {/* Риски и замечания */}
            {analysis.risksAndGaps?.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-500">
                  <AlertTriangle className="h-4 w-4" />
                  Риски и замечания
                </div>
                <ul className="space-y-1 text-sm list-disc list-inside bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl">
                  {analysis.risksAndGaps.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Рекомендации */}
            {analysis.recommendations?.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                  <Lightbulb className="h-4 w-4" />
                  Рекомендации Председателю
                </div>
                <div className="space-y-1.5">
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm bg-primary/5 border border-primary/10 p-2.5 rounded-xl">
                      <Badge variant="secondary" className="rounded-full text-[10px] shrink-0 mt-0.5">
                        #{i + 1}
                      </Badge>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="pt-2 flex justify-end">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
