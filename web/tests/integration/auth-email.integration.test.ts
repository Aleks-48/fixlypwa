import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requestOtp, verifyOtp } from "@/lib/auth/otp";
import { checkOtpRequestAllowed } from "@/lib/auth/rateLimit";
import { parseIdentifier } from "@/lib/identifier";
import { forTenant } from "@/lib/db/tenant";
import { createOsiForUser, createBuilding, createApartment, addResident } from "@/lib/onboarding/service";

// Email-канал OTP (auth-email.md, REQ-005..008): challenge с channel=EMAIL, верификация
// создаёт пользователя по email (регистрация, REQ-007), rate-limit по идентификатору,
// приглашение жителя по email дополняет существующий email-аккаунт (ревизия REQ-013).
const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const uniqEmail = () => `authmail-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.kz`;
const uniqPhone = () => `+7783${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

let osi = "";
let chair = "";
let buildingId = "";

beforeAll(async () => {
  const u = await admin.user.create({ data: { phone: uniqPhone() } });
  chair = u.id;
  osi = (await createOsiForUser(chair, { name: `authmail-${Date.now()}` })).id;
  buildingId = (await createBuilding(osi, { address: "authmail-дом" })).id;
});

afterAll(async () => {
  await admin.occupant.deleteMany({ where: { osiId: osi } });
  await admin.apartment.deleteMany({ where: { osiId: osi } });
  await admin.building.deleteMany({ where: { osiId: osi } });
  await admin.osi.delete({ where: { id: osi } });
  await admin.otpChallenge.deleteMany({ where: { identifier: { contains: "@test.kz" } } });
  await admin.user.deleteMany({ where: { email: { contains: "@test.kz" } } });
  await admin.user.deleteMany({ where: { phone: { startsWith: "+7783" } } });
  await admin.$disconnect();
});

describe("Email-OTP: вход и регистрация (REQ-005..008)", () => {
  it("запрос кода создаёт challenge с channel=EMAIL; верный код создаёт пользователя по email (REQ-006/007)", async () => {
    const email = uniqEmail();
    const identifier = parseIdentifier(email)!;
    expect(identifier).toEqual({ kind: "email", value: email });

    await requestOtp(identifier, "127.0.0.1");

    const challenge = await admin.otpChallenge.findFirst({
      where: { identifier: email },
      orderBy: { createdAt: "desc" },
    });
    expect(challenge).not.toBeNull();
    expect(challenge!.channel).toBe("EMAIL");
    expect(challenge!.codeHash).toMatch(/^[0-9a-f]{64}$/); // код не хранится в открытом виде

    // Пользователя ещё нет — аккаунт появляется только после верного кода (REQ-007).
    expect(await admin.user.findUnique({ where: { email } })).toBeNull();

    // Код известен только из письма; в тесте достаём его перебором невозможно — поэтому
    // проверяем неверный код (отказ без создания аккаунта)…
    const bad = await verifyOtp(identifier, "000000");
    expect(bad.ok).toBe(false);
    expect(await admin.user.findUnique({ where: { email } })).toBeNull();
  });

  it("верный код: пользователь создаётся, challenge одноразовый", async () => {
    const email = uniqEmail();
    const identifier = parseIdentifier(email)!;
    await requestOtp(identifier, "127.0.0.1");

    // Целевой хеш пересчитываем так же, как это делает продовый код (sha256(identifier:code)) —
    // перебираем код напрямую нельзя, поэтому подменяем challenge на известный код.
    const { hashOtp } = await import("@/lib/auth/crypto");
    await admin.otpChallenge.updateMany({
      where: { identifier: email },
      data: { codeHash: hashOtp(email, "123456") },
    });

    const result = await verifyOtp(identifier, "123456");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.email).toBe(email);
      expect(result.user.phone).toBeNull(); // email-only аккаунт (users.phone nullable)
      expect(result.user.roles).toHaveLength(0); // регистрация не даёт ролей (REQ-007)
    }

    // Одноразовость: повторная верификация тем же кодом не проходит.
    const again = await verifyOtp(identifier, "123456");
    expect(again.ok).toBe(false);
  });

  it("rate-limit действует по email-идентификатору (NFR-054)", async () => {
    const email = uniqEmail();
    const identifier = parseIdentifier(email)!;
    await requestOtp(identifier, "127.0.0.1");
    // Сразу повторный запрос — упирается в cooldown (OTP_RESEND_COOLDOWN_SECONDS).
    const rate = await checkOtpRequestAllowed(email, "127.0.0.1");
    expect(rate.allowed).toBe(false);
  });

  it("приглашение жителя по email дополняет самозарегистрированный аккаунт (ревизия REQ-013)", async () => {
    const email = uniqEmail();
    // Житель зарегистрировался сам (REQ-007): email-only пользователь без ролей.
    const selfUser = await admin.user.create({ data: { email } });

    const apt = await createApartment(osi, { buildingId, number: "1" });
    const { userId, occupant } = await addResident(osi, {
      apartmentId: apt.id,
      fullName: "Почтовый Житель",
      email,
    });

    // Председатель привязал ТОГО ЖЕ пользователя (не дубль) — роль и квартира появились.
    expect(userId).toBe(selfUser.id);
    expect(occupant.phone).toBeNull();
    const role = await admin.userOsiRole.findUnique({
      where: { userId_osiId: { userId, osiId: osi } },
    });
    expect(role?.role).toBe("RESIDENT");

    // Балансы/данные квартиры доступны через occupant (RLS-путь жителя).
    const occ = await forTenant(osi, (tx) => tx.occupant.findUnique({ where: { userId } }));
    expect(occ?.apartmentId).toBe(apt.id);
  });

  it("addResident без телефона и email отклоняется", async () => {
    const apt = await createApartment(osi, { buildingId, number: "2" });
    await expect(
      addResident(osi, { apartmentId: apt.id, fullName: "Без Контактов" }),
    ).rejects.toThrow("Укажите телефон или email");
  });
});
