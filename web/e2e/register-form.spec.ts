import { test, expect } from "@playwright/test";

// E2E: регистрация на сайте по единой схеме (onboarding-unified.md §0/9, срез R3) — форма
// собирает ФИО (REQ-146/147), «Вход» его НЕ показывает (регрессия защищает разделение форм),
// каталог функций виден в мобильном меню (REQ-140/141). Мобильный вьюпорт (Pixel 7,
// playwright.config.ts) — сайдбар (lg+) скрыт, навигация идёт через хартбургер-меню.

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.kz`;
}

async function requestAndReadCode(page: import("@playwright/test").Page) {
  const devCode = page.getByTestId("dev-code");
  await expect(devCode).toBeVisible();
  return (await devCode.innerText()).replace(/\D/g, "").slice(-6);
}

// page.request — отдельный APIRequestContext БЕЗ куки браузера (в отличие от request-фикстуры
// с Bearer в onboarding-unified.spec.ts, здесь сессия — httpOnly cookie). fetch внутри
// page.evaluate выполняется САМИМ браузером — куки идут автоматически, тот же путь, что и
// обычная навигация формы.
async function fetchMe(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const res = await fetch("/api/auth/me");
    return (await res.json()) as { data?: { user: { fullName: string | null } } };
  });
}

test("/login не показывает поле ФИО — оно только для регистрации", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("phone-input")).toBeVisible();
  await expect(page.getByTestId("fullname-input")).toHaveCount(0);
});

test("регистрация жителя на сайте собирает ФИО (REQ-146/147)", async ({ page }) => {
  const email = uniqueEmail("site-resident");
  await page.goto("/register");
  await expect(page.getByTestId("register-role-resident")).toHaveAttribute("aria-pressed", "true");

  await page.getByTestId("fullname-input").fill("Сайт Житель Тестов");
  await page.getByTestId("phone-input").fill(email);
  await page.getByTestId("request-otp").click();

  const code = await requestAndReadCode(page);
  await page.getByTestId("code-input").fill(code);
  await page.getByTestId("verify-otp").click();
  await page.waitForURL(/\/app/);

  const { data } = await fetchMe(page);
  expect(data?.user.fullName).toBe("Сайт Житель Тестов");
});

test("регистрация председателя на сайте собирает ФИО (REQ-146/147)", async ({ page }) => {
  const email = uniqueEmail("site-chairman");
  await page.goto("/register?role=chairman");
  await expect(page.getByTestId("register-role-chairman")).toHaveAttribute("aria-pressed", "true");

  await page.getByTestId("fullname-input").fill("Сайт Председатель Тестов");
  await page.getByTestId("phone-input").fill(email);
  await page.getByTestId("request-otp").click();

  const code = await requestAndReadCode(page);
  await page.getByTestId("code-input").fill(code);
  await page.getByTestId("verify-otp").click();
  await page.waitForURL(/\/app/);

  const { data } = await fetchMe(page);
  expect(data?.user.fullName).toBe("Сайт Председатель Тестов");
});

test("каталог функций виден в мобильном меню («Скоро», REQ-140/141)", async ({ page }) => {
  const email = uniqueEmail("site-catalog");
  await page.goto("/register?role=chairman");
  await page.getByTestId("fullname-input").fill("Каталог Председатель");
  await page.getByTestId("phone-input").fill(email);
  await page.getByTestId("request-otp").click();

  const code = await requestAndReadCode(page);
  await page.getByTestId("code-input").fill(code);
  await page.getByTestId("verify-otp").click();
  await page.waitForURL(/\/app/);

  // Сайдбар/меню рисуются только для пользователя с ролью в ОСИ (getShellContext) — создаём
  // ОСИ фетчем ИЗ БРАУЗЕРА (см. fetchMe — куки идут автоматически), затем перечитываем страницу.
  const osiOk = await page.evaluate(async (name) => {
    const res = await fetch("/api/osi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return res.ok;
  }, `Тест-ОСИ-каталог-${Date.now()}`);
  expect(osiOk).toBe(true);
  await page.reload();

  await page.getByTestId("mobile-menu").click();
  // Скоуп на меню-шторку: тот же <details> присутствует и в скрытом desktop-сайдбаре (aside),
  // видимом только на lg+, но остающемся в DOM.
  const menu = page.getByLabel("Все разделы");
  const soon = menu.getByText(/^Скоро \(\d+\)$/);
  await expect(soon).toBeVisible();
  await soon.click();
  await expect(menu.getByText("Юридически значимые голосования")).toBeVisible();
});
