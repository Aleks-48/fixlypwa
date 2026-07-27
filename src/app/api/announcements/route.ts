import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { createAnnouncement } from "@/lib/comms/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  buildingId: z.string().uuid(),
  title: z.string().min(1, "Заголовок обязателен").max(200),
  body: z.string().min(1, "Текст обязателен"),
  isPinned: z.boolean().optional(),
});

// POST /api/announcements — председатель публикует объявление дома (features.md блок B).
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  const ann = await createAnnouncement(ctx.osiId, {
    ...parsed.data,
    authorUserId: ctx.auth.user.id,
  });
  return ok({ announcement: { id: ann.id, title: ann.title } }, { status: 201 });
}
