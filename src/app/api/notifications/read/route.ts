import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { memberContext } from "@/lib/auth/context";
import { markRead } from "@/lib/notifications/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ id: z.string().uuid().optional() });

// POST /api/notifications/read — отметить прочитанным: { id } — одно, {} — все (REQ-100).
// markRead фильтрует по userId текущего пользователя — чужое уведомление не пометить.
export async function POST(req: Request) {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Errors.validation("Некорректный id");

  const count = await markRead(ctx.osiId, ctx.auth.user.id, parsed.data.id);
  return ok({ marked: count });
}
