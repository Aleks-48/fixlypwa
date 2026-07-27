import { describe, expect, it } from "vitest";
import { parseIdentifier } from "./identifier";

// REQ-005 (auth-email.md §1): '@' → email (lowercase), иначе — казахстанский телефон.
describe("parseIdentifier", () => {
  it("телефон в разных записях нормализуется к E.164", () => {
    expect(parseIdentifier("+7 701 000 00 01")).toEqual({ kind: "phone", value: "+77010000001" });
    expect(parseIdentifier("87010000001")).toEqual({ kind: "phone", value: "+77010000001" });
    expect(parseIdentifier("7010000001")).toEqual({ kind: "phone", value: "+77010000001" });
  });

  it("email приводится к lowercase и trim", () => {
    expect(parseIdentifier("  Rahim@Example.KZ ")).toEqual({
      kind: "email",
      value: "rahim@example.kz",
    });
  });

  it("мусор отклоняется", () => {
    expect(parseIdentifier("")).toBeNull();
    expect(parseIdentifier("   ")).toBeNull();
    expect(parseIdentifier("не телефон")).toBeNull();
    expect(parseIdentifier("12345")).toBeNull(); // слишком короткий для номера РК
    expect(parseIdentifier("@nodomain")).toBeNull();
    expect(parseIdentifier("user@")).toBeNull();
    expect(parseIdentifier("user@host")).toBeNull(); // нет точки в домене
    expect(parseIdentifier("a b@mail.kz")).toBeNull(); // пробел в адресе
  });

  it("иностранный номер отклоняется (нормализация только РК)", () => {
    expect(parseIdentifier("+1 202 555 0100")).toBeNull();
  });
});
