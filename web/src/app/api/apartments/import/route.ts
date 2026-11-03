import { chairmanContext } from "@/lib/auth/context";
import { Errors, ok } from "@/lib/http";
import { getBuilding, importApartments } from "@/lib/onboarding/service";
import { z } from "zod";
const Body = z.object({
  buildingId: z.string().uuid(),
  rows: z.array(z.object({
    number: z.string().trim().min(1).max(30), ownerName: z.string().trim().max(200).optional(),
    ownerPhone: z.string().trim().max(30).optional(), area: z.number().positive().optional(),
    buildingArea: z.number().positive().optional(),
  })).min(1).max(500), buildingArea: z.number().positive().optional(),
});
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  const { buildingId, rows, buildingArea } = parsed.data;
  if (buildingArea || rows.some(row => row.buildingArea)) return Errors.validation("Общая площадь дома пока не поддерживается. Укажите только площади квартир.");
  if (!await getBuilding(ctx.osiId, buildingId)) return Errors.notFound("Дом");
  const result = await importApartments(ctx.osiId, buildingId, rows.map(row => ({
    number: row.number, ownerName: row.ownerName || null, phone: row.ownerPhone || null,
    area: row.area ?? null, iin: null, type: null, accountNumber: null,
  })));
  return ok({ created: result.apartmentsCreated, skipped: result.apartmentsUpdated, errors: [],
    message: "Реестр сохранён. Для доступа жителя используйте приглашение." });
}
