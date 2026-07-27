import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { forTenant } from "@/lib/db/tenant";
import { createOsiForUser, createBuilding, createApartment, addResident } from "@/lib/onboarding/service";
import { createTariff, generateCharges, payOnlineDemo, accountBalances } from "@/lib/finance/service";

// Онлайн-оплата (демо-режим, payments-online.md, ADR-0010): весь долг гасится одним действием,
// сумма пересчитывается на сервере, повторный вызов при долге 0 — no-op (REQ-034), симулятор
// может отказать (REQ-036) без изменения данных, расхождение с expectedAmount отклоняется без
// списания (REQ-036). Math.random мокается для детерминизма — сама функция не принимает
// testonly-параметров (expectedAmount — обычный производственный параметр, payments-online.md §4).
const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const uniq = () => `+7782${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
const PERIOD = new Date(Date.UTC(2026, 6, 1));

let osi = "";
let chair = "";
let buildingId = "";

beforeAll(async () => {
  const u = await admin.user.create({ data: { phone: uniq() } });
  chair = u.id;
  osi = (await createOsiForUser(chair, { name: `payonline-${Date.now()}` })).id;
  buildingId = (await createBuilding(osi, { address: "payonline-дом" })).id;

  await createTariff(osi, chair, {
    buildingId,
    category: "MAINTENANCE",
    rateType: "FIXED",
    rate: 5000,
    periodFrom: new Date(Date.UTC(2020, 0, 1)),
  });
  await createTariff(osi, chair, {
    buildingId,
    category: "CAPITAL_REPAIR",
    rateType: "FIXED",
    rate: 2000,
    periodFrom: new Date(Date.UTC(2020, 0, 1)),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await admin.$executeRawUnsafe(`DELETE FROM audit_log WHERE osi_id = '${osi}'`);
  await admin.payment.deleteMany({ where: { osiId: osi } });
  await admin.charge.deleteMany({ where: { osiId: osi } });
  await admin.tariff.deleteMany({ where: { osiId: osi } });
  await admin.account.deleteMany({ where: { osiId: osi } });
  await admin.occupant.deleteMany({ where: { osiId: osi } });
  await admin.apartment.deleteMany({ where: { osiId: osi } });
  await admin.building.deleteMany({ where: { osiId: osi } });
  await admin.osi.delete({ where: { id: osi } });
  await admin.user.deleteMany({ where: { phone: { startsWith: "+7782" } } });
  await admin.$disconnect();
});

describe("Онлайн-оплата (демо-режим, REQ-033..036)", () => {
  it("гасит весь долг по всем бакетам одним действием; идемпотентна при повторе (REQ-034)", async () => {
    const apt = await createApartment(osi, { buildingId, number: "10" });
    const phone = uniq();
    const { userId } = await addResident(osi, { apartmentId: apt.id, fullName: "Житель 10", phone });
    await generateCharges(osi, chair, buildingId, PERIOD);

    const acc = await forTenant(osi, (tx) => tx.account.findFirstOrThrow({ where: { apartmentId: apt.id } }));
    const before = await forTenant(osi, (tx) => accountBalances(tx, acc.id));
    expect(before.MAINTENANCE.debt).toBe(5000);
    expect(before.CAPITAL_REPAIR.debt).toBe(2000);

    // >0.05 — симулятор не срабатывает на отказ (REQ-036 путь отказа — отдельный тест ниже).
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = await payOnlineDemo(osi, userId, "test_card");
    expect(result).toMatchObject({ success: true, alreadyPaid: false, amount: 7000 });
    if (result.success && !result.alreadyPaid) {
      expect(result.gatewayRef).toMatch(/^TEST-TX-/);
    }

    const after = await forTenant(osi, (tx) => accountBalances(tx, acc.id));
    expect(after.MAINTENANCE.debt).toBe(0);
    expect(after.CAPITAL_REPAIR.debt).toBe(0);

    const payments = await forTenant(osi, (tx) => tx.payment.findMany({ where: { accountId: acc.id } }));
    expect(payments).toHaveLength(2); // один Payment на бакет с долгом
    expect(payments.every((p) => p.method === "Тест: картой" && p.gatewayRef)).toBe(true);

    // Повтор при долге 0 — no-op, новых платежей не создаёт (REQ-034).
    const again = await payOnlineDemo(osi, userId, "test_card");
    expect(again).toEqual({ success: true, alreadyPaid: true });
    const paymentsAfter = await forTenant(osi, (tx) => tx.payment.findMany({ where: { accountId: acc.id } }));
    expect(paymentsAfter).toHaveLength(2);
  });

  it("симулированный отказ не меняет данные (REQ-036)", async () => {
    const apt = await createApartment(osi, { buildingId, number: "11" });
    const phone = uniq();
    const { userId } = await addResident(osi, { apartmentId: apt.id, fullName: "Житель 11", phone });
    await generateCharges(osi, chair, buildingId, PERIOD);
    const acc = await forTenant(osi, (tx) => tx.account.findFirstOrThrow({ where: { apartmentId: apt.id } }));

    vi.spyOn(Math, "random").mockReturnValue(0.01); // < 0.05 — форсируем отказ симулятора

    const result = await payOnlineDemo(osi, userId, "test_card");
    expect(result).toEqual({ success: false, reason: "insufficient_funds" });

    const balances = await forTenant(osi, (tx) => accountBalances(tx, acc.id));
    expect(balances.MAINTENANCE.debt).toBe(5000); // долг не тронут
    const payments = await forTenant(osi, (tx) => tx.payment.findMany({ where: { accountId: acc.id } }));
    expect(payments).toHaveLength(0);
  });

  it("житель без привязанной квартиры получает no_account", async () => {
    const stray = await admin.user.create({ data: { phone: uniq() } });
    const result = await payOnlineDemo(osi, stray.id, "test_qr");
    expect(result).toEqual({ success: false, reason: "no_account" });
  });

  it("расхождение с expectedAmount отклоняется без списания (REQ-036)", async () => {
    const apt = await createApartment(osi, { buildingId, number: "12" });
    const phone = uniq();
    const { userId } = await addResident(osi, { apartmentId: apt.id, fullName: "Житель 12", phone });
    await generateCharges(osi, chair, buildingId, PERIOD);
    const acc = await forTenant(osi, (tx) => tx.account.findFirstOrThrow({ where: { apartmentId: apt.id } }));

    // Реальный долг — 7000 (5000+2000), но клиент показывал устаревшую сумму 505 (например,
    // председатель провёл платёж, пока у жителя была открыта шторка).
    const result = await payOnlineDemo(osi, userId, "test_card", 505);
    expect(result).toEqual({ success: false, reason: "amount_changed", currentAmount: 7000 });

    // Ничего не списано — данные не тронуты.
    const balances = await forTenant(osi, (tx) => accountBalances(tx, acc.id));
    expect(balances.MAINTENANCE.debt).toBe(5000);
    expect(balances.CAPITAL_REPAIR.debt).toBe(2000);
    const payments = await forTenant(osi, (tx) => tx.payment.findMany({ where: { accountId: acc.id } }));
    expect(payments).toHaveLength(0);
  });

  it("совпадающий expectedAmount проходит как обычная оплата", async () => {
    const apt = await createApartment(osi, { buildingId, number: "13" });
    const phone = uniq();
    const { userId } = await addResident(osi, { apartmentId: apt.id, fullName: "Житель 13", phone });
    await generateCharges(osi, chair, buildingId, PERIOD);

    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const result = await payOnlineDemo(osi, userId, "test_card", 7000);
    expect(result).toMatchObject({ success: true, alreadyPaid: false, amount: 7000 });
  });
});
