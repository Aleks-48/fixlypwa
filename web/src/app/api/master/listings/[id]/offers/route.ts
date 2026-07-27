import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { masterContext } from "@/lib/auth/context";
import { createOffer } from "@/lib/market/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  message: z.string().trim().min(1, "Напишите сообщение").max(1000),
  price: z.number().positive().max(100_000_000).optional(),
});

// POST /api/master/listings/[id]/offers — мастер откликается на заказ (REQ-065).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await masterContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректно");

  const { id } = await params;
  const result = await createOffer(ctx.masterId, ctx.city, id, parsed.data);
  if (!result.ok) {
    return result.reason === "duplicate"
      ? Errors.validation("Вы уже откликались на этот заказ")
      : Errors.notFound("Заказ");
  }

  return ok({ offer: { id: result.offer.id, status: result.offer.status } }, { status: 201 });
}
