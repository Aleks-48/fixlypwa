import { getCurrentAuth } from "@/lib/auth/session";
import { Errors,ok } from "@/lib/http";
import {
isAllowedAudioMime,
isAllowedImageMime,
saveUploadedAudio,
saveUploadedImage,
} from "@/lib/uploads/service";
import { randomUUID } from "node:crypto";
import { writePrivateUpload } from "@/lib/uploads/private";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 МБ

const ALLOWED_DOC_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
];

export async function POST(req: Request) {
  try {
    const auth = await getCurrentAuth();
    if (!auth) return Errors.unauthorized();

    const form = await req.formData().catch(() => null);
    if (!form) return Errors.validation("Ожидался multipart/form-data");

    // Поддерживаем и 'files', и 'file'
    const files = [
      ...form.getAll("files"),
      ...form.getAll("file"),
    ].filter((f): f is File => f instanceof File);

    if (files.length === 0) return Errors.validation("Прикрепите хотя бы один файл");
    if (files.length > MAX_FILES) return Errors.validation(`Максимум ${MAX_FILES} файлов`);

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        return Errors.validation(`Файл ${file.name} больше 15 МБ`);
      }
    }

    const urls = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());

        // 1. Изображения — сжимаем через Sharp
        if (isAllowedImageMime(file.type)) {
          return saveUploadedImage(buffer, file.type, auth.user.id);
        }

        // 2. Аудио-вложения (голосовые сообщения, mobile-app.md §6 REQ-131)
        if (isAllowedAudioMime(file.type)) {
          return saveUploadedAudio(buffer, file.type, auth.user.id);
        }

        // 3. Документы (PDF, DOCX и др.)
        const ext = path.extname(file.name).toLowerCase() || ".pdf";
        if (!ALLOWED_DOC_EXTENSIONS.includes(ext)) {
          throw new Error(`Формат ${ext} не поддерживается`);
        }

        return writePrivateUpload(`docs/${randomUUID()}${ext}`, buffer, auth.user.id);
      }),
    );

    return ok({ urls });
  } catch (caughtError) {
const err = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

    console.error("Upload error:", err);
    return Errors.validation(err?.message || "Не удалось сохранить файл на сервере");
  }
}
