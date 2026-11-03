import { memberContext } from "@/lib/auth/context";
import { forTenant } from "@/lib/db/tenant";
import { Errors } from "@/lib/http";
import { addMasterReview } from "@/lib/masters/reviewService";
import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";

// POST /api/masters/review
// Body: { masterId, requestId, rating, comment? }
export async function POST(req: NextRequest) {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;
  const { auth, osiId } = ctx;
  const parsed = z.object({
    masterId: z.string().uuid(), requestId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(4000).optional(),
    photoUrls: z.array(z.string().max(2048)).max(10).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation("Проверьте заявку, мастера и оценку от 1 до 5");
  const { masterId, requestId, rating, comment, photoUrls } = parsed.data;

  if (!masterId || !requestId || !rating) {
    return NextResponse.json(
      { error: "masterId, requestId, rating обязательны" },
      { status: 400 },
    );
  }

  // Проверяем, что заявка принадлежит жителю и имеет статус RESOLVED
  const request = await forTenant(osiId, (tx) => tx.request.findUnique({
    where: { id: requestId },
    select: { authorUserId: true, status: true, masterId: true },
  }));

  if (!request) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }
  if (request.authorUserId !== auth.user.id) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  if (request.status !== "RESOLVED") {
    return NextResponse.json(
      { error: "Оценку можно оставить только после закрытия заявки" },
      { status: 400 },
    );
  }
  if (request.masterId !== masterId) {
    return NextResponse.json(
      { error: "Мастер не совпадает с заявкой" },
      { status: 400 },
    );
  }

  try {
    await addMasterReview({
      osiId,
      masterId,
      authorUserId: auth.user.id,
      requestId,
      rating: Number(rating),
      comment,
      photoUrls,
    });
    return NextResponse.json({ ok: true });
  } catch (caughtError) {
const err = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

    return NextResponse.json({ error: err.message }, { status: 409 });
  }
}
