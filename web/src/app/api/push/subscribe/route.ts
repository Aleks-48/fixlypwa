import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { getCurrentAuth } from "@/lib/auth/session";
import { savePushSubscription, removePushSubscription } from "@/lib/notifications/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Формат subscription.toJSON() из браузера (Push API).
const SubBody = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

const DelBody = z.object({ endpoint: z.string().url() });

// POST /api/push/subscribe — сохранить push-подписку устройства (REQ-102).
// Достаточно входа (не memberContext): подписка — identity, привязана к пользователю.
export async function POST(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const parsed = SubBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation("Некорректная подписка");

  await savePushSubscription(
    auth.user.id,
    parsed.data,
    req.headers.get("user-agent"),
  );
  return ok({ subscribed: true }, { status: 201 });
}

// DELETE /api/push/subscribe — удалить подписку по endpoint (тумблер выключен, REQ-104).
export async function DELETE(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const parsed = DelBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation("Некорректный endpoint");

  await removePushSubscription(parsed.data.endpoint);
  return ok({ unsubscribed: true });
}
