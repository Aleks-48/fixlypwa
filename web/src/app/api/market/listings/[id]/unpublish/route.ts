import { ok, Errors } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { unpublishListing } from "@/lib/market/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/market/listings/[id]/unpublish — снять с публикации (только пока PUBLISHED).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const listing = await unpublishListing(ctx.osiId, id);
  if (!listing) return Errors.validation("Листинг не найден или уже не активен");

  return ok({ listing: { id: listing.id, status: listing.status } });
}
