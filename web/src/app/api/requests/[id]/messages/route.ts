import { memberContext } from "@/lib/auth/context";
import { hasRole } from "@/lib/auth/guards";
import { addRequestMessage,getRequestWithMessages } from "@/lib/comms/service";
import { Errors,ok } from "@/lib/http";
import { UPLOAD_URL_RE } from "@/lib/uploads/service";
import { canReadUpload } from "@/lib/uploads/private";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// audioUrl/imageUrl — вложения мобильного клиента (mobile-app.md §4 REQ-131), ссылки на уже
// загруженные через /api/uploads файлы. audioUrl: /uploads/audio/*.webm|ogg|m4a
// imageUrl: /uploads/*.webp. UPLOAD_URL_RE покрывает оба пути.
const Body = z.object({
  text: z.string().max(2000).optional().default(""),
  audioUrl: z.string().regex(UPLOAD_URL_RE).nullable().optional(),
  imageUrl: z.string().regex(UPLOAD_URL_RE).nullable().optional(),
}).refine((data) => (data.text && data.text.trim().length > 0) || Boolean(data.audioUrl) || Boolean(data.imageUrl), {
  message: "Сообщение или вложение не должно быть пустым",
});

// POST /api/requests/[id]/messages — сообщение в тред заявки. Автор заявки или председатель.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  const { id } = await params;
  for (const url of [parsed.data.audioUrl, parsed.data.imageUrl]) {
    if (url && !await canReadUpload(ctx.auth, url)) return Errors.forbidden("Файл недоступен");
  }
  const request = await getRequestWithMessages(ctx.osiId, id);
  if (!request) return Errors.notFound("Заявка");

  // Приватность треда: писать может автор заявки, назначенный мастер или председатель
  const isChairman = hasRole(ctx.auth, ctx.osiId, "CHAIRMAN", "SUPERADMIN");
  const isAuthor = request.authorUserId === ctx.auth.user.id;
  const assignedMaster = request.masterId ? await prisma.master.findUnique({ where: { id: request.masterId }, select: { userId: true } }) : null;
  const isAssignedMaster = assignedMaster?.userId === ctx.auth.user.id;

  if (!isChairman && !isAuthor && !isAssignedMaster) {
    return Errors.forbidden();
  }

  const text = parsed.data.text.trim() || (parsed.data.audioUrl ? "🎤 Голосовое сообщение" : "Вложение");

  const msg = await addRequestMessage(ctx.osiId, id, ctx.auth.user.id, text, {
    audioUrl: parsed.data.audioUrl ?? undefined,
    imageUrl: parsed.data.imageUrl ?? undefined,
  });
  if (!msg) return Errors.notFound("Заявка");
  return ok({ message: { id: msg.id } }, { status: 201 });
}
