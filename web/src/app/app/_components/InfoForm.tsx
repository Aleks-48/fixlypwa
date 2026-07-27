"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/apiClient";
import { infoTypeLabels, infoTypeOrder } from "@/lib/comms/labels";
import { selectClassName } from "@/lib/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Добавление записи в инфо-раздел дома председателем (features.md блок B).
export function InfoForm({ buildingId }: { buildingId: string }) {
  const router = useRouter();
  const [type, setType] = useState<string>(infoTypeOrder[0]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/info", { buildingId, type, title, content });
      setTitle("");
      setContent("");
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
        <Label htmlFor="i-type">Тип</Label>
        <select
          id="i-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          data-testid="info-type"
          className={selectClassName}
        >
          {infoTypeOrder.map((t) => (
            <option key={t} value={t}>
              {infoTypeLabels[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="i-title">Заголовок</Label>
        <Input
          id="i-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          data-testid="info-title"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="i-content">Содержание</Label>
        <Textarea
          id="i-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={2}
          data-testid="info-content"
        />
      </div>
      <Button type="submit" disabled={loading} data-testid="info-submit">
        {loading ? "Сохраняем…" : "Добавить"}
      </Button>
      {error && (
        <p role="alert" data-testid="error" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
