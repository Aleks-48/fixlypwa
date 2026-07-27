import { describe, it, expect } from "vitest";
import { generateState, hashState, verifyState, aituConfigured } from "./aitu";

describe("Aitu OAuth адаптер (гос-слой)", () => {
  it("verifyState: валиден только исходный state (CSRF)", () => {
    const state = generateState();
    const cookieHash = hashState(state);
    expect(verifyState(cookieHash, state)).toBe(true);
    expect(verifyState(cookieHash, "forged")).toBe(false);
    expect(verifyState(undefined, state)).toBe(false);
    expect(verifyState(cookieHash, null)).toBe(false);
  });

  it("без партнёрских ключей адаптер выключен", () => {
    // В тестовом окружении AITU_CLIENT_ID/SECRET не заданы.
    expect(aituConfigured()).toBe(false);
  });
});
