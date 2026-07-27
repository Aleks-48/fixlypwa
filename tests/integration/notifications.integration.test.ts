import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { forTenant } from "@/lib/db/tenant";
import { createOsiForUser, createBuilding, createApartment, addResident } from "@/lib/onboarding/service";
import { createAnnouncement, createRequest, setRequestStatus } from "@/lib/comms/service";
import { getUnreadCount, listNotifications, markRead } from "@/lib/notifications/service";

// Интеграция среза 7 (REQ-100/101 + RLS): триггеры адресуют правильных получателей,
// уведомления изолированы по ОСИ (deny-by-default), markRead не трогает чужое.
const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const TAG = `ntf-${Date.now()}`;
const uniq = () => `+7775${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

let osiA = "";
let osiB = "";
let chairA = "";
let residentA = "";
let requestId = "";

beforeAll(async () => {
  const chair = await admin.user.create({ data: { phone: uniq() } });
  const chairB = await admin.user.create({ data: { phone: uniq() } });
  chairA = chair.id;
  osiA = (await createOsiForUser(chairA, { name: `${TAG}-A` })).id;
  osiB = (await createOsiForUser(chairB.id, { name: `${TAG}-B` })).id;

  const building = await createBuilding(osiA, { address: `${TAG}-дом` });
  const apt = await createApartment(osiA, { buildingId: building.id, number: "1" });
  const res = await addResident(osiA, {
    apartmentId: apt.id,
    fullName: "Житель Уведомлений",
    phone: uniq(),
  });
  residentA = res.userId;
});

afterAll(async () => {
  await admin.notification.deleteMany({ where: { osiId: { in: [osiA, osiB] } } });
  await admin.building.deleteMany({ where: { osiId: { in: [osiA, osiB] } } });
  await admin.osi.deleteMany({ where: { id: { in: [osiA, osiB] } } });
  await admin.user.deleteMany({ where: { phone: { startsWith: "+7775" } } });
  await admin.$disconnect();
});

describe("Уведомления: триггеры и RLS (REQ-100/101, срез 7)", () => {
  it("объявление создаёт уведомление жителю дома (не председателю-автору)", async () => {
    const buildingId = (await forTenant(osiA, (tx) => tx.building.findFirstOrThrow())).id;
    await createAnnouncement(osiA, {
      buildingId,
      authorUserId: chairA,
      title: "Тест-объявление",
      body: "Текст",
    });

    expect(await getUnreadCount(osiA, residentA)).toBe(1);
    const list = await listNotifications(osiA, residentA);
    expect(list[0]?.type).toBe("ANNOUNCEMENT");
    expect(list[0]?.body).toBe("Тест-объявление");
    // Автор-председатель о своём объявлении не уведомляется.
    expect(await getUnreadCount(osiA, chairA)).toBe(0);
  });

  it("заявка жителя уведомляет председателя; смена статуса — автора", async () => {
    const buildingId = (await forTenant(osiA, (tx) => tx.building.findFirstOrThrow())).id;
    const request = await createRequest(osiA, {
      buildingId,
      authorUserId: residentA,
      category: "PLUMBING",
      text: "Течёт кран в тесте",
    });
    requestId = request.id;

    expect(await getUnreadCount(osiA, chairA)).toBe(1); // REQUEST_CREATED → председателю

    await setRequestStatus(osiA, requestId, "IN_PROGRESS");
    const residentList = await listNotifications(osiA, residentA);
    expect(residentList.some((n) => n.type === "REQUEST_STATUS")).toBe(true);
  });

  it("уведомления НЕ видны из чужой ОСИ (RLS) и не видны без контекста", async () => {
    // Из контекста B — пусто, хотя это те же userId в общих таблицах.
    const fromB = await forTenant(osiB, (tx) =>
      tx.notification.findMany({ where: { userId: residentA } }),
    );
    expect(fromB).toHaveLength(0);

    // Вне forTenant — deny-by-default.
    const noCtx = await prisma.notification.findMany({ where: { userId: residentA } });
    expect(noCtx).toHaveLength(0);
  });

  it("markRead помечает только свои: чужой userId не затронут", async () => {
    const before = await getUnreadCount(osiA, residentA);
    expect(before).toBeGreaterThan(0);

    // Житель помечает всё своё.
    await markRead(osiA, residentA);
    expect(await getUnreadCount(osiA, residentA)).toBe(0);

    // Председательские непрочитанные не тронуты (осталась заявка REQUEST_CREATED).
    expect(await getUnreadCount(osiA, chairA)).toBe(1);
  });
});
