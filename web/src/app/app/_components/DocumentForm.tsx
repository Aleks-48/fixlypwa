"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { documentCategoryLabels } from "@/lib/documents/service";
import type { DocumentCategory } from "@prisma/client";
import { FileText,Loader2,Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DocumentForm({ buildingId }: { buildingId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("PROTOCOL");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!file) {
    alert("Выберите файл для загрузки");
    return;
  }

  setIsSubmitting(true);

  try {
    const formData = new FormData();
    formData.append("files", file);

    const uploadRes = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    });

    // Безопасно получаем текст ответа, чтобы избежать падения res.json()
    const rawText = await uploadRes.text();
    let resData: { data?: { urls?: string[] }; urls?: string[]; error?: string | { message?: string }; message?: string } = {};
    
    try {
      resData = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw new Error(`Ошибка сервера (${uploadRes.status}): Некорректный ответ`);
    }

    if (!uploadRes.ok || resData.error) {
      throw new Error((typeof resData.error === "string" ? resData.error : resData.error?.message) || resData.message || "Ошибка при загрузке файла");
    }

    // Извлекаем URL загруженного файла
    const fileUrl = resData.data?.urls?.[0] || resData.urls?.[0];

    if (!fileUrl) {
      throw new Error("Сервер не вернул ссылку на файл");
    }

    // Сохраняем информацию о документе в реестр
    const docRes = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        category,
        description,
        isPublic,
        fileUrl,
        fileType: file.type,
        buildingId,
      }),
    });

    if (!docRes.ok) {
      const docErrText = await docRes.text();
      let docErr: { error?: string | { message?: string } } = {};
      try { docErr = JSON.parse(docErrText); } catch {}
      throw new Error((typeof docErr.error === "string" ? docErr.error : docErr.error?.message) || "Не удалось сохранить запись в библиотеку");
    }

    // Сброс формы после успешного сохранения
    setTitle("");
    setDescription("");
    setFile(null);
    router.refresh();
  } catch (caughtError) {
const err = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

    alert(err.message || "Произошла ошибка при сохранении");
  } finally {
    setIsSubmitting(false);
  }
}

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-base font-semibold">Добавить документ</h3>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Категория</label>
        <Select
          value={category}
          onValueChange={(val) => setCategory(val as DocumentCategory)}
        >
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Выберите категорию" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(documentCategoryLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Название документа
        </label>
        <Input
          placeholder="например, Протокол общего собрания № 2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="rounded-xl"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Файл (PDF, Изображение, DOC)
        </label>
        <Input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
          className="rounded-xl cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20"
        />
        {file && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
            <FileText size={12} /> Выбран файл: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Описание (опционально)
        </label>
        <Textarea
          placeholder="Краткое содержание или примечание"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="rounded-xl"
        />
      </div>

      {/* Нативный Checkbox со строгой типизацией */}
      <div className="flex items-center space-x-2 pt-1">
        <input
          type="checkbox"
          id="isPublic"
          checked={isPublic}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsPublic(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
        />
        <label htmlFor="isPublic" className="text-xs font-medium cursor-pointer text-muted-foreground select-none">
          Доступен жителям дома
        </label>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl gap-2 mt-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Загрузка файла...</span>
          </>
        ) : (
          <>
            <Upload size={16} />
            <span>Загрузить документ</span>
          </>
        )}
      </Button>
    </form>
  );
}
