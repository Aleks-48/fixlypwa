"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/apiClient";
import { 
  documentCategoryLabels, 
  documentCategoryOrder, 
} from "@/lib/documents/service";
import type { DocumentCategory } from "@prisma/client";
import { selectClassName } from "@/lib/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function DocumentForm({ buildingId }: { buildingId: string }) {
  // ... весь твой существующий код формы без изменений
  const router = useRouter();
  const [category, setCategory] = useState<DocumentCategory>(
    documentCategoryOrder[0] ?? "OTHER",
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/documents", {
        buildingId,
        category,
        title,
        description: description || undefined,
        fileUrl,
        isPublic,
      });
      setTitle("");
      setDescription("");
      setFileUrl("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при сохранении документа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3.5">
      <h3 className="m-0 text-base font-semibold">Добавить документ</h3>

      <div className="grid gap-1.5">
        <Label htmlFor="doc-category">Категория</Label>
        <select
          id="doc-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as DocumentCategory)}
          data-testid="doc-category"
          className={selectClassName}
        >
          {documentCategoryOrder.map((c) => (
            <option key={c} value={c}>
              {documentCategoryLabels[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="doc-title">Название документа</Label>
        <Input
          id="doc-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="например, Протокол общего собрания № 2"
          data-testid="doc-title"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="doc-url">Ссылка на файл / URL</Label>
        <Input
          id="doc-url"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          required
          placeholder="https://... или /uploads/..."
          data-testid="doc-url"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="doc-desc">Описание (опционально)</Label>
        <Textarea
          id="doc-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Краткое содержание или примечание"
          data-testid="doc-desc"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="doc-public"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          data-testid="doc-public"
          className="h-4 w-4 rounded border-border"
        />
        <Label htmlFor="doc-public" className="cursor-pointer text-sm font-normal">
          Доступен жителям дома
        </Label>
      </div>

      <Button type="submit" disabled={loading} data-testid="doc-submit">
        {loading ? "Сохраняем…" : "Загрузить документ"}
      </Button>

      {error && (
        <p role="alert" data-testid="error" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
