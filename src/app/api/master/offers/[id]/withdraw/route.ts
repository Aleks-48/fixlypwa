import { ok, Errors } from "@/lib/http";
import { masterContext } from "@/lib/auth/context";
import { withdrawOffer } from "@/lib/market/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/master/offers/[id]/withdraw — мастер отзывает свой отклик (пока не принят/отклонён).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await masterContext();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const offer = await withdrawOffer(ctx.masterId, ctx.city, id);
  if (!offer) return Errors.validation("Отклик не найден или его уже нельзя отозвать");

  return ok({ offer: { id: offer.id, status: offer.status } });
}
