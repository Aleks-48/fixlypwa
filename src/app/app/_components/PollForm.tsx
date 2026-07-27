"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { postJson } from "@/lib/apiClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Создание быстрого опроса председателем (2–6 вариантов).
export function PollForm({ buildingId }: { buildingId: string }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["Да", "Нет"]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Рассчитываем даты (начало — прямо сейчас, окончание — через 7 дней)
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    try {
      await postJson("/api/polls", {
        buildingId,
        title: question, // Передаем question в поле title для бэкенда
        startDate: now.toISOString(),
        endDate: weekLater.toISOString(),
        options: options.map((o) => o.trim()).filter(Boolean),
      });
      setQuestion("");
      setOptions(["Да", "Нет"]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3.5">
      <div className="grid gap-1.5">
        <Label htmlFor="p-q">Вопрос</Label>
        <Input
          id="p-q"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          minLength={3}
          placeholder="Ставим шлагбаум во дворе?"
          data-testid="poll-question"
        />
      </div>
      {options.map((o, i) => (
        <Input
          key={i}
          aria-label={`Вариант ${i + 1}`}
          value={o}
          onChange={(e) =>
            setOptions((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))
          }
          required
          data-testid={`poll-opt-${i}`}
        />
      ))}
      <div className="flex gap-2">
        {options.length < 6 && (
          <Button type="button" variant="outline" onClick={() => setOptions((p) => [...p, ""])}>
            <Plus aria-hidden size={14} /> Вариант
          </Button>
        )}
        <Button type="submit" disabled={loading} data-testid="poll-submit">
          {loading ? "Создаём…" : "Создать опрос"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}