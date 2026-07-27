import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  searchUsers,
  listAllBuildingsWithApartments,
  listAllRequests,
  listAllAnnouncements,
  deleteRequestAdmin,
  deleteAnnouncementAdmin,
} from "@/lib/admin/service";

const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const TAG = `adm-ext-${Date.now()}`;
const uniqPhone = () => `+7779${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

let actorId = "";
let osiId = "";
let buildingId = "";
let requestId = "";
let announcementId = "";
const createdUserIds: string[] = [];

beforeAll(async () => {
  // 1. Создать суперадмина
  const actor = await admin.user.create({
    data: { phone: uniqPhone(), fullName: `${TAG}-actor`, isSuperadmin: true },
  });
  actorId = actor.id;
  createdUserIds.push(actor.id);

  // 2. Создать обычного юзера
  const normalUser = await admin.user.create({
    data: { phone: uniqPhone(), fullName: `${TAG}-user` },
  });
  createdUserIds.push(normalUser.id);

  // 3. Создать ОСИ
  const osi = await admin.osi.create({ data: { name: `${TAG}-OSI` } });
  osiId = osi.id;

  // 4. Создать дом и квартиры
  const bld = await admin.building.create({ data: { osiId, address: `${TAG}-дом` } });
  buildingId = bld.id;
  await admin.apartment.create({ data: { osiId, buildingId, number: "1" } });
  await admin.apartment.create({ data: { osiId, buildingId, number: "2" } });

  // 5. Создать заявку
  const req = await admin.request.create({
    data: {
      osiId,
      buildingId,
      authorUserId: normalUser.id,
      category: "PLUMBING",
      text: `${TAG}-заявка`,
    },
  });
  requestId = req.id;

  // 6. Создать объявление
  const ann = await admin.announcement.create({
    data: {
      osiId,
      buildingId,
      authorUserId: normalUser.id,
      title: `${TAG}-объявление`,
      body: "Важное объявление",
    },
  });
  announcementId = ann.id;
});

afterAll(async () => {
  await admin.adminAuditLog.deleteMany({ where: { actorUserId: actorId } });
  await admin.announcement.deleteMany({ where: { osiId } });
  await admin.request.deleteMany({ where: { osiId } });
  await admin.apartment.deleteMany({ where: { osiId } });
  await admin.building.deleteMany({ where: { osiId } });
  await admin.osi.deleteMany({ where: { id: osiId } });
  await admin.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await admin.$disconnect();
  await prisma.$disconnect();
});

describe("Админка расширение (Slice 27)", () => {
  it("searchUsers находит нужного пользователя", async () => {
    const list = await searchUsers(`${TAG}-user`);
    expect(list.length).toBe(1);
    expect(list[0]!.fullName).toBe(`${TAG}-user`);
  });

  it("listAllBuildingsWithApartments возвращает дома с квартирами", async () => {
    const list = await listAllBuildingsWithApartments();
    const bld = list.find((x) => x.id === buildingId);
    expect(bld).toBeDefined();
    expect(bld?.apartments.length).toBe(2);
  });

  it("listAllRequests возвращает заявки", async () => {
    const list = await listAllRequests();
    const req = list.find((x) => x.id === requestId);
    expect(req).toBeDefined();
    expect(req?.text).toBe(`${TAG}-заявка`);
  });

  it("listAllAnnouncements возвращает объявления", async () => {
    const list = await listAllAnnouncements();
    const ann = list.find((x) => x.id === announcementId);
    expect(ann).toBeDefined();
    expect(ann?.title).toBe(`${TAG}-объявление`);
  });

  it("deleteRequestAdmin удаляет заявку и пишет аудит", async () => {
    const success = await deleteRequestAdmin(actorId, osiId, requestId);
    expect(success).toBe(true);

    const check = await admin.request.findUnique({ where: { id: requestId } });
    expect(check).toBeNull();

    const audit = await admin.adminAuditLog.findFirst({
      where: { actorUserId: actorId, action: "REQUEST_DELETE", entityId: requestId },
    });
    expect(audit).not.toBeNull();
  });

  it("deleteAnnouncementAdmin удаляет объявление и пишет аудит", async () => {
    const success = await deleteAnnouncementAdmin(actorId, osiId, announcementId);
    expect(success).toBe(true);

    const check = await admin.announcement.findUnique({ where: { id: announcementId } });
    expect(check).toBeNull();

    const audit = await admin.adminAuditLog.findFirst({
      where: { actorUserId: actorId, action: "ANNOUNCEMENT_DELETE", entityId: announcementId },
    });
    expect(audit).not.toBeNull();
  });
});
