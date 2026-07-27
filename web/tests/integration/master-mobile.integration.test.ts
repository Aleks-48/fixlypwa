import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getMasterByUserId } from "@/lib/master/service";
import { listCityListings, listMyOffers, createOffer } from "@/lib/market/service";

// Мобильный клиент (срез 25, marketplace.md §6, REQ-148..150): новые GET-роуты — тонкие
// обёртки над уже протестированными RLS-сервисами (см. marketplace.integration.test.ts —
// там доказана изоляция по городу/тенанту). Здесь — только форма ответа, которую отдадут
// новые роуты (getMasterByUserId для /api/master/me, которая раньше нигде явно не проверялась).
const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const TAG = `mkt-mobile-test-${Date.now()}`;
const uniqPhone = () => `+7778${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

let osi = "";
let building = "";
let masterId = "";
let masterUserId = "";
let listingId = "";

beforeAll(async () => {
  const chair = await admin.user.create({ data: { phone: uniqPhone() } });
  const masterUser = await admin.user.create({ data: { phone: uniqPhone() } });
  masterUserId = masterUser.id;

  const o = await admin.osi.create({ data: { name: `${TAG}-osi` } });
  osi = o.id;
  const b = await admin.building.create({
    data: { osiId: osi, address: `${TAG}-дом`, city: "Кокшетау" },
  });
  building = b.id;
  const req = await admin.request.create({
    data: { osiId: osi, buildingId: building, authorUserId: chair.id, category: "PLUMBING", text: `${TAG} заявка` },
  });
  const listing = await admin.marketListing.create({
    data: {
      osiId: osi,
      requestId: req.id,
      city: "Кокшетау",
      category: "PLUMBING",
      title: `${TAG} листинг`,
      description: "…",
      photoUrls: [],
      buildingLabel: `${TAG}-дом`,
      status: "PUBLISHED",
    },
  });
  listingId = listing.id;

  const master = await admin.master.create({
    data: {
      userId: masterUserId,
      fullName: `${TAG} Мастер`,
      city: "Кокшетау",
      categories: ["PLUMBING"],
      bio: "Опыт 5 лет",
      status: "APPROVED",
    },
  });
  masterId = master.id;
});

afterAll(async () => {
  await admin.marketOffer.deleteMany({ where: { osiId: osi } });
  await admin.marketListing.deleteMany({ where: { osiId: osi } });
  await admin.request.deleteMany({ where: { osiId: osi } });
  await admin.master.deleteMany({ where: { fullName: { startsWith: TAG } } });
  await admin.building.deleteMany({ where: { osiId: osi } });
  await admin.osi.delete({ where: { id: osi } });
  await admin.user.deleteMany({ where: { phone: { startsWith: "+7778" } } });
  await admin.$disconnect();
});

describe("Мобильный клиент маркетплейса: форма ответа новых GET-роутов (REQ-148..150)", () => {
  it("REQ-148: getMasterByUserId отдаёт полный профиль (для /api/master/me)", async () => {
    const master = await getMasterByUserId(masterUserId);
    expect(master).toMatchObject({
      id: masterId,
      status: "APPROVED",
      city: "Кокшетау",
      categories: ["PLUMBING"],
      bio: "Опыт 5 лет",
    });
  });

  it("REQ-148: getMasterByUserId — null для пользователя без анкеты (отличимо от APPROVED/PENDING)", async () => {
    const stranger = await admin.user.create({ data: { phone: uniqPhone() } });
    expect(await getMasterByUserId(stranger.id)).toBeNull();
    await admin.user.delete({ where: { id: stranger.id } });
  });

  it("REQ-149: listCityListings(masterId, city) — то, что отдаст GET /api/master/listings", async () => {
    const listings = await listCityListings(masterId, "Кокшетау");
    expect(listings.map((l) => l.id)).toContain(listingId);
  });

  it("REQ-150: listMyOffers(masterId, city) — отклик приходит с разрешённым listing", async () => {
    const created = await createOffer(masterId, "Кокшетау", listingId, { message: "Возьмусь", price: 5000 });
    expect(created.ok).toBe(true);

    const offers = await listMyOffers(masterId, "Кокшетау");
    const mine = offers.find((o) => o.listingId === listingId);
    expect(mine?.listing?.id).toBe(listingId);
    expect(mine?.status).toBe("OFFERED");
  });
});
