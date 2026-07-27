import { test, expect } from "@playwright/test";

// E2E: вход жителя по телефону+OTP (DoD §5.4б). SMS_PROVIDER=console → код показывается в UI
// как dev-подсказка, тест его считывает. Требует поднятой БД (app_login) и prod-сборки (PWA).

function uniquePhone(): string {
  // Случайный валидный номер РК: Date.now() коллидировал между параллельными воркерами
  // (одинаковый суффикс → cooldown OTP на второй запрос).
  return `+7770${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
}

test("житель входит по OTP и попадает в кабинет", async ({ page }) => {
  const phone = uniquePhone();

  await page.goto("/login");
  await expect(page.getByTestId("phone-input")).toBeVisible();

  await page.getByTestId("phone-input").fill(phone);
  await page.getByTestId("request-otp").click();

  // Появился шаг ввода кода с dev-подсказкой.
  const devCode = page.getByTestId("dev-code");
  await expect(devCode).toBeVisible();
  const codeText = await devCode.innerText();
  const code = codeText.replace(/\D/g, "").slice(-6);
  expect(code).toMatch(/^\d{6}$/);

  await page.getByTestId("code-input").fill(code);
  await page.getByTestId("verify-otp").click();

  // Редирект в кабинет.
  await page.waitForURL("**/app");
  await expect(page.getByTestId("me")).toBeVisible();
});

test("неверный код отклоняется", async ({ page }) => {
  const phone = uniquePhone();
  await page.goto("/login");
  await page.getByTestId("phone-input").fill(phone);
  await page.getByTestId("request-otp").click();
  await expect(page.getByTestId("dev-code")).toBeVisible();

  await page.getByTestId("code-input").fill("000000");
  await page.getByTestId("verify-otp").click();

  await expect(page.getByTestId("error")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
