import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { setRequestStatus } from "@/lib/comms/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ status: z.enum(["RECEIVED", "IN_PROGRESS", "RESOLVED"]) });

// POST /api/requests/[id]/status — председатель меняет статус заявки (принята→в работе→решена).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation("Некорректный статус");

  const { id } = await params;
  const updated = await setRequestStatus(ctx.osiId, id, parsed.data.status);
  if (!updated) return Errors.notFound("Заявка");
  return ok({ request: { id: updated.id, status: updated.status } });
}
