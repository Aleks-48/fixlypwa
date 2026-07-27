import { test, expect, type Page } from "@playwright/test";

// E2E Фазы 2: тариф → начисление → платёж → отчёт → публикация → житель видит баланс и отчёт.

function uniquePhone(): string {
  return `+7782${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
}

async function loginByOtp(page: Page, phone: string) {
  await page.goto("/login");
  await page.getByTestId("phone-input").fill(phone);
  await page.getByTestId("request-otp").click();
  const codeText = await page.getByTestId("dev-code").innerText();
  await page.getByTestId("code-input").fill(codeText.replace(/\D/g, "").slice(-6));
  await page.getByTestId("verify-otp").click();
  await page.waitForURL("**/app");
}

test("финансы: тариф → начисление → платёж → отчёт → житель", async ({ browser }) => {
  const chairPhone = uniquePhone();
  const resiPhone = uniquePhone();

  // Председатель: структура.
  const chairCtx = await browser.newContext();
  const cp = await chairCtx.newPage();
  await loginByOtp(cp, chairPhone);
  await cp.getByTestId("osi-name").fill("ОСИ Финанс");
  await cp.getByTestId("osi-submit").click();
  await cp.getByTestId("building-address").fill("ул. Финансовая, 1");
  await cp.getByTestId("building-submit").click();
  await cp.getByTestId("building-link").filter({ hasText: "Финансовая" }).click();
  await cp.waitForURL("**/app/buildings/**");
  const buildingUrl = cp.url();

  await cp.getByTestId("apartment-number").fill("10");
  await cp.getByTestId("apartment-area").fill("50");
  await cp.getByTestId("apartment-submit").click();
  const aptRow = cp.getByTestId("apartment-row").filter({ hasText: "Кв. 10" });
  await aptRow.getByRole("button", { name: "Житель" }).click();
  await aptRow.getByTestId("resident-name").fill("Платящий Житель");
  await aptRow.getByTestId("resident-phone").fill(resiPhone);
  await aptRow.getByTestId("resident-submit").click();
  await expect(aptRow.getByText("Платящий", { exact: false })).toBeVisible();

  // Финансы: тариф 100 ₸/м² → начислить (50 м² → 5000).
  await cp.goto(`${buildingUrl}/finance`);
  await cp.getByTestId("tariff-rate").fill("100");
  await cp.getByTestId("tariff-submit").click();
  await expect(cp.getByTestId("tariff-row")).toBeVisible();

  await cp.getByTestId("charges-generate").click();
  await expect(cp.getByTestId("charges-result")).toContainText("Создано: 1");
  await expect(cp.getByTestId("balance-debt").first()).toContainText("содержание 5000");

  // Платёж 2000 → долг 3000.
  await cp.getByTestId("payment-amount").fill("2000");
  await cp.getByTestId("payment-submit").click();
  await expect(cp.getByTestId("balance-debt").first()).toContainText("содержание 3000");

  // Отчёт: сформировать → открыть → опубликовать.
  await cp.goto(`${buildingUrl}/reports`);
  await cp.getByTestId("report-generate").click();
  await expect(cp.getByTestId("report-row").first()).toBeVisible();
  await cp.getByTestId("report-publish").click();
  await expect(cp.getByTestId("report-published")).toBeVisible();

  // Житель: баланс на Главной + отчёт на Инфо.
  const resiCtx = await browser.newContext();
  const rp = await resiCtx.newPage();
  await loginByOtp(rp, resiPhone);
  await expect(rp.getByTestId("resident-debt")).toContainText("3");

  // Отчёты жителя живут в «Финансы» → вкладка «Отчёты» (заметки п.6/7).
  await rp.getByTestId("tab-payments").click();
  await rp.getByTestId("fin-tab-reports").click();
  await rp.getByTestId("resident-report-link").first().click();
  await rp.waitForURL("**/app/reports/**");
  await expect(rp.getByTestId("report-view")).toBeVisible();
  await expect(rp.getByTestId("rep-debt-maint")).toContainText("3");

  await chairCtx.close();
  await resiCtx.close();
});

test("онлайн-оплата (демо): житель гасит долг через шторку симулятора", async ({ browser }) => {
  const chairPhone = uniquePhone();
  const resiPhone = uniquePhone();

  const chairCtx = await browser.newContext();
  const cp = await chairCtx.newPage();
  await loginByOtp(cp, chairPhone);
  await cp.getByTestId("osi-name").fill("ОСИ Онлайн-Оплата");
  await cp.getByTestId("osi-submit").click();
  await cp.getByTestId("building-address").fill("ул. Онлайн, 1");
  await cp.getByTestId("building-submit").click();
  await cp.getByTestId("building-link").filter({ hasText: "Онлайн" }).click();
  await cp.waitForURL("**/app/buildings/**");
  const buildingUrl = cp.url();

  await cp.getByTestId("apartment-number").fill("20");
  await cp.getByTestId("apartment-area").fill("50");
  await cp.getByTestId("apartment-submit").click();
  const aptRow = cp.getByTestId("apartment-row").filter({ hasText: "Кв. 20" });
  await aptRow.getByRole("button", { name: "Житель" }).click();
  await aptRow.getByTestId("resident-name").fill("Онлайн Плательщик");
  await aptRow.getByTestId("resident-phone").fill(resiPhone);
  await aptRow.getByTestId("resident-submit").click();

  // Тариф 100 ₸/м² → начислить (50 м² → 5000).
  await cp.goto(`${buildingUrl}/finance`);
  await cp.getByTestId("tariff-rate").fill("100");
  await cp.getByTestId("tariff-submit").click();
  await expect(cp.getByTestId("tariff-row")).toBeVisible();
  await cp.getByTestId("charges-generate").click();
  await expect(cp.getByTestId("charges-result")).toContainText("Создано: 1");

  // Житель: реальный флоу через route handler (auth, zod-валидация, симулятор) — не напрямую
  // через сервис, как в интеграционных тестах payments-online.integration.test.ts.
  const resiCtx = await browser.newContext();
  const rp = await resiCtx.newPage();
  await loginByOtp(rp, resiPhone);
  await rp.getByTestId("tab-payments").click();
  await expect(rp.getByTestId("payments-total")).toContainText("5");

  await rp.getByTestId("pay-online").click();
  await rp.getByTestId("pay-online-submit").click();
  // Симулятор имитирует задержку ~1.5с и может (редко, 5%) вернуть отказ — при отказе retry
  // в CI (playwright.config.ts) переиспользует свежий контекст, тест не флейкает систематически.
  await expect(rp.getByTestId("pay-online-result")).toContainText("успешно", { timeout: 5_000 });
  await rp.getByTestId("pay-online-done").click();
  await expect(rp.getByTestId("payments-total")).toContainText("0");

  await chairCtx.close();
  await resiCtx.close();
});
