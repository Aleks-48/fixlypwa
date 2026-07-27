import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOsiForUser, createBuilding, createApartment, addResident } from "@/lib/onboarding/service";
import { createRequest, createAnnouncement, addRequestMessage } from "@/lib/comms/service";
import { subscribe } from "@/lib/events/bus";

// SSE (срез 24, REQ-132/133): notify() публикует в events/bus для каждого получателя —
// проверяем на реальных сервисных вызовах (не моком), что публикация доходит до подписчика
// с правильным entityType/entityId, той же дисциплиной REQ-105 (без title/body в событии).
const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const uniqPhone = () => `+7775${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

let osi = "";
let chair = "";
let buildingId = "";

beforeAll(async () => {
  const u = await admin.user.create({ data: { phone: uniqPhone() } });
  chair = u.id;
  osi = (await createOsiForUser(chair, { name: `events-test-${Date.now()}` })).id;
  buildingId = (await createBuilding(osi, { address: "events-test-дом" })).id;
});

afterAll(async () => {
  await admin.building.deleteMany({ where: { osiId: osi } });
  await admin.osi.delete({ where: { id: osi } });
  await admin.user.deleteMany({ where: { phone: { startsWith: "+7775" } } });
  await admin.$disconnect();
});

describe("events/bus + notify(): доставка подписчику по реальным триггерам", () => {
  it("новая заявка → председатель получает SSE-событие REQUEST_CREATED с entityType=request", async () => {
    const received: unknown[] = [];
    const unsubscribe = subscribe(chair, (event) => received.push(event));

    const request = await createRequest(osi, {
      buildingId,
      authorUserId: chair,
      category: "PLUMBING",
      text: "events-integration",
    });
    unsubscribe();

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      type: "REQUEST_CREATED",
      entityType: "request",
      entityId: request.id,
    });
  });

  it("объявление → жители дома получают SSE-событие ANNOUNCEMENT", async () => {
    const apt = await createApartment(osi, { buildingId, number: "events-1" });
    const { userId: residentId } = await addResident(osi, {
      apartmentId: apt.id,
      fullName: "Житель events-теста",
      phone: uniqPhone(),
    });

    const received: unknown[] = [];
    const unsubscribe = subscribe(residentId, (event) => received.push(event));

    const ann = await createAnnouncement(osi, {
      buildingId,
      authorUserId: chair,
      title: "SSE-тест",
      body: "текст объявления",
    });
    unsubscribe();

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      type: "ANNOUNCEMENT",
      entityType: "announcement",
      entityId: ann.id,
    });
  });

  it("сообщение в тред заявки → SSE-событие REQUEST_MESSAGE тому, кто не писал", async () => {
    const apt = await createApartment(osi, { buildingId, number: "events-2" });
    const { userId: residentId } = await addResident(osi, {
      apartmentId: apt.id,
      fullName: "Житель events-теста-2",
      phone: uniqPhone(),
    });
    const request = await createRequest(osi, {
      buildingId,
      authorUserId: residentId,
      category: "OTHER",
      text: "тред для SSE",
    });

    const received: unknown[] = [];
    const unsubscribe = subscribe(residentId, (event) => received.push(event));

    // Отвечает председатель — уведомление и SSE уходят автору заявки (жителю), не себе.
    await addRequestMessage(osi, request.id, chair, "ответ председателя");
    unsubscribe();

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      type: "REQUEST_MESSAGE",
      entityType: "request",
      entityId: request.id,
    });
  });

  it("событие не содержит title/body — только type/entityType/entityId/notificationId (REQ-105)", async () => {
    const received: Record<string, unknown>[] = [];
    const unsubscribe = subscribe(chair, (event) => received.push(event as Record<string, unknown>));

    await createRequest(osi, {
      buildingId,
      authorUserId: chair,
      category: "ELEVATOR",
      text: "не должно попасть в событие",
    });
    unsubscribe();

    expect(received).toHaveLength(1);
    expect(Object.keys(received[0]!).sort()).toEqual(
      ["entityId", "entityType", "notificationId", "type"].sort(),
    );
  });
});
