import { ok, Errors } from "@/lib/http";
import { memberContext } from "@/lib/auth/context";
import { hasRole } from "@/lib/auth/guards";
import { getRequestWithMessages } from "@/lib/comms/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/requests/[id] — заявка + тред (мобильный клиент, срез 22). Приватность треда —
// та же проверка, что у POST .../messages (REQ-003): автор заявки или председатель.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const request = await getRequestWithMessages(ctx.osiId, id);
  if (!request) return Errors.notFound("Заявка");

  const isChairman = hasRole(ctx.auth, ctx.osiId, "CHAIRMAN", "SUPERADMIN");
  if (!isChairman && request.authorUserId !== ctx.auth.user.id) {
    return Errors.forbidden();
  }

  return ok({ request });
}
