import { ok, Errors } from "@/lib/http";
import { getCurrentAuth } from "@/lib/auth/session";
import { isAllowedImageMime, saveUploadedImage } from "@/lib/uploads/service";

export const runtime = "nodejs"; // sharp — нативный биндинг, недоступен в edge runtime
export const dynamic = "force-dynamic";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 МБ — исходник с телефона до пересжатия

// POST /api/uploads — фото к заявке (REQ-070, marketplace.md M3). Требует вход (жителя ИЛИ
// мастера — любой аутентифицированный пользователь: сами файлы не tenant-данные, привязка
// к заявке/анкете происходит отдельным полем на стороне вызывающего эндпоинта).
export async function POST(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const form = await req.formData().catch(() => null);
  if (!form) return Errors.validation("Ожидался multipart/form-data");

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return Errors.validation("Прикрепите хотя бы один файл");
  if (files.length > MAX_FILES) return Errors.validation(`Максимум ${MAX_FILES} файлов`);

  for (const file of files) {
    if (!isAllowedImageMime(file.type)) {
      return Errors.validation(`Неподдерживаемый тип файла: ${file.type || "неизвестно"}`);
    }
    if (file.size > MAX_FILE_BYTES) {
      return Errors.validation(`Файл ${file.name} больше 5 МБ`);
    }
  }

  try {
    const urls = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return saveUploadedImage(buffer, file.type);
      }),
    );
    return ok({ urls });
  } catch {
    // Битый/повреждённый файл — sharp бросает при декодировании.
    return Errors.validation("Не удалось обработать изображение — попробуйте другой файл");
  }
}
