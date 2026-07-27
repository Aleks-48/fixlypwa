import { ok, Errors } from "@/lib/http";
import { memberContext } from "@/lib/auth/context";
import { markAnnouncementRead } from "@/lib/comms/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/announcements/[id]/read — житель отмечает объявление прочитанным (features.md блок B).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const done = await markAnnouncementRead(ctx.osiId, id, ctx.auth.user.id);
  if (!done) return Errors.notFound("Объявление");
  return ok({ read: true });
}
