import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { memberContext } from "@/lib/auth/context";
import { hasRole } from "@/lib/auth/guards";
import { addRequestMessage, getRequestWithMessages } from "@/lib/comms/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ text: z.string().min(1, "Пустое сообщение").max(2000) });

// POST /api/requests/[id]/messages — сообщение в тред заявки. Автор заявки или председатель.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  const { id } = await params;
  const request = await getRequestWithMessages(ctx.osiId, id);
  if (!request) return Errors.notFound("Заявка");

  // Приватность треда: писать может автор заявки или председатель (REQ-003).
  const isChairman = hasRole(ctx.auth, ctx.osiId, "CHAIRMAN", "SUPERADMIN");
  if (!isChairman && request.authorUserId !== ctx.auth.user.id) {
    return Errors.forbidden();
  }

  const msg = await addRequestMessage(ctx.osiId, id, ctx.auth.user.id, parsed.data.text);
  if (!msg) return Errors.notFound("Заявка");
  return ok({ message: { id: msg.id } }, { status: 201 });
}
