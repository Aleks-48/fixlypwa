import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { memberContext } from "@/lib/auth/context";
import { hasRole } from "@/lib/auth/guards";
import { createRequest, getOccupantBuilding, listRequests } from "@/lib/comms/service";
import { UPLOAD_URL_RE } from "@/lib/uploads/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  category: z.enum(["PLUMBING", "ELEVATOR", "CLEANING", "ELECTRICITY", "OTHER"]),
  text: z.string().min(1, "Опишите проблему").max(2000),
  // Только наши же загруженные файлы (POST /api/uploads) — не принимаем произвольные URL.
  photoUrls: z.array(z.string().regex(UPLOAD_URL_RE)).max(5).optional(),
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

// GET /api/requests — СВОИ заявки текущего пользователя (мобильный клиент, срез 22); фильтр
// по authorUserId. GET /api/requests?scope=building — REQ-144, ТОЛЬКО для CHAIRMAN/SUPERADMIN
// активной ОСИ: все заявки ОСИ (chairman_home_shell, срез R2), без фильтра по автору. Житель
// с этим параметром получает свои же — параметр не даёт прав, только сужает/расширяет ЕГО
// собственную область (REQ-безопасность: без роли — 403 через memberContext, как и раньше).
export async function GET(req: Request) {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;

  const scope = new URL(req.url).searchParams.get("scope");
  const isChairman = hasRole(ctx.auth, ctx.osiId, "CHAIRMAN", "SUPERADMIN");

  const requests = await listRequests(
    ctx.osiId,
    scope === "building" && isChairman ? {} : { authorUserId: ctx.auth.user.id },
  );
  return ok({ requests });
}
