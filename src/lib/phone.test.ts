import { describe, it, expect } from "vitest";
import { normalizeKzPhone, maskPhone } from "./phone";

describe("normalizeKzPhone (REQ-001)", () => {
  it("нормализует запись через 8", () => {
    expect(normalizeKzPhone("87010000001")).toBe("+77010000001");
  });

  it("принимает уже нормализованный +7", () => {
    expect(normalizeKzPhone("+7 701 000 00 01")).toBe("+77010000001");
  });

  it("принимает разделители и скобки", () => {
    expect(normalizeKzPhone("8 (701) 000-00-01")).toBe("+77010000001");
  });

  it("отклоняет слишком короткий номер", () => {
    expect(normalizeKzPhone("7010001")).toBeNull();
  });

  it("отклоняет номер с неверным мобильным префиксом", () => {
    // код страны 7, но следующий разряд не 7 (не мобильный РК)
    expect(normalizeKzPhone("71234567890")).toBeNull();
  });

  it("отклоняет пустую строку", () => {
    expect(normalizeKzPhone("")).toBeNull();
  });
});

describe("maskPhone", () => {
  it("скрывает середину номера", () => {
    expect(maskPhone("+77010000001")).toBe("+77***01");
  });
});
