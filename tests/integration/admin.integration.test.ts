import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { forTenant } from "@/lib/db/tenant";
import {
  getOsiDetail,
  grantChairman,
  resetChairmanPassword,
  setMasterStatus,
  setSubscription,
} from "@/lib/admin/service";

// Интеграционный тест админки платформы (ADR-0008, admin-panel.md DoD §8). Доказывает НА
// РЕАЛЬНОЙ БД:
//  1. сервис админки работает БЕЗ BYPASSRLS: identity — через app_login, тенантные данные —
//     через штатный forTenant (инвариант ADR-0008 решение 2);
//  2. каждая мутация пишет AdminAuditLog, секреты (пароли) в diff не попадают;
//  3. подписку нельзя навесить на ЧУЖОЙ дом — принадлежность дома доказывается чтением
//     внутри forTenant (RLS отсекает, как offer→listing в marketplace.md §3а);
//  4. grantChairman идемпотентен; resetChairmanPassword меняет хеш и отзывает сессии.
//
// `admin` — суперпользователь (DIRECT_URL) — только сев/уборка.

const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const TAG = `adm-test-${Date.now()}`;
const uniqPhone = () => `+7778${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

let actorId = ""; // суперадмин-актор (для аудита)
let osiA = "";
let osiB = "";
let buildingA = "";
let buildingB = "";
let masterId = "";
const createdUserIds: string[] = [];

beforeAll(async () => {
  const actor = await admin.user.create({
    data: { phone: uniqPhone(), isSuperadmin: true },
  });
  actorId = actor.id;
  createdUserIds.push(actor.id);

  const a = await admin.osi.create({ data: { name: `${TAG}-A` } });
  const b = await admin.osi.create({ data: { name: `${TAG}-B` } });
  osiA = a.id;
  osiB = b.id;

  const bldA = await admin.building.create({ data: { osiId: osiA, address: `${TAG}-A-дом` } });
  const bldB = await admin.building.create({ data: { osiId: osiB, address: `${TAG}-B-дом` } });
  buildingA = bldA.id;
  buildingB = bldB.id;

  const masterUser = await admin.user.create({ data: { phone: uniqPhone() } });
  createdUserIds.push(masterUser.id);
  const master = await admin.master.create({
    data: {
      userId: masterUser.id,
      fullName: `${TAG}-мастер`,
      city: "Кокшетау",
      categories: ["PLUMBING"],
    },
  });
  masterId = master.id;
});

afterAll(async () => {
  await admin.adminAuditLog.deleteMany({ where: { actorUserId: actorId } });
  await admin.master.deleteMany({ where: { fullName: { startsWith: TAG } } });
  await admin.subscription.deleteMany({ where: { osiId: { in: [osiA, osiB] } } });
  await admin.building.deleteMany({ where: { osiId: { in: [osiA, osiB] } } });
  await admin.userOsiRole.deleteMany({ where: { osiId: { in: [osiA, osiB] } } });
  await admin.osi.deleteMany({ where: { id: { in: [osiA, osiB] } } });
  await admin.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await admin.$disconnect();
  await prisma.$disconnect();
});

describe("Админка платформы (ADR-0008)", () => {
  it("setMasterStatus меняет статус и пишет AdminAuditLog", async () => {
    const updated = await setMasterStatus(actorId, masterId, "APPROVED");
    expect(updated?.status).toBe("APPROVED");

    const audit = await admin.adminAuditLog.findFirst({
      where: { actorUserId: actorId, action: "MASTER_STATUS", entityId: masterId },
    });
    expect(audit).not.toBeNull();
    expect(audit?.diff).toMatchObject({ from: "PENDING", to: "APPROVED" });
  });

  it("setSubscription создаёт подписку своего дома, видимую через forTenant той же ОСИ", async () => {
    const sub = await setSubscription(actorId, {
      osiId: osiA,
      buildingId: buildingA,
      status: "ACTIVE",
    });
    expect(sub?.status).toBe("ACTIVE");

    const fromTenant = await forTenant(osiA, (tx) =>
      tx.subscription.findUnique({ where: { buildingId: buildingA } }),
    );
    expect(fromTenant?.status).toBe("ACTIVE");

    // Из ЧУЖОЙ ОСИ подписка невидима (RLS) — изоляция не пострадала.
    const fromOther = await forTenant(osiB, (tx) =>
      tx.subscription.findUnique({ where: { buildingId: buildingA } }),
    );
    expect(fromOther).toBeNull();
  });

  it("setSubscription отклоняет ЧУЖОЙ дом (RLS отсекает чтение принадлежности)", async () => {
    // Дом из ОСИ B при контексте ОСИ A → building невидим → null, подписка не создана.
    const result = await setSubscription(actorId, {
      osiId: osiA,
      buildingId: buildingB,
      status: "ACTIVE",
    });
    expect(result).toBeNull();

    const leaked = await admin.subscription.findUnique({ where: { buildingId: buildingB } });
    expect(leaked).toBeNull();
  });

  it("grantChairman создаёт пользователя с временным паролем и роль CHAIRMAN; повторно — идемпотентен", async () => {
    const phone = uniqPhone();
    const email = `${TAG}-chair@test.kz`;

    const first = await grantChairman(actorId, { osiId: osiA, phone, email });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    createdUserIds.push(first.userId);
    expect(first.created).toBe(true);
    expect(first.tempPassword).toBeTruthy();

    const role = await admin.userOsiRole.findUnique({
      where: { userId_osiId: { userId: first.userId, osiId: osiA } },
    });
    expect(role?.role).toBe("CHAIRMAN");

    // Пароль не должен утечь в аудит (admin-panel.md §4).
    const audit = await admin.adminAuditLog.findFirst({
      where: { action: "CHAIRMAN_GRANT", entityId: first.userId },
    });
    expect(audit).not.toBeNull();
    expect(JSON.stringify(audit?.diff)).not.toContain(first.tempPassword);

    // Повторный вызов: не создаёт дубликата, created=false, пароль не выдаётся.
    const second = await grantChairman(actorId, { osiId: osiA, phone });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.userId).toBe(first.userId);
    expect(second.created).toBe(false);
    expect(second.tempPassword).toBeNull();
  });

  it("grantChairman повышает существующего RESIDENT до CHAIRMAN, но не трогает SUPERADMIN", async () => {
    // Житель, выбранный председателем — типовой кейс выборов в ОСИ (admin-panel.md §4).
    const residentPhone = uniqPhone();
    const resident = await admin.user.create({ data: { phone: residentPhone } });
    createdUserIds.push(resident.id);
    await admin.userOsiRole.create({
      data: { userId: resident.id, osiId: osiA, role: "RESIDENT" },
    });

    const promoted = await grantChairman(actorId, { osiId: osiA, phone: residentPhone });
    expect(promoted.ok).toBe(true);
    const promotedRole = await admin.userOsiRole.findUnique({
      where: { userId_osiId: { userId: resident.id, osiId: osiA } },
    });
    expect(promotedRole?.role).toBe("CHAIRMAN");

    // Саппорт-роль SUPERADMIN не понижается повторным grant'ом.
    const supportPhone = uniqPhone();
    const support = await admin.user.create({ data: { phone: supportPhone } });
    createdUserIds.push(support.id);
    await admin.userOsiRole.create({
      data: { userId: support.id, osiId: osiA, role: "SUPERADMIN" },
    });
    const kept = await grantChairman(actorId, { osiId: osiA, phone: supportPhone });
    expect(kept.ok).toBe(true);
    const keptRole = await admin.userOsiRole.findUnique({
      where: { userId_osiId: { userId: support.id, osiId: osiA } },
    });
    expect(keptRole?.role).toBe("SUPERADMIN");
  });

  it("resetChairmanPassword меняет хеш и отзывает все сессии; без email — отказ", async () => {
    const phone = uniqPhone();
    const granted = await grantChairman(actorId, {
      osiId: osiA,
      phone,
      email: `${TAG}-reset@test.kz`,
    });
    expect(granted.ok).toBe(true);
    if (!granted.ok) return;
    createdUserIds.push(granted.userId);

    const before = await admin.user.findUnique({ where: { id: granted.userId } });
    await admin.session.create({
      data: {
        id: `${TAG}-session-hash`,
        userId: granted.userId,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const reset = await resetChairmanPassword(actorId, granted.userId);
    expect(reset.ok).toBe(true);
    if (!reset.ok) return;
    expect(reset.tempPassword).toBeTruthy();

    const after = await admin.user.findUnique({ where: { id: granted.userId } });
    expect(after?.passwordHash).not.toBe(before?.passwordHash);

    const sessions = await admin.session.findMany({ where: { userId: granted.userId } });
    expect(sessions).toHaveLength(0);

    // Пользователь без email: входа по паролю нет — сброс отклоняется.
    const phoneOnly = await grantChairman(actorId, { osiId: osiA, phone: uniqPhone() });
    expect(phoneOnly.ok).toBe(true);
    if (!phoneOnly.ok) return;
    createdUserIds.push(phoneOnly.userId);
    const denied = await resetChairmanPassword(actorId, phoneOnly.userId);
    expect(denied).toEqual({ ok: false, error: "NO_EMAIL" });
  });

  it("getOsiDetail возвращает дома только своей ОСИ", async () => {
    const detail = await getOsiDetail(osiA);
    expect(detail).not.toBeNull();
    expect(detail?.buildings.map((b) => b.id)).toEqual([buildingA]);
  });
});
