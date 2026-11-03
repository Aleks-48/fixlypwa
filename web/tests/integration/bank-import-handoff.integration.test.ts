import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { commitBankImport, previewBankImport, transactionSchema } from "@/lib/bank-import/service";

const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
let osiA = "", osiB = "", actorId = "", buildingA = "", buildingB = "", accountA = "", accountB = "", bankB = "";
beforeAll(async () => {
  actorId = (await admin.user.create({ data: { email: `import-${Date.now()}@example.test` } })).id;
  osiA = (await admin.osi.create({ data: { name: "Import A" } })).id;
  osiB = (await admin.osi.create({ data: { name: "Import B" } })).id;
  for (const osiId of [osiA, osiB]) {
    const building = await admin.building.create({ data: { osiId, address: "Test", city: "Кокшетау" } });
    const apartment = await admin.apartment.create({ data: { osiId, buildingId: building.id, number: "1" } });
    const account = await admin.account.create({ data: { osiId, apartmentId: apartment.id } });
    if (osiId === osiA) { buildingA = building.id; accountA = account.id; }
    else { buildingB = building.id; accountB = account.id; }
  }
  bankB = (await admin.bankAccount.create({ data: { osiId: osiB, buildingId: buildingB, type: "CURRENT", bankName: "Test", accountNumber: "TESTONLY" } })).id;
});
afterAll(async () => {
  const where = { osiId: { in: [osiA, osiB] } };
  await admin.auditLog.deleteMany({ where });
  await admin.payment.deleteMany({ where });
  await admin.expense.deleteMany({ where });
  await admin.building.deleteMany({ where });
  await admin.osi.deleteMany({ where: { id: { in: [osiA, osiB] } } });
  if (actorId) await admin.user.delete({ where: { id: actorId } });
  await admin.$disconnect();
});
const row = (bankRef: string, matchedAccountId?: string) => transactionSchema.parse({
  bankRef, matchedAccountId, date: "2026-09-24T00:00:00Z", amount: 1500.25, type: "INCOME", detectedApartmentNumber: "1",
});
describe("bank import tenant safety and idempotency", () => {
  it("requires an explicit building for apartment-number matching", async () => {
    expect((await previewBankImport(osiA, [row("preview")]))[0]?.matchedAccountId).toBeUndefined();
    expect((await previewBankImport(osiA, [row("preview")], buildingA))[0]?.matchedAccountId).toBe(accountA);
    await expect(previewBankImport(osiA, [row("preview")], buildingB)).rejects.toThrow("Дом недоступен");
  });
  it("rejects foreign account and rolls back preceding rows", async () => {
    await expect(commitBankImport(osiA, actorId, [row("rollback", accountA), row("foreign", accountB)])).rejects.toThrow();
    expect(await admin.payment.count({ where: { osiId: osiA, bankRef: "rollback" } })).toBe(0);
  });
  it("rejects a foreign bank account", async () => {
    const item = transactionSchema.parse({ ...row("expense"), type: "EXPENSE", buildingId: buildingA, bankAccountId: bankB });
    await expect(commitBankImport(osiA, actorId, [item])).rejects.toThrow();
  });
  it("serializes concurrent imports, ignores client duplicate flags, and audits once", async () => {
    const items = [transactionSchema.parse({ ...row("concurrent", accountA), isDuplicate: true })];
    const results = await Promise.all([commitBankImport(osiA, actorId, items), commitBankImport(osiA, actorId, items)]);
    expect(results.reduce((sum, r) => sum + r.paymentsCreated, 0)).toBe(1);
    expect(results.reduce((sum, r) => sum + r.skippedDuplicates, 0)).toBe(1);
    expect(await admin.auditLog.count({ where: { osiId: osiA, entityType: "PAYMENT" } })).toBe(1);
  });
  it("reports unmatched rows and validates monetary precision", async () => {
    expect((await commitBankImport(osiA, actorId, [row("unmatched")])).skippedUnmatched).toBe(1);
    expect(transactionSchema.safeParse({ ...row("bad"), amount: -1 }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...row("bad"), amount: 1.001 }).success).toBe(false);
  });
});
