import { describe, it, expect, vi } from "vitest";

// Юнит-тест дисциплины deny-by-default (ADR-0006): forTenant обязан упасть без osiId,
// НЕ выполнив запрос, который иначе молча вернул бы 0 строк и замаскировал баг авторизации.
// Мокаем prisma, чтобы не требовать БД (это остаётся для integration-теста RLS, срез 3).
vi.mock("./prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
      fn({ $queryRaw: vi.fn(async () => []) }),
    ),
  },
}));

import { forTenant } from "./tenant";
import { prisma } from "./prisma";

describe("forTenant — deny-by-default (ADR-0006)", () => {
  it("бросает ошибку при пустом osiId и не открывает транзакцию", async () => {
    await expect(forTenant("", async () => "unreachable")).rejects.toThrow(
      /osiId is required/,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("оборачивает вызов в транзакцию при валидном osiId", async () => {
    const result = await forTenant(
      "11111111-1111-1111-1111-111111111111",
      async () => "ok",
    );
    expect(result).toBe("ok");
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });
});
