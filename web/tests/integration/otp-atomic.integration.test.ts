import { PrismaClient } from "@prisma/client";
import { afterAll, expect, it } from "vitest";
import { verifyOtp } from "@/lib/auth/otp";
import { hashOtp } from "@/lib/auth/crypto";
import { randomUUID } from "node:crypto";

const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
afterAll(() => admin.$disconnect());
it("uses an OTP once concurrently and saves full name and session atomically", async () => {
  const email = `atomic-${randomUUID()}@example.test`;
  await admin.otpChallenge.create({ data: { identifier: email, channel: "EMAIL", codeHash: hashOtp(email, "123456"), expiresAt: new Date(Date.now() + 60000) } });
  try {
    const results = await Promise.all([verifyOtp({ kind: "email", value: email }, "123456", "Тестовый житель", true), verifyOtp({ kind: "email", value: email }, "123456", "Тестовый житель", true)]);
    expect(results.filter(r => r.ok)).toHaveLength(1);
    const user = await admin.user.findUniqueOrThrow({ where: { email }, include: { sessions: true } });
    expect(user.fullName).toBe("Тестовый житель");
    expect(user.sessions).toHaveLength(1);
  } finally {
    await admin.user.deleteMany({ where: { email } });
    await admin.otpChallenge.deleteMany({ where: { identifier: email } });
  }
});
it("rolls back OTP consumption when the user update fails", async () => {
  const email = `rollback-${randomUUID()}@example.test`;
  await admin.otpChallenge.create({ data: { identifier: email, channel: "EMAIL", codeHash: hashOtp(email, "123456"), expiresAt: new Date(Date.now() + 60000) } });
  try {
    // PostgreSQL text forbids NUL; the failure occurs after the OTP update inside the transaction.
    await expect(verifyOtp({ kind: "email", value: email }, "123456", "bad\0name", true)).rejects.toThrow();
    expect((await admin.otpChallenge.findFirstOrThrow({ where: { identifier: email } })).consumedAt).toBeNull();
    expect((await verifyOtp({ kind: "email", value: email }, "123456", "Valid name", true)).ok).toBe(true);
  } finally {
    await admin.user.deleteMany({ where: { email } });
    await admin.otpChallenge.deleteMany({ where: { identifier: email } });
  }
});
