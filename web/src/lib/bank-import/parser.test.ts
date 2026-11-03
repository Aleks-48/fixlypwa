import { expect, it } from "vitest";
import { parseBankStatement } from "./parser";
it("preserves Cyrillic CSV headers and apartment numbers in UTF-8", async () => {
  const csv = "Номер,Дата,Сумма,Назначение,Плательщик\nDEMO,2026-09-24,1500.25,Оплата кв 1,Тестовый житель\nEXP,2026-09-24,-250,Расход,Поставщик";
  const rows = await parseBankStatement(Buffer.from(csv, "utf8"), "demo.csv");
  expect(rows[0]).toMatchObject({ bankRef: "DEMO", amount: 1500.25, detectedApartmentNumber: "1", counterpartyName: "Тестовый житель", type: "INCOME" });
  expect(rows[1]).toMatchObject({ bankRef: "EXP", amount: 250, type: "EXPENSE" });
});
