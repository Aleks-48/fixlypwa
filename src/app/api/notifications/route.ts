import { ok } from "@/lib/http";
import { memberContext } from "@/lib/auth/context";
import { listNotifications, getUnreadCount } from "@/lib/notifications/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/notifications — лента + счётчик непрочитанных текущего пользователя (REQ-100).
export async function GET() {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;

  const [notifications, unread] = await Promise.all([
    listNotifications(ctx.osiId, ctx.auth.user.id),
    getUnreadCount(ctx.osiId, ctx.auth.user.id),
  ]);
  return ok({ notifications, unread });
}
