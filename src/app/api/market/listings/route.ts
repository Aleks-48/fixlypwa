import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { publishListing } from "@/lib/market/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  requestId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(1).max(2000),
  photoUrls: z.array(z.string().regex(/^\/uploads\/[\w.-]+$/)).max(5).optional(),
});

// POST /api/market/listings — председатель публикует заявку мастерам (REQ-063). Whitelist-поля
// (title/description/photoUrls) редактируются в предпросмотре; city/адрес — из Building на сервере.
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректно");

  const listing = await publishListing(ctx.osiId, parsed.data.requestId, {
    title: parsed.data.title,
    description: parsed.data.description,
    photoUrls: parsed.data.photoUrls ?? [],
  });
  if (!listing) return Errors.validation("Заявка не найдена или отклик уже принят");

  return ok({ listing: { id: listing.id, status: listing.status } }, { status: 201 });
}
