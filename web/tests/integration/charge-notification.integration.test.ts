import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOsiForUser, createBuilding, createApartment, addResident } from "@/lib/onboarding/service";
import { createTariff, generateCharges } from "@/lib/finance/service";
import { getUnreadCount, listNotifications } from "@/lib/notifications/service";

// REQ-106: массовая генерация начислений уведомляет жителя квартиры — одно уведомление на
// квартиру за прогон (не по каждому тарифу), повторный (идемпотентный) прогон не дублирует,
// квартира без жителей не падает.
const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const TAG = `chgntf-${Date.now()}`;
const uniq = () => `+7773${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
const PERIOD = new Date(Date.UTC(2026, 5, 1));

let osi = "";
let chair = "";
let buildingId = "";
let residentId = "";

beforeAll(async () => {
  const u = await admin.user.create({ data: { phone: uniq() } });
  chair = u.id;
  osi = (await createOsiForUser(chair, { name: `${TAG}-osi` })).id;
  buildingId = (await createBuilding(osi, { address: `${TAG}-дом` })).id;

  // Кв.1 (жилая, 50 м², есть житель) + кв.2 (без жителей — начисление не должно падать).
  const apt1 = await createApartment(osi, { buildingId, number: "1", area: 50 });
  await createApartment(osi, { buildingId, number: "2", area: 30 });
  const res = await addResident(osi, {
    apartmentId: apt1.id,
    fullName: "Житель Начислений",
    phone: uniq(),
  });
  residentId = res.userId;

  await createTariff(osi, chair, {
    buildingId,
    category: "MAINTENANCE",
    rateType: "PER_SQM",
    rate: 100,
    periodFrom: new Date(Date.UTC(2026, 0, 1)),
  });
  await createTariff(osi, chair, {
    buildingId,
    category: "CAPITAL_REPAIR",
    rateType: "FIXED",
    rate: 500,
    periodFrom: new Date(Date.UTC(2026, 0, 1)),
  });
});

afterAll(async () => {
  await admin.notification.deleteMany({ where: { osiId: osi } });
  await admin.$executeRawUnsafe(`DELETE FROM audit_log WHERE osi_id = '${osi}'`);
  await admin.charge.deleteMany({ where: { osiId: osi } });
  await admin.tariff.deleteMany({ where: { osiId: osi } });
  await admin.account.deleteMany({ where: { osiId: osi } });
  await admin.building.deleteMany({ where: { osiId: osi } });
  await admin.osi.delete({ where: { id: osi } });
  await admin.user.deleteMany({ where: { phone: { startsWith: "+7773" } } });
  await admin.$disconnect();
});

describe("Уведомление о начислении (REQ-106)", () => {
  it("генерация начислений создаёт ОДНО уведомление на квартиру с суммой обоих тарифов", async () => {
    const result = await generateCharges(osi, chair, buildingId, PERIOD);
    expect(result.created).toBe(4); // 2 квартиры × 2 тарифа

    // Кв.1: 100×50 (MAINTENANCE) + 500 (CAPITAL_REPAIR) = 5500 — одним уведомлением, не двумя.
    expect(await getUnreadCount(osi, residentId)).toBe(1);
    const list = await listNotifications(osi, residentId);
    expect(list[0]?.type).toBe("CHARGE_CREATED");
    expect(list[0]?.body.toLowerCase()).toContain("июн");
    // Сумма — после «₸», сравниваем числом (толерантно к варианту пробела-разделителя ICU).
    const amountMatch = list[0]?.body.match(/₸\s*([\d\s  ]+)$/);
    expect(Number(amountMatch?.[1]?.replace(/\D/g, ""))).toBe(5500);
  });

  it("повторный (идемпотентный) прогон новых начислений не создаёт, уведомление не дублирует", async () => {
    const result = await generateCharges(osi, chair, buildingId, PERIOD);
    expect(result.created).toBe(0);
    expect(result.skipped).toBe(4);

    expect(await getUnreadCount(osi, residentId)).toBe(1);
  });
});
