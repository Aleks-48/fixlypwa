import { ok } from "@/lib/http";
import { masterContext } from "@/lib/auth/context";
import { listMyOffers } from "@/lib/market/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/master/offers — мои отклики (REQ-150, REQ-065). JSON-обёртка над listMyOffers(),
// той же вкладкой «Мои отклики», что уже есть на сайте (web/src/app/master/page.tsx).
// Whitelist той же дисциплины, что у /api/master/listings — вложенный listing тоже «сырой»
// Prisma-объект с osiId/requestId, которые мастеру не отдаются (ADR-0009).
export async function GET() {
  const ctx = await masterContext();
  if (!ctx.ok) return ctx.response;

  const offers = await listMyOffers(ctx.masterId, ctx.city);
  return ok({
    offers: offers.map((o) => ({
      id: o.id,
      listingId: o.listingId,
      message: o.message,
      price: o.price,
      status: o.status,
      createdAt: o.createdAt,
      listing: o.listing
        ? {
            id: o.listing.id,
            category: o.listing.category,
            title: o.listing.title,
            buildingLabel: o.listing.buildingLabel,
            status: o.listing.status,
          }
        : null,
    })),
  });
}
