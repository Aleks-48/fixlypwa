import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { memberContext } from "@/lib/auth/context";
import { createRequest, getOccupantBuilding } from "@/lib/comms/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  category: z.enum(["PLUMBING", "ELEVATOR", "CLEANING", "ELECTRICITY", "OTHER"]),
  text: z.string().min(1, "Опишите проблему").max(2000),
  // Только наши же загруженные файлы (POST /api/uploads) — не принимаем произвольные URL.
  photoUrls: z.array(z.string().regex(/^\/uploads\/[\w.-]+$/)).max(5).optional(),
});

// POST /api/requests — житель подаёт заявку (features.md блок B, официальный след вместо WhatsApp).
export async function POST(req: Request) {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  // Дом жителя определяется по привязке к квартире, не берётся из ввода.
  const occ = await getOccupantBuilding(ctx.osiId, ctx.auth.user.id);
  if (!occ?.apartment) {
    return Errors.validation("Вы не привязаны к квартире — обратитесь к председателю");
  }

  const request = await createRequest(ctx.osiId, {
    buildingId: occ.apartment.buildingId,
    apartmentId: occ.apartmentId,
    authorUserId: ctx.auth.user.id,
    category: parsed.data.category,
    text: parsed.data.text,
    photoUrls: parsed.data.photoUrls,
  });
  return ok({ request: { id: request.id, status: request.status } }, { status: 201 });
}
