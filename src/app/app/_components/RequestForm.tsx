"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/apiClient";
import { requestCategoryLabels } from "@/lib/comms/labels";
import { selectClassName } from "@/lib/ui";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PhotoUpload } from "./PhotoUpload";

// Подача заявки жителем (features.md блок B). Категория — нативный <select> (e2e зависит от
// selectOption(), не подходит для Radix Select — см. build-plan). defaultCategory —
// предвыбор из ссылки «Написать председателю» (?category=OTHER, заметки п.8).
export function RequestForm({ defaultCategory = "PLUMBING" }: { defaultCategory?: string }) {
  const router = useRouter();
  const [category, setCategory] = useState(
    defaultCategory in requestCategoryLabels ? defaultCategory : "PLUMBING",
  );
  const [text, setText] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/requests", { category, text, photoUrls });
      setText("");
      setPhotoUrls([]);
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
        <Label htmlFor="r-cat">Категория</Label>
        <select
          id="r-cat"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          data-testid="req-category"
          className={selectClassName}
        >
          {Object.entries(requestCategoryLabels).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="r-text">Что случилось</Label>
        <Textarea
          id="r-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          rows={3}
          placeholder="Течёт кран на кухне…"
          data-testid="req-text"
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Фото</Label>
        <PhotoUpload value={photoUrls} onChange={setPhotoUrls} />
      </div>
      <Button type="submit" disabled={loading} data-testid="req-submit">
        {loading ? "Отправляем…" : "Подать заявку"}
      </Button>
      {error && (
        <p role="alert" data-testid="error" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
