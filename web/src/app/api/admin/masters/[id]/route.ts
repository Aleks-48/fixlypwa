import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { adminContext } from "@/lib/auth/context";
import { setMasterStatus } from "@/lib/admin/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "BLOCKED"]),
});

// PATCH /api/admin/masters/[id] — смена статуса анкеты мастера (REQ-114, закрывает Q-053).
// Гейт adminContext (REQ-110); мутация журналируется в AdminAuditLog внутри сервиса.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await adminContext();
  if (!ctx.ok) return ctx.response;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Errors.validation("Некорректный статус");

  const { id } = await params;
  const master = await setMasterStatus(ctx.auth.user.id, id, parsed.data.status);
  if (!master) return Errors.validation("Анкета мастера не найдена");

  return ok({ master: { id: master.id, status: master.status } });
}
