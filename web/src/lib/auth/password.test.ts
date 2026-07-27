import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing (ADR-0005, NFR-053)", () => {
  it("verify проходит для верного пароля", () => {
    const stored = hashPassword("S3cret-пароль");
    expect(verifyPassword("S3cret-пароль", stored)).toBe(true);
  });

  it("verify отклоняет неверный пароль", () => {
    const stored = hashPassword("correct horse");
    expect(verifyPassword("wrong horse", stored)).toBe(false);
  });

  it("соль случайна: два хеша одного пароля различаются", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });

  it("не падает на повреждённом сохранённом значении", () => {
    expect(verifyPassword("x", "garbage")).toBe(false);
    expect(verifyPassword("x", "scrypt$only-salt")).toBe(false);
  });
});
