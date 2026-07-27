import "server-only";
import { prisma } from "@/lib/db/prisma";
import { forTenant } from "@/lib/db/tenant";
import { forMaster } from "@/lib/db/master";

// Сервис маркетплейса заявок (ADR-0009, marketplace.md). Председатель работает через
// forTenant (свой listing/офферы своей ОСИ); мастер — через forMaster (чужие тенанты не
// видны, только PUBLISHED своего города + свои офферы). НИКОГДА не путать контексты.

// ---------------- Председатель ----------------

export function getListingByRequestId(osiId: string, requestId: string) {
  return forTenant(osiId, (tx) => tx.marketListing.findUnique({ where: { requestId } }));
}

// Листинги пачкой по списку заявок (страница «Заявки дома») — один запрос вместо N+1.
export function getListingsByRequestIds(osiId: string, requestIds: string[]) {
  return forTenant(osiId, (tx) =>
    tx.marketListing.findMany({ where: { requestId: { in: requestIds } } }),
  );
}

export type PublishListingInput = {
  title: string;
  description: string;
  photoUrls: string[];
};

// Публикация заявки мастерам (REQ-063) — whitelist-копия полей (ADR-0009 вариант C): НИКОГДА
// не копировать квартиру/ФИО/телефон жителя. city/buildingLabel — из Building, НЕ из ввода.
// Идемпотентно: повторная публикация обновляет уже существующий листинг (если не TAKEN).
export async function publishListing(osiId: string, requestId: string, input: PublishListingInput) {
  return forTenant(osiId, async (tx) => {
    const request = await tx.request.findUnique({
      where: { id: requestId },
      select: { id: true, buildingId: true, category: true },
    });
    if (!request) return null;

    const building = await tx.building.findUnique({
      where: { id: request.buildingId },
      select: { address: true, city: true },
    });
    if (!building) return null;

    const existing = await tx.marketListing.findUnique({ where: { requestId } });
    if (existing?.status === "TAKEN") return null; // отклик уже принят — публиковать заново нельзя

    return tx.marketListing.upsert({
      where: { requestId },
      create: {
        osiId,
        requestId,
        city: building.city,
        category: request.category,
        title: input.title,
        description: input.description,
        photoUrls: input.photoUrls,
        buildingLabel: building.address,
        status: "PUBLISHED",
      },
      update: {
        title: input.title,
        description: input.description,
        photoUrls: input.photoUrls,
        status: "PUBLISHED",
        closedAt: null,
      },
    });
  });
}

// Снять с публикации (только пока не принят отклик — после TAKEN снимается автоматически acceptOffer).
export function unpublishListing(osiId: string, listingId: string) {
  return forTenant(osiId, async (tx) => {
    const listing = await tx.marketListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.status !== "PUBLISHED") return null;
    return tx.marketListing.update({
      where: { id: listingId },
      data: { status: "CLOSED", closedAt: new Date() },
    });
  });
}

export type OfferWithMaster = {
  id: string;
  message: string;
  price: string | null;
  status: string;
  createdAt: Date;
  master: { id: string; fullName: string; city: string; phone: string | null };
};

// Отклики на листинг + данные мастера. Master — identity-таблица (вне RLS, обычный prisma);
// ТЕЛЕФОН отдаём ТОЛЬКО для принятого отклика (marketplace.md §4 — приватность до принятия
// касается и обратного направления: председатель не должен видеть контакт мастера заранее,
// это не обязательно, но раскрытие "по запросу, а не по умолчанию" — более безопасный дефолт).
export async function listOffersWithMasters(osiId: string, listingId: string): Promise<OfferWithMaster[]> {
  const offers = await forTenant(osiId, (tx) =>
    tx.marketOffer.findMany({ where: { listingId }, orderBy: { createdAt: "asc" } }),
  );
  if (offers.length === 0) return [];

  const masterIds = [...new Set(offers.map((o) => o.masterId))];
  const masters = await prisma.master.findMany({
    where: { id: { in: masterIds } },
    select: { id: true, fullName: true, city: true, userId: true },
  });
  const users = await prisma.user.findMany({
    where: { id: { in: masters.map((m) => m.userId) } },
    select: { id: true, phone: true },
  });
  const phoneByUserId = new Map(users.map((u) => [u.id, u.phone]));
  const masterById = new Map(masters.map((m) => [m.id, m]));

  return offers.map((o) => {
    const m = masterById.get(o.masterId);
    const revealPhone = o.status === "ACCEPTED";
    return {
      id: o.id,
      message: o.message,
      price: o.price ? o.price.toString() : null,
      status: o.status,
      createdAt: o.createdAt,
      master: {
        id: m?.id ?? o.masterId,
        fullName: m?.fullName ?? "Мастер",
        city: m?.city ?? "",
        phone: revealPhone ? (phoneByUserId.get(m?.userId ?? "") ?? null) : null,
      },
    };
  });
}

