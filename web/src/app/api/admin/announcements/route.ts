import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { adminContext } from "@/lib/auth/context";
import { deleteAnnouncementAdmin } from "@/lib/admin/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  osiId: z.string().uuid(),
  announcementId: z.string().uuid(),
});

// DELETE /api/admin/announcements — административное удаление объявления (REQ-110).
export async function DELETE(req: Request) {
  const ctx = await adminContext();
  if (!ctx.ok) return ctx.response;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Errors.validation("Некорректные данные для удаления");

  const success = await deleteAnnouncementAdmin(ctx.auth.user.id, parsed.data.osiId, parsed.data.announcementId);
  if (!success) return Errors.validation("Объявление не найдено в этой ОСИ");

  return ok({ deleted: true });
}
