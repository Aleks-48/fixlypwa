import { ok } from "@/lib/http";
import { masterContext } from "@/lib/auth/context";
import { listCityListings } from "@/lib/market/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/master/listings — витрина заказов города мастера (REQ-149, REQ-064).
// JSON-обёртка над listCityListings(), которую до сих пор вызывал только SSR-компонент
// web/src/app/master/page.tsx — мобильному клиенту нужен тот же список в JSON.
//
// ⚠️ Whitelist полей ОБЯЗАТЕЛЕН: listCityListings() возвращает «сырую» строку MarketListing,
// включая osiId/requestId — на сайте эти поля никогда не покидают сервер (page.tsx рендерит
// HTML, не сериализует объект в клиентский бандл), а JSON-роут без явного отбора полей отдал
// бы их мастеру напрямую — прямое нарушение ADR-0009 («ссылка на исходный Request… мастеру
// не отдаётся»).
export async function GET() {
  const ctx = await masterContext();
  if (!ctx.ok) return ctx.response;

  const listings = await listCityListings(ctx.masterId, ctx.city);
  return ok({
    listings: listings.map((l) => ({
      id: l.id,
      category: l.category,
      title: l.title,
      description: l.description,
      photoUrls: l.photoUrls,
      buildingLabel: l.buildingLabel,
      status: l.status,
      publishedAt: l.publishedAt,
    })),
  });
}
