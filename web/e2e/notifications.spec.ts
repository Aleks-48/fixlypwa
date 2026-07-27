import { test, expect, type Page } from "@playwright/test";

// E2E среза 7 (REQ-100/101): объявление председателя → у жителя колокольчик с непрочитанным →
// открытие панели → «прочитать всё» → счётчик исчезает.

function uniquePhone(): string {
  return `+7776${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
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

test("объявление → уведомление в колокольчике жителя → прочитать всё", async ({ browser }) => {
  const chairPhone = uniquePhone();
  const resiPhone = uniquePhone();

  // Председатель: ОСИ → дом → квартира → житель → объявление.
  const chairCtx = await browser.newContext();
  const cp = await chairCtx.newPage();
  await loginByOtp(cp, chairPhone);
  await cp.getByTestId("osi-name").fill("ОСИ Пуш");
  await cp.getByTestId("osi-submit").click();
  await cp.getByTestId("building-address").fill("ул. Пуш, 9");
  await cp.getByTestId("building-submit").click();
  await cp.getByTestId("building-link").filter({ hasText: "ул. Пуш, 9" }).click();
  await cp.waitForURL("**/app/buildings/**");
  await cp.getByTestId("apartment-number").fill("7");
  await cp.getByTestId("apartment-submit").click();
  const aptRow = cp.getByTestId("apartment-row").filter({ hasText: "Кв. 7" });
  await aptRow.getByRole("button", { name: "Житель" }).click();
  await aptRow.getByTestId("resident-name").fill("Житель Пуш");
  await aptRow.getByTestId("resident-phone").fill(resiPhone);
  await aptRow.getByTestId("resident-submit").click();
  await expect(aptRow.getByText("Житель Пуш", { exact: false })).toBeVisible();

  await cp.getByTestId("nav-announcements").click();
  await cp.getByTestId("ann-title").fill("Проверка уведомлений");
  await cp.getByTestId("ann-body").fill("Текст для колокольчика");
  await cp.getByTestId("ann-submit").click();
  await expect(cp.getByTestId("ann-row").filter({ hasText: "Проверка уведомлений" })).toBeVisible();

  // Житель: входит — на колокольчике непрочитанное.
  const resiCtx = await browser.newContext();
  const rp = await resiCtx.newPage();
  await loginByOtp(rp, resiPhone);

  await expect(rp.getByTestId("bell-count")).toHaveText("1");

  // Открыть панель — уведомление в ленте.
  await rp.getByTestId("bell").click();
  const panel = rp.getByTestId("notifications-panel");
  await expect(panel).toBeVisible();
  await expect(
    panel.getByTestId("notification-item").filter({ hasText: "Проверка уведомлений" }),
  ).toBeVisible();

  // «Прочитать всё» → бейдж исчезает.
  await panel.getByTestId("mark-all-read").click();
  await expect(rp.getByTestId("bell-count")).toHaveCount(0);

  await chairCtx.close();
  await resiCtx.close();
});
