"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";

const MAX_FILES = 5;

// Загрузка фото к заявке (marketplace.md M3) — контролируемый компонент: value/onChange те же
// URL, что уходят в POST /api/requests как photoUrls. Файлы отправляются на /api/uploads сразу
// при выборе (не ждём отправки формы) — так пользователь видит миниатюры до сабмита.
export function PhotoUpload({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = value.length >= MAX_FILES;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const room = MAX_FILES - value.length;
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) {
      setError(`Можно прикрепить не больше ${MAX_FILES} фото — добавлены первые ${room}`);
    }

    const form = new FormData();
    for (const file of picked) form.append("files", file);

    setUploading(true);
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const json = (await res.json().catch(() => null)) as
        | { data?: { urls: string[] }; error?: { message?: string } }
        | null;
      if (!res.ok) throw new Error(json?.error?.message ?? "Не удалось загрузить фото");
      onChange([...value, ...(json?.data?.urls ?? [])]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="grid gap-2.5">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2.5">
          {value.map((url) => (
            <div key={url} className="group relative size-20 shrink-0 overflow-hidden rounded-xl border border-border">
              {/* Фото пользователя — обычный img, не next/image (внешний путь /uploads, не оптимизируем) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Фото заявки" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => remove(url)}
                aria-label="Удалить фото"
                data-testid="photo-remove"
                className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X aria-hidden size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!full && (
        <label
          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-border px-4 py-5 text-center text-muted-foreground transition-colors hover:border-primary ${
            uploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={uploading}
            onChange={(e) => handleFiles(e.target.files)}
            data-testid="photo-input"
            className="sr-only"
          />
          <span className="flex size-10 items-center justify-center rounded-xl bg-secondary">
            {uploading ? (
              <Loader2 aria-hidden size={19} className="animate-spin" />
            ) : (
              <Camera aria-hidden size={19} />
            )}
          </span>
          <span className="text-sm font-semibold text-foreground">
            {uploading ? "Загружаем…" : "Прикрепить фото"}
          </span>
          <span className="text-xs">до {MAX_FILES} файлов, JPEG/PNG/WEBP</span>
        </label>
      )}

      {error && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
