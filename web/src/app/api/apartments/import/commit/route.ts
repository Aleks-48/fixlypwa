import { z } from "zod";
import { Errors, ok } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { importApartments, OnboardingError } from "@/lib/onboarding/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Row = z.object({
  number: z.string().min(1),
  ownerName: z.string().min(1).nullable(),
  iin: z.string().nullable(),
  phone: z.string().nullable(),
  type: z.enum(["RESIDENTIAL", "NON_RESIDENTIAL", "PARKING", "STORAGE"]).nullable(),
  accountNumber: z.string().nullable(),
  area: z.number().positive().nullable(),
});

const Body = z.object({
  buildingId: z.string().uuid(),
  rows: z.array(Row).min(1, "Нет строк для импорта"),
});

// POST /api/apartments/import/commit — записать разобранные строки (REQ-012 ревизия): те
// же rows, что вернул /parse (клиент их не меняет между шагами, только показывает
// предпросмотр). Идемпотентно — повторный commit тем же набором обновляет, не дублирует.
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  try {
    const summary = await importApartments(ctx.osiId, parsed.data.buildingId, parsed.data.rows);
    return ok(summary);
  } catch (err) {
    if (err instanceof OnboardingError) return Errors.notFound("Дом");
    throw err;
  }
}
