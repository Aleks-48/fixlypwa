import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOsiForUser } from "@/lib/onboarding/service";
import {
  searchOsi,
  submitJoinRequest,
  cancelJoinRequest,
  listMyJoinRequests,
  listOsiJoinRequests,
  resolveJoinRequest,
  OnboardingError,
} from "@/lib/onboarding/joinRequest";

// Заявка жителя на подключение к ОСИ (REQ-151..154, docs/specs/osi-join-request.md).
// OsiJoinRequest — identity-таблица (ВНЕ RLS), поэтому изоляция между ОСИ обеспечивается кодом
// сервиса (WHERE osiId), а не Postgres RLS — этот файл проверяет именно её, в дополнение к
// rls.integration.test.ts (там — только RLS-таблицы).
const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const TAG = `jr-${Date.now()}`;
const phoneChairA = `+7773${String(Date.now()).slice(-7)}`;
const phoneChairB = `+7774${String(Date.now()).slice(-7)}`;
const phoneCandidate = `+7775${String(Date.now()).slice(-7)}`;

let osiA = "";
let osiB = "";
let candidateUserId = "";

beforeAll(async () => {
  const chairA = await admin.user.create({ data: { phone: phoneChairA } });
  const chairB = await admin.user.create({ data: { phone: phoneChairB } });
  osiA = (await createOsiForUser(chairA.id, { name: `${TAG}-ОСИ-A`, address: `${TAG}-Абая 1` })).id;
  osiB = (await createOsiForUser(chairB.id, { name: `${TAG}-ОСИ-B` })).id;

  const candidate = await admin.user.create({ data: { phone: phoneCandidate } });
  candidateUserId = candidate.id;
});

afterAll(async () => {
  await admin.osiJoinRequest.deleteMany({ where: { osiId: { in: [osiA, osiB] } } });
  await admin.userOsiRole.deleteMany({ where: { osiId: { in: [osiA, osiB] } } });
  await admin.osi.deleteMany({ where: { id: { in: [osiA, osiB] } } });
  await admin.user.deleteMany({
    where: { phone: { in: [phoneChairA, phoneChairB, phoneCandidate] } },
  });
  await admin.$disconnect();
});

describe("Заявка на подключение к ОСИ (REQ-151..154)", () => {
  it("REQ-151: поиск находит ОСИ по названию и по адресу (case-insensitive)", async () => {
    const byName = await searchOsi(`${TAG}-ОСИ-A`.toLowerCase());
    expect(byName.map((o) => o.id)).toContain(osiA);

    const byAddress = await searchOsi("абая 1".toUpperCase());
    expect(byAddress.map((o) => o.id)).toContain(osiA);

    const tooShort = await searchOsi("а");
    expect(tooShort).toEqual([]);
  });

  it("OSI_NOT_FOUND — заявка на несуществующую ОСИ", async () => {
    await expect(
      submitJoinRequest(candidateUserId, "00000000-0000-0000-0000-000000000000", null),
    ).rejects.toMatchObject({ code: "OSI_NOT_FOUND" });
  });

  it("REQ-154: первая отправка — created=true, повторная на ту же ОСИ — created=false, без дубля", async () => {
    const first = await submitJoinRequest(candidateUserId, osiA, "кв. 5");
    expect(first.created).toBe(true);
    expect(first.request.note).toBe("кв. 5");

    const second = await submitJoinRequest(candidateUserId, osiA, "кв. 5, домофон 12");
    expect(second.created).toBe(false);
    expect(second.request.id).toBe(first.request.id);
    expect(second.request.note).toBe("кв. 5, домофон 12");

    const count = await admin.osiJoinRequest.count({
      where: { userId: candidateUserId, osiId: osiA },
    });
    expect(count).toBe(1);
  });

  it("изоляция: председатель ОСИ B не видит заявку в ОСИ A", async () => {
    const forA = await listOsiJoinRequests(osiA);
    const forB = await listOsiJoinRequests(osiB);
    expect(forA.some((r) => r.userId === candidateUserId)).toBe(true);
    expect(forB.some((r) => r.userId === candidateUserId)).toBe(false);
  });

  it("нельзя обработать заявку чужой ОСИ (REQUEST_NOT_FOUND)", async () => {
    const [request] = await listOsiJoinRequests(osiA);
    await expect(resolveJoinRequest(osiB, request!.id)).rejects.toMatchObject({
      code: "REQUEST_NOT_FOUND",
    });
    // Не тронута — всё ещё PENDING в ОСИ A.
    expect(await listOsiJoinRequests(osiA)).toHaveLength(1);
  });

  it("REQ-153: обработанная заявка пропадает из списка председателя", async () => {
    const [request] = await listOsiJoinRequests(osiA);
    await resolveJoinRequest(osiA, request!.id);
    expect(await listOsiJoinRequests(osiA)).toHaveLength(0);
  });

  it("новый цикл после RESOLVED — created=true снова (не подавляем повторное уведомление навсегда)", async () => {
    const again = await submitJoinRequest(candidateUserId, osiA, null);
    expect(again.created).toBe(true);
  });

  it("ALREADY_MEMBER — заявка от того, кто уже состоит в этой ОСИ", async () => {
    // Председатель ОСИ A уже состоит в ней (роль CHAIRMAN) — заявка бессмысленна.
    const chairA = await admin.user.findUniqueOrThrow({ where: { phone: phoneChairA } });
    await expect(submitJoinRequest(chairA.id, osiA, null)).rejects.toMatchObject({
      code: "ALREADY_MEMBER",
    });
  });

  it("нельзя отменить чужую заявку; свою — можно, и она пропадает из listMyJoinRequests", async () => {
    const [request] = await listMyJoinRequests(candidateUserId);
    const chairA = await admin.user.findUniqueOrThrow({ where: { phone: phoneChairA } });

    await expect(cancelJoinRequest(chairA.id, request!.id)).rejects.toBeInstanceOf(
      OnboardingError,
    );
    expect(await listMyJoinRequests(candidateUserId)).toHaveLength(1);

    await cancelJoinRequest(candidateUserId, request!.id);
    expect(await listMyJoinRequests(candidateUserId)).toHaveLength(0);
  });

  it("REQUEST_NOT_FOUND — повторная отмена уже отменённой заявки", async () => {
    const stale = await submitJoinRequest(candidateUserId, osiB, null);
    await cancelJoinRequest(candidateUserId, stale.request.id);
    await expect(cancelJoinRequest(candidateUserId, stale.request.id)).rejects.toMatchObject({
      code: "REQUEST_NOT_FOUND",
    });
  });
});
