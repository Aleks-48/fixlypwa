import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { saveFcmToken, removeFcmToken, sendFcmToUsers } from "@/lib/notifications/fcm";
import { createOsiForUser, createBuilding, createApartment, addResident } from "@/lib/onboarding/service";
import { createRequest } from "@/lib/comms/service";
import { getUnreadCount } from "@/lib/notifications/service";
import { addRequestMessage } from "@/lib/comms/service";

// FCM для мобильного клиента (ADR-0012 §5, REQ-127..130): identity-таблица (вне RLS),
// graceful-off без FIREBASE_* (локальное test-окружение их не задаёт — как VAPID),
// вложения RequestMessage (mobile-app.md §4).
const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const uniqPhone = () => `+7776${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
const uniqToken = () => `fcm-test-token-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

let osi = "";
let chair = "";
let buildingId = "";

beforeAll(async () => {
  const u = await admin.user.create({ data: { phone: uniqPhone() } });
  chair = u.id;
  osi = (await createOsiForUser(chair, { name: `fcm-test-${Date.now()}` })).id;
  buildingId = (await createBuilding(osi, { address: "fcm-test-дом" })).id;
});

afterAll(async () => {
  await admin.fcmToken.deleteMany({ where: { userId: chair } });
  await admin.building.deleteMany({ where: { osiId: osi } });
  await admin.osi.delete({ where: { id: osi } });
  await admin.user.deleteMany({ where: { phone: { startsWith: "+7776" } } });
  await admin.$disconnect();
});

describe("FcmToken: identity вне RLS (REQ-127)", () => {
  it("saveFcmToken создаёт запись; повторный save тем же токеном апсертит владельца", async () => {
    const token = uniqToken();
    await saveFcmToken(chair, token);

    const row = await prisma.fcmToken.findUnique({ where: { token } });
    expect(row?.userId).toBe(chair);

    // Переустановка приложения другим пользователем на то же устройство — тот же токен,
    // upsert переносит владение (REQ-127: identity, привязана к пользователю, не к тенанту).
    const other = await admin.user.create({ data: { phone: uniqPhone() } });
    await saveFcmToken(other.id, token);
    const reassigned = await prisma.fcmToken.findUnique({ where: { token } });
    expect(reassigned?.userId).toBe(other.id);

    await admin.user.delete({ where: { id: other.id } });
  });

  it("removeFcmToken удаляет запись владельца (REQ-130)", async () => {
    const token = uniqToken();
    await saveFcmToken(chair, token);
    expect(await prisma.fcmToken.findUnique({ where: { token } })).not.toBeNull();

    await removeFcmToken(chair, token);
    expect(await prisma.fcmToken.findUnique({ where: { token } })).toBeNull();
  });

  it("removeFcmToken НЕ удаляет чужой токен (code review 2026-07-16: удаление сужено по userId)", async () => {
    const token = uniqToken();
    await saveFcmToken(chair, token);

    const other = await admin.user.create({ data: { phone: uniqPhone() } });
    await removeFcmToken(other.id, token); // другой пользователь знает строку токена

    expect(await prisma.fcmToken.findUnique({ where: { token } })).not.toBeNull(); // токен цел
    await admin.fcmToken.deleteMany({ where: { token } });
    await admin.user.delete({ where: { id: other.id } });
  });

  it("sendFcmToUsers не бросает без FIREBASE_* (graceful-off, ADR-0012 §5)", async () => {
    const token = uniqToken();
    await saveFcmToken(chair, token);
    await expect(
      sendFcmToUsers([chair], { type: "REQUEST_CREATED", notificationId: "x" }),
    ).resolves.toBeUndefined();
  });

  it("notify() (полный триггер REQUEST_CREATED) не падает и не блокируется FCM-веткой", async () => {
    const token = uniqToken();
    await saveFcmToken(chair, token);

    const before = await getUnreadCount(osi, chair);
    await createRequest(osi, {
      buildingId,
      authorUserId: chair,
      category: "PLUMBING",
      text: "fcm-integration",
    });
    // In-app уведомление создалось несмотря на то, что FCM-канал (без ключей) и Web Push
    // (без VAPID) оба не сработали — REQ-128: сбой канала доставки не блокирует остальные.
    expect(await getUnreadCount(osi, chair)).toBe(before + 1);
  });
});

describe("RequestMessage: вложения мобильного клиента (mobile-app.md §4)", () => {
  it("addRequestMessage сохраняет audioUrl/imageUrl вместе с text", async () => {
    const apt = await createApartment(osi, { buildingId, number: "fcm-1" });
    const { userId: residentId } = await addResident(osi, {
      apartmentId: apt.id,
      fullName: "Житель FCM-теста",
      phone: uniqPhone(),
    });
    const request = await createRequest(osi, {
      buildingId,
      authorUserId: residentId,
      category: "OTHER",
      text: "заявка с вложением",
    });

    const msg = await addRequestMessage(osi, request.id, residentId, "фото прилагаю", {
      imageUrl: "/uploads/test-image.jpg",
    });

    expect(msg?.imageUrl).toBe("/uploads/test-image.jpg");
    expect(msg?.audioUrl).toBeNull();
  });

  it("addRequestMessage без вложений — оба поля null (обратная совместимость с веб-чатом)", async () => {
    const apt = await createApartment(osi, { buildingId, number: "fcm-2" });
    const { userId: residentId } = await addResident(osi, {
      apartmentId: apt.id,
      fullName: "Житель FCM-теста-2",
      phone: uniqPhone(),
    });
    const request = await createRequest(osi, {
      buildingId,
      authorUserId: residentId,
      category: "OTHER",
      text: "обычная заявка",
    });

    const msg = await addRequestMessage(osi, request.id, residentId, "просто текст");
    expect(msg?.audioUrl).toBeNull();
    expect(msg?.imageUrl).toBeNull();
  });
});
