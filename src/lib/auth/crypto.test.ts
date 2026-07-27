import { describe, it, expect } from "vitest";
import {
  generateSessionToken,
  hashToken,
  generateOtpCode,
  hashOtp,
  safeEqualHex,
} from "./crypto";

describe("session tokens (ADR-0005)", () => {
  it("hashToken детерминирован и не равен исходному токену", () => {
    const t = generateSessionToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(t);
    expect(hashToken(t)).toHaveLength(64); // sha256 hex
  });

  it("токены уникальны", () => {
    expect(generateSessionToken()).not.toBe(generateSessionToken());
  });
});

describe("OTP", () => {
  it("код — ровно 6 цифр", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });

  it("хеш кода привязан к телефону (одинаковый код на разных номерах → разные хеши)", () => {
    expect(hashOtp("+77010000001", "123456")).not.toBe(
      hashOtp("+77010000002", "123456"),
    );
  });

  it("safeEqualHex сравнивает корректно", () => {
    const a = hashOtp("+77010000001", "123456");
    expect(safeEqualHex(a, a)).toBe(true);
    expect(safeEqualHex(a, hashOtp("+77010000001", "000000"))).toBe(false);
    expect(safeEqualHex("aa", "aabb")).toBe(false);
  });
});
