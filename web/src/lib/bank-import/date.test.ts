import { expect, it } from "vitest";
import { parseStatementDate } from "./date";
it("reads local, ISO and Excel dates consistently", () => {
  expect(parseStatementDate("24.09.2026").toISOString()).toBe("2026-09-24T00:00:00.000Z");
  expect(parseStatementDate("2026-09-24").toISOString()).toBe("2026-09-24T00:00:00.000Z");
  expect(parseStatementDate(1).toISOString()).toBe("1900-01-01T00:00:00.000Z");
});
it("does not substitute today for missing or invalid dates", () => {
  for (const value of [undefined, "", "31.02.2026", "garbage", "2026-13-01"]) expect(() => parseStatementDate(value)).toThrow();
});
