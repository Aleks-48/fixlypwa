import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, expect, it, vi } from "vitest";
import { canReadUpload, safeUploadName } from "@/lib/uploads/private";
import { getReceiptData, ReceiptNotFoundError } from "@/lib/payments/receiptService";
import type { AuthContext } from "@/lib/auth/session";
import { updateUserProfile } from "@/lib/settings/service";

const handler = vi.hoisted(() => vi.fn());
vi.mock("@/lib/telegram", () => ({ handleTelegramUpdate: handler }));
vi.mock("@/lib/env", async importOriginal => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return { env: new Proxy(env, { get: (target, key) => key === "TELEGRAM_WEBHOOK_SECRET" ? "acceptance-test-secret" : Reflect.get(target, key) }) };
});
const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
afterAll(() => admin.$disconnect());

it("protects files by tenant, building and document visibility, and receipts by owner", async () => {
  const osi = await admin.osi.create({ data: { name: "acceptance-" + randomUUID() } });
  const userIds: string[] = [];
  try {
    const building = await admin.building.create({ data: { osiId: osi.id, address: "QA building" } });
    const apartment = await admin.apartment.create({ data: { osiId: osi.id, buildingId: building.id, number: "QA" } });
    const makeAuth = async (role?: "CHAIRMAN" | "RESIDENT"): Promise<AuthContext> => {
      const user = await admin.user.create({ data: { email: randomUUID()+"@example.test",
        ...(role ? { roles: { create: { osiId: osi.id, role } } } : {}) }, include: { roles: true } });
      userIds.push(user.id);
      const session = await admin.session.create({ data: { id: randomUUID(), userId: user.id, activeOsiId: role ? osi.id : null, expiresAt: new Date(Date.now()+60000) } });
      return { user, session };
    };
    const chair = await makeAuth("CHAIRMAN"), resident = await makeAuth("RESIDENT"), outsider = await makeAuth();
    await admin.occupant.create({ data: { osiId: osi.id, userId: resident.user.id, apartmentId: apartment.id, fullName: "QA resident" } });
    const account = await admin.account.create({ data: { osiId: osi.id, apartmentId: apartment.id, accountNumber: "QA" } });
    const url = `/uploads/docs/${randomUUID()}.pdf`;
    const doc = await admin.document.create({ data: { osiId: osi.id, buildingId: building.id, authorUserId: chair.user.id, category: "OTHER", title: "QA", fileUrl: url, isPublic: false } });
    expect(await canReadUpload(chair, url)).toBe(true);
    expect(await canReadUpload(resident, url)).toBe(false);
    expect(await canReadUpload(outsider, url)).toBe(false);
    await admin.document.update({ where: { id: doc.id }, data: { isPublic: true } });
    expect(await canReadUpload(resident, url)).toBe(true);
    expect(await canReadUpload(outsider, url)).toBe(false);
    expect(safeUploadName(["..", "secret.pdf"])).toBeNull();
    expect(safeUploadName([".owners", "id.json"])).toBeNull();
    const now = new Date(), period = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const tariff = await admin.tariff.create({ data: { osiId: osi.id, buildingId: building.id, category: "MAINTENANCE", rate: 1000, rateType: "FIXED", periodFrom: period } });
    await admin.charge.create({ data: { osiId: osi.id, accountId: account.id, tariffId: tariff.id, amount: 1000, period, dueDate: now } });
    const payment = await admin.payment.create({ data: { osiId: osi.id, accountId: account.id, amount: 300, paidAt: now, incomeCategory: "RESIDENT_DUES" } });
    const receipt = await getReceiptData(osi.id, payment.id, resident.user.id);
    expect(receipt.totalCharged).toBe(1000);
    expect(receipt.paidInPeriod).toBe(300);
    expect(receipt.totalDue).toBe(700);
    await admin.payment.create({ data: { osiId: osi.id, accountId: account.id, amount: 500, paidAt: now, incomeCategory: "CAPITAL_REPAIR_CONTRIBUTION" } });
    const separatedFunds = await getReceiptData(osi.id, payment.id, resident.user.id);
    expect(separatedFunds.totalDue).toBe(700);
    expect(separatedFunds.balances.some(balance => balance.credit === 500)).toBe(true);
    await expect(getReceiptData(osi.id, payment.id, outsider.user.id)).rejects.toBeInstanceOf(ReceiptNotFoundError);
    const master = await admin.master.create({ data: { userId: outsider.user.id, fullName: "Old name", city: "QA", categories: ["OTHER"] } });
    await updateUserProfile(outsider.user.id, { fullName: "Updated master" });
    expect((await admin.master.findUniqueOrThrow({ where: { id: master.id } })).fullName).toBe("Updated master");
  } finally {
    await admin.charge.deleteMany({ where: { osiId: osi.id } });
    await admin.building.deleteMany({ where: { osiId: osi.id } });
    await admin.osi.delete({ where: { id: osi.id } });
    await admin.user.deleteMany({ where: { id: { in: userIds } } });
  }
});

it("deduplicates completed Telegram updates and permits retry after failure", async () => {
  const { POST } = await import("@/app/api/telegram/webhook/route");
  const id = Math.floor(Math.random()*1000000000);
  const request = () => new Request("http://localhost/api/telegram/webhook", { method: "POST", headers: { "x-telegram-bot-api-secret-token": "acceptance-test-secret" }, body: JSON.stringify({ update_id: id }) });
  try {
    handler.mockRejectedValueOnce(new Error("simulated transport error"));
    expect((await POST(request())).status).toBe(503);
    expect(await admin.telegramUpdateReceipt.findUnique({ where: { id } })).toBeNull();
    handler.mockResolvedValue(undefined);
    expect((await POST(request())).status).toBe(200);
    expect((await POST(request())).status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(2);
  } finally {
    await admin.telegramUpdateReceipt.deleteMany({ where: { id } });
  }
});
