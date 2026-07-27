import { test, expect } from "@playwright/test";

// E2E онбординга (DoD §5.4а): ОСИ → дом → квартира → житель. Полностью через UI, без сида:
// житель входит по OTP, создаёт свою ОСИ (Q-051 → становится председателем), затем ведёт структуру.

function uniquePhone(): string {
  return `+7773${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
}

async function loginByOtp(page: import("@playwright/test").Page, phone: string) {
  await page.goto("/login");
  await page.getByTestId("phone-input").fill(phone);
  await page.getByTestId("request-otp").click();
  const codeText = await page.getByTestId("dev-code").innerText();
  const code = codeText.replace(/\D/g, "").slice(-6);
  await page.getByTestId("code-input").fill(code);
  await page.getByTestId("verify-otp").click();
  await page.waitForURL("**/app");
}

test("председатель заводит ОСИ → дом → квартиру → жителя", async ({ page }) => {
  await loginByOtp(page, uniquePhone());

  // Новый пользователь без ОСИ — предложение создать (Q-051).
  await page.getByTestId("osi-name").fill("ОСИ Тестовая");
  await page.getByTestId("osi-submit").click();

  // Стал председателем: появился блок «Дома».
  await expect(page.getByRole("heading", { name: /Дома/ })).toBeVisible();

  // Добавляем дом.
  await page.getByTestId("building-address").fill("ул. Тестовая, 7");
  await page.getByTestId("building-submit").click();
  const buildingLink = page.getByTestId("building-link").filter({ hasText: "ул. Тестовая, 7" });
  await expect(buildingLink).toBeVisible();

  // Заходим в дом, добавляем квартиру.
  await buildingLink.click();
  await page.waitForURL("**/app/buildings/**");
  await page.getByTestId("apartment-number").fill("42");
  await page.getByTestId("apartment-submit").click();
  await expect(page.getByTestId("apartment-row").filter({ hasText: "Кв. 42" })).toBeVisible();

  // Привязываем жителя к квартире.
  const row = page.getByTestId("apartment-row").filter({ hasText: "Кв. 42" });
  await row.getByRole("button", { name: "Житель" }).click();
  await row.getByTestId("resident-name").fill("Пётр Тестов");
  await row.getByTestId("resident-phone").fill(uniquePhone());
  await row.getByTestId("resident-submit").click();
  await expect(row.getByText("Пётр Тестов", { exact: false })).toBeVisible();
});
