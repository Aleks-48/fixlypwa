import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { forTenant } from "@/lib/db/tenant";
import { forMaster } from "@/lib/db/master";

// Интеграционный тест изоляции витрины мастеров (ADR-0009). Доказывает НА РЕАЛЬНОЙ БД, что
// market_listing/market_offer читаются ДВУМЯ независимыми RLS-контекстами (see migration
// 20260705073011_marketplace_masters), не пересекающимися друг с другом:
//  1. вне forTenant/forMaster → 0 строк (deny-by-default), как у любой tenant-таблицы;
//  2. forTenant(osiId) — путь председателя: видит листинги/офферы своей ОСИ независимо от
//     города/статуса, полный CRUD;
//  3. forMaster(masterId, city) — путь мастера: видит ТОЛЬКО PUBLISHED листинги своего города
//     (чужой город и не-PUBLISHED — невидимы), не может писать в market_listing напрямую;
//  4. master_own на market_offer: мастер видит/пишет только свои отклики, не может создать
//     оффер от имени другого мастера (WITH CHECK).
//
// `admin` — суперпользователь (DIRECT_URL), обходит RLS — сев/уборка. Приложение (`prisma`/
// forTenant/forMaster) ходит ролью app_login, на неё RLS действует.

const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const TAG = `mkt-test-${Date.now()}`;
const uniqPhone = () => `+7779${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

let osiA = "";
let buildingA = "";
let requestA = ""; // город "Кокшетау" (дефолт Building.city)
let requestA2 = ""; // второй запрос той же ОСИ — для листинга не-PUBLISHED
let listingPublishedA = ""; // PUBLISHED, город Кокшетау
let listingClosedA = ""; // CLOSED, тот же город — не должен быть виден мастеру

let osiB = "";
let buildingB = "";
let requestB = ""; // город "Алматы"
let listingPublishedB = "";

let masterKokshetau = ""; // APPROVED, город Кокшетау
let masterAlmaty = ""; // APPROVED, город Алматы

beforeAll(async () => {
  const chairA = await admin.user.create({ data: { phone: uniqPhone() } });
  const chairB = await admin.user.create({ data: { phone: uniqPhone() } });
  const userMasterKok = await admin.user.create({ data: { phone: uniqPhone() } });
  const userMasterAlm = await admin.user.create({ data: { phone: uniqPhone() } });

  const a = await admin.osi.create({ data: { name: `${TAG}-A` } });
  const b = await admin.osi.create({ data: { name: `${TAG}-B` } });
  osiA = a.id;
  osiB = b.id;

  const bldA = await admin.building.create({
    data: { osiId: osiA, address: `${TAG}-A-дом`, city: "Кокшетау" },
  });
  const bldB = await admin.building.create({
    data: { osiId: osiB, address: `${TAG}-B-дом`, city: "Алматы" },
  });
  buildingA = bldA.id;
  buildingB = bldB.id;

  const reqA = await admin.request.create({
    data: {
      osiId: osiA,
      buildingId: buildingA,
      authorUserId: chairA.id,
      category: "PLUMBING",
      text: `${TAG} течёт кран`,
    },
  });
  const reqA2 = await admin.request.create({
    data: {
      osiId: osiA,
      buildingId: buildingA,
      authorUserId: chairA.id,
      category: "ELECTRICITY",
      text: `${TAG} свет не горит`,
    },
  });
  const reqB = await admin.request.create({
    data: {
      osiId: osiB,
      buildingId: buildingB,
      authorUserId: chairB.id,
      category: "PLUMBING",
      text: `${TAG} течёт кран Б`,
    },
  });
  requestA = reqA.id;
  requestA2 = reqA2.id;
  requestB = reqB.id;

  const listingA = await admin.marketListing.create({
    data: {
      osiId: osiA,
      requestId: requestA,
      city: "Кокшетау",
      category: "PLUMBING",
      title: `${TAG} Течёт кран`,
      description: "Маскированное описание без ПДн",
      photoUrls: [],
      buildingLabel: `${TAG}-A-дом`,
      status: "PUBLISHED",
    },
  });
  listingPublishedA = listingA.id;

  const listingAClosed = await admin.marketListing.create({
    data: {
      osiId: osiA,
      requestId: requestA2,
      city: "Кокшетау",
      category: "ELECTRICITY",
      title: `${TAG} Снятый листинг`,
      description: "Уже закрыт",
      photoUrls: [],
      buildingLabel: `${TAG}-A-дом`,
      status: "CLOSED",
    },
  });
  listingClosedA = listingAClosed.id;

  const listingB = await admin.marketListing.create({
    data: {
      osiId: osiB,
      requestId: requestB,
      city: "Алматы",
      category: "PLUMBING",
      title: `${TAG} Течёт кран Б`,
      description: "Другой город",
      photoUrls: [],
      buildingLabel: `${TAG}-B-дом`,
      status: "PUBLISHED",
    },
  });
  listingPublishedB = listingB.id;

  const mKok = await admin.master.create({
    data: {
      userId: userMasterKok.id,
      fullName: `${TAG} Мастер Кокшетау`,
      city: "Кокшетау",
      categories: ["PLUMBING", "ELECTRICITY"],
      status: "APPROVED",
    },
  });
  const mAlm = await admin.master.create({
    data: {
      userId: userMasterAlm.id,
      fullName: `${TAG} Мастер Алматы`,
      city: "Алматы",
      categories: ["PLUMBING"],
      status: "APPROVED",
    },
  });
  masterKokshetau = mKok.id;
  masterAlmaty = mAlm.id;
});

afterAll(async () => {
  await admin.marketOffer.deleteMany({ where: { osiId: { in: [osiA, osiB] } } });
  await admin.marketListing.deleteMany({ where: { osiId: { in: [osiA, osiB] } } });
  await admin.request.deleteMany({ where: { osiId: { in: [osiA, osiB] } } });
  await admin.master.deleteMany({ where: { fullName: { startsWith: TAG } } });
  await admin.building.deleteMany({ where: { osiId: { in: [osiA, osiB] } } });
  await admin.osi.deleteMany({ where: { name: { startsWith: TAG } } });
  await admin.user.deleteMany({ where: { phone: { startsWith: "+7779" } } });
  await admin.$disconnect();
});

describe("Изоляция витрины мастеров (ADR-0009)", () => {
  it("вне forTenant/forMaster market_listing возвращает 0 строк (deny-by-default)", async () => {
    const rows = await prisma.marketListing.findMany({ where: { osiId: osiA } });
    expect(rows).toHaveLength(0);
  });

  it("forTenant(A) видит ОБА листинга своей ОСИ (PUBLISHED и CLOSED) — путь председателя", async () => {
    const rows = await forTenant(osiA, (tx) =>
      tx.marketListing.findMany({ where: { osiId: osiA }, orderBy: { title: "asc" } }),
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.id).sort()).toEqual([listingClosedA, listingPublishedA].sort());
  });

  it("forTenant(A) не видит листинг ОСИ Б", async () => {
    const rows = await forTenant(osiA, (tx) => tx.marketListing.findMany({ where: { osiId: osiB } }));
    expect(rows).toHaveLength(0);
  });

  it("forMaster(Кокшетау) видит только PUBLISHED листинг своего города, не видит CLOSED", async () => {
    const rows = await forMaster(masterKokshetau, "Кокшетау", (tx) =>
      tx.marketListing.findMany({ where: { id: { in: [listingPublishedA, listingClosedA] } } }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(listingPublishedA);
  });

  it("forMaster(Кокшетау) не видит листинг Алматы (изоляция по городу)", async () => {
    const rows = await forMaster(masterKokshetau, "Кокшетау", (tx) =>
      tx.marketListing.findMany({ where: { id: listingPublishedB } }),
    );
    expect(rows).toHaveLength(0);
  });

  it("forMaster(Алматы) видит листинг Алматы, не видит листинг Кокшетау", async () => {
    const own = await forMaster(masterAlmaty, "Алматы", (tx) =>
      tx.marketListing.findMany({ where: { id: listingPublishedB } }),
    );
    expect(own).toHaveLength(1);

    const foreign = await forMaster(masterAlmaty, "Алматы", (tx) =>
      tx.marketListing.findMany({ where: { id: listingPublishedA } }),
    );
    expect(foreign).toHaveLength(0);
  });

  it("forMaster(Алматы) НЕ видит CLOSED-листинг Кокшетау, на который у него нет отклика", async () => {
    const rows = await forMaster(masterAlmaty, "Алматы", (tx) =>
      tx.marketListing.findMany({ where: { id: listingClosedA } }),
    );
    expect(rows).toHaveLength(0);
  });

  it("мастер видит СВОЙ листинг даже после смены статуса на TAKEN (миграция market_read_own_offers)", async () => {
    // Своя изолированная заявка/листинг, чтобы не задеть остальные кейсы этого файла.
    const owner = await admin.user.create({ data: { phone: uniqPhone() } });
    const req = await admin.request.create({
      data: {
        osiId: osiA,
        buildingId: buildingA,
        authorUserId: owner.id,
        category: "PLUMBING",
        text: `${TAG} для теста статуса`,
      },
    });
    const listing = await admin.marketListing.create({
      data: {
        osiId: osiA,
        requestId: req.id,
        city: "Кокшетау",
        category: "PLUMBING",
        title: `${TAG} статус-тест`,
        description: "…",
        photoUrls: [],
        buildingLabel: `${TAG}-A-дом`,
        status: "PUBLISHED",
      },
    });

    await forMaster(masterKokshetau, "Кокшетау", (tx) =>
      tx.marketOffer.create({
        data: { osiId: osiA, listingId: listing.id, masterId: masterKokshetau, message: "…" },
      }),
    );

    // Другой мастер (без отклика) листинг не видит и после смены статуса — по-прежнему видит,
    // только если статус PUBLISHED. Симулируем принятие (TAKEN) через admin.
    await admin.marketListing.update({ where: { id: listing.id }, data: { status: "TAKEN" } });

    const ownerVisible = await forMaster(masterKokshetau, "Кокшетау", (tx) =>
      tx.marketListing.findMany({ where: { id: listing.id } }),
    );
    expect(ownerVisible).toHaveLength(1); // видит своё — есть отклик

    const strangerVisible = await forMaster(masterAlmaty, "Алматы", (tx) =>
      tx.marketListing.findMany({ where: { id: listing.id } }),
    );
    expect(strangerVisible).toHaveLength(0); // чужой без отклика — не видит TAKEN
  });

  it("forMaster не может писать в market_listing (только SELECT-политика)", async () => {
    await expect(
      forMaster(masterKokshetau, "Кокшетау", (tx) =>
        tx.marketListing.update({
          where: { id: listingPublishedA },
          data: { title: "изменено мастером" },
        }),
      ),
    ).rejects.toThrow();
  });

  it("мастер создаёт отклик на видимый ему листинг и видит только свой отклик", async () => {
    const offer = await forMaster(masterKokshetau, "Кокшетау", (tx) =>
      tx.marketOffer.create({
        data: {
          osiId: osiA,
          listingId: listingPublishedA,
          masterId: masterKokshetau,
          message: "Могу подъехать сегодня",
        },
      }),
    );
    expect(offer.status).toBe("OFFERED");

    const seenByOwner = await forMaster(masterKokshetau, "Кокшетау", (tx) =>
      tx.marketOffer.findMany({ where: { id: offer.id } }),
    );
    expect(seenByOwner).toHaveLength(1);

    // Другой мастер (даже в чужом городе) не видит чужой оффер — изоляция по master_id.
    const seenByOther = await forMaster(masterAlmaty, "Алматы", (tx) =>
      tx.marketOffer.findMany({ where: { id: offer.id } }),
    );
    expect(seenByOther).toHaveLength(0);

    // Председатель этой ОСИ видит отклик на свой листинг (путь tenant_iso).
    const seenByChairman = await forTenant(osiA, (tx) =>
      tx.marketOffer.findMany({ where: { id: offer.id } }),
    );
    expect(seenByChairman).toHaveLength(1);
  });

  it("WITH CHECK блокирует создание оффера от имени чужого мастера", async () => {
    await expect(
      forMaster(masterKokshetau, "Кокшетау", (tx) =>
        tx.marketOffer.create({
          data: {
            osiId: osiA,
            listingId: listingPublishedA,
            masterId: masterAlmaty, // подмена — должно упасть на WITH CHECK
            message: "спуфинг",
          },
        }),
      ),
    ).rejects.toThrow();
  });
});
