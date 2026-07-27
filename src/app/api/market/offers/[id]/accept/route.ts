import { ok, Errors } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { acceptOffer } from "@/lib/market/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/market/offers/[id]/accept — председатель принимает отклик мастера (REQ-066):
// раскрывает контакт мастеру после ответа (страница сама подтягивает телефон при рендере).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const listing = await acceptOffer(ctx.osiId, id);
  if (!listing) return Errors.validation("Отклик не найден или листинг уже занят/закрыт");

  return ok({ listing: { id: listing.id, status: listing.status } });
}
