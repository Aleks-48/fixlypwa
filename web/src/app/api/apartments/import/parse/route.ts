import { Errors, ok } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { parseApartmentRegistry } from "@/lib/onboarding/apartmentImport";

export const runtime = "nodejs"; // exceljs — не для edge runtime
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 МБ — реестр в сотни строк укладывается на порядок меньше

// POST /api/apartments/import/parse — предпросмотр реестра помещений (REQ-012 ревизия):
// только разбор файла, БЕЗ записи в БД. Клиент показывает таблицу распознанных строк и
// шлёт их же в /commit после подтверждения председателем.
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Errors.validation("Прикрепите файл реестра (.xlsx)");
  if (file.size > MAX_FILE_BYTES) return Errors.validation("Файл больше 5 МБ");

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await parseApartmentRegistry(buffer);
    return ok(result);
  } catch (err) {
    return Errors.validation(err instanceof Error ? err.message : "Не удалось прочитать файл");
  }
}
