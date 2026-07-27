import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOsiForUser, createBuilding } from "@/lib/onboarding/service";
import { createDocument, listDocuments, deleteDocument } from "@/lib/documents/service";

const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const uniq = () => `+7777${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
let osi = "";
let buildingId = "";
let chairId = "";

beforeAll(async () => {
  const chair = await admin.user.create({ data: { phone: uniq() } });
  chairId = chair.id;
  osi = (await createOsiForUser(chairId, { name: `doc-test-${Date.now()}` })).id;
  buildingId = (await createBuilding(osi, { address: "doc-test-дом" })).id;
});

afterAll(async () => {
  await admin.document.deleteMany({ where: { osiId: osi } });
  await admin.building.deleteMany({ where: { osiId: osi } });
  await admin.osi.delete({ where: { id: osi } });
  await admin.user.deleteMany({ where: { id: chairId } });
  await admin.$disconnect();
});

describe("Библиотека документов (Document Library)", () => {
  it("создаёт документ и правильно изолирует публичные и приватные файлы", async () => {
    const docPublic = await createDocument(osi, {
      buildingId,
      category: "PROTOCOL",
      title: "Протокол собрания № 1",
      description: "Публичный документ",
      fileUrl: "https://example.com/protocol1.pdf",
      isPublic: true,
      authorUserId: chairId,
    });

    const docPrivate = await createDocument(osi, {
      buildingId,
      category: "CONTRACT",
      title: "Договор с сервисной компанией",
      description: "Приватный документ для председателя",
      fileUrl: "https://example.com/contract.pdf",
      isPublic: false,
      authorUserId: chairId,
    });

    expect(docPublic.id).toBeDefined();
    expect(docPrivate.id).toBeDefined();

    // Для Председателя (все документы)
    const allDocs = await listDocuments(osi, buildingId, { isPublicOnly: false });
    expect(allDocs).toHaveLength(2);

    // Для Жителя (только isPublic: true)
    const publicDocs = await listDocuments(osi, buildingId, { isPublicOnly: true });
    expect(publicDocs).toHaveLength(1);
    expect(publicDocs[0]?.id).toBe(docPublic.id);

    // Удаление
    await deleteDocument(osi, docPrivate.id);
    const afterDeleteDocs = await listDocuments(osi, buildingId, { isPublicOnly: false });
    expect(afterDeleteDocs).toHaveLength(1);
    expect(afterDeleteDocs[0]?.id).toBe(docPublic.id);
  });
});