// Принять отклик (REQ-066): выбранный → ACCEPTED, остальные OFFERED → DECLINED, листинг → TAKEN.
// listingId выводится из самого оффера — вызывающему достаточно знать offerId.
export async function acceptOffer(osiId: string, offerId: string) {
  return forTenant(osiId, async (tx) => {
    const offer = await tx.marketOffer.findUnique({ where: { id: offerId } });
    if (!offer) return null;

    const listing = await tx.marketListing.findUnique({ where: { id: offer.listingId } });
    if (!listing || listing.status !== "PUBLISHED") return null;

    await tx.marketOffer.updateMany({
      where: { listingId: offer.listingId, status: "OFFERED", id: { not: offerId } },
      data: { status: "DECLINED" },
    });
    await tx.marketOffer.update({ where: { id: offerId }, data: { status: "ACCEPTED" } });
    return tx.marketListing.update({ where: { id: offer.listingId }, data: { status: "TAKEN" } });
  });
}

// ---------------- Мастер ----------------

// Витрина заказов города мастера (REQ-064). RLS (market_read) уже фильтрует PUBLISHED+city —
// явный where здесь не обязателен, но не помешает читаемости.
export function listCityListings(masterId: string, city: string) {
  return forMaster(masterId, city, (tx) =>
    tx.marketListing.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } }),
  );
}

// Мои отклики (REQ-065). Листинг может стать невидимым (TAKEN/CLOSED, город/RLS) к моменту
// просмотра — тогда listing будет null; отдельные запросы вместо include, чтобы не зависеть
// от того, как Prisma спускает join под RLS (см. marketplace.md §3а про forMaster-контекст).
export async function listMyOffers(masterId: string, city: string) {
  return forMaster(masterId, city, async (tx) => {
    const offers = await tx.marketOffer.findMany({
      where: { masterId },
      orderBy: { createdAt: "desc" },
    });
    const listingIds = [...new Set(offers.map((o) => o.listingId))];
    const listings = await tx.marketListing.findMany({ where: { id: { in: listingIds } } });
    const byId = new Map(listings.map((l) => [l.id, l]));
    return offers.map((o) => ({ ...o, listing: byId.get(o.listingId) ?? null }));
  });
}

export type CreateOfferInput = { message: string; price?: number };

// Отклик на заказ (REQ-065). osiId ОБЯЗАТЕЛЬНО берётся из уже прочитанного listing (видимость
// которого проверена той же RLS-транзакцией) — НЕ из клиентского ввода (marketplace.md §3а):
// иначе мастер мог бы подставить чужой osiId в MarketOffer и нарушить изоляцию тенантов.
export async function createOffer(masterId: string, city: string, listingId: string, input: CreateOfferInput) {
  return forMaster(masterId, city, async (tx) => {
    const listing = await tx.marketListing.findFirst({ where: { id: listingId, status: "PUBLISHED" } });
    if (!listing) return { ok: false as const, reason: "not_found" as const };

    try {
      const offer = await tx.marketOffer.create({
        data: {
          osiId: listing.osiId,
          listingId,
          masterId,
          message: input.message,
          price: input.price,
        },
      });
      return { ok: true as const, offer };
    } catch {
      // @@unique([listingId, masterId]) — повторный отклик на тот же листинг.
      return { ok: false as const, reason: "duplicate" as const };
    }
  });
}

export function withdrawOffer(masterId: string, city: string, offerId: string) {
  return forMaster(masterId, city, async (tx) => {
    const offer = await tx.marketOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.masterId !== masterId || offer.status !== "OFFERED") return null;
    return tx.marketOffer.update({ where: { id: offerId }, data: { status: "WITHDRAWN" } });
  });
}
