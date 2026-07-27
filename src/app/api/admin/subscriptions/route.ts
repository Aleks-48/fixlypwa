import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { adminContext } from "@/lib/auth/context";
import { setSubscription } from "@/lib/admin/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  osiId: z.string().uuid(),
  buildingId: z.string().uuid(),
  status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"]),
  periodStart: z.coerce.date().optional(),
  // null явно очищает дату окончания (бессрочная), undefined — не трогать.
  periodEnd: z.coerce.date().nullable().optional(),
});

// PUT /api/admin/subscriptions — upsert подписки дома (REQ-111, Q-009: единица — дом).
// Принадлежность дома ОСИ доказывается чтением внутри forTenant в сервисе (не доверяем вводу).
export async function PUT(req: Request) {
  const ctx = await adminContext();
  if (!ctx.ok) return ctx.response;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Errors.validation("Некорректные данные подписки");

  const sub = await setSubscription(ctx.auth.user.id, parsed.data);
  if (!sub) return Errors.validation("Дом не найден в этой ОСИ");

  return ok({ subscription: { id: sub.id, buildingId: sub.buildingId, status: sub.status } });
}
