import { test, expect, type Page } from "@playwright/test";

// E2E коммуникации (DoD §5.4 в/г): объявление → отметка о прочтении; заявка → смена статуса.
// Два контекста: председатель настраивает дом и жителя, публикует объявление; житель читает,
// отмечает прочтение и подаёт заявку; председатель меняет статус.

function uniquePhone(): string {
  return `+7774${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
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

test("объявление → прочтение и заявка → смена статуса", async ({ browser }) => {
  const chairPhone = uniquePhone();
  const resiPhone = uniquePhone();

  // ── Председатель: ОСИ → дом → квартира → житель ──
  const chairCtx = await browser.newContext();
  const cp = await chairCtx.newPage();
  await loginByOtp(cp, chairPhone);
  await cp.getByTestId("osi-name").fill("ОСИ Комм");
  await cp.getByTestId("osi-submit").click();
  await cp.getByTestId("building-address").fill("ул. Комм, 1");
  await cp.getByTestId("building-submit").click();
  await cp.getByTestId("building-link").filter({ hasText: "ул. Комм, 1" }).click();
  await cp.waitForURL("**/app/buildings/**");
  const buildingUrl = cp.url();

  await cp.getByTestId("apartment-number").fill("5");
  await cp.getByTestId("apartment-submit").click();
  const aptRow = cp.getByTestId("apartment-row").filter({ hasText: "Кв. 5" });
  await aptRow.getByRole("button", { name: "Житель" }).click();
  await aptRow.getByTestId("resident-name").fill("Житель К");
  await aptRow.getByTestId("resident-phone").fill(resiPhone);
  await aptRow.getByTestId("resident-submit").click();
  await expect(aptRow.getByText("Житель К", { exact: false })).toBeVisible();

  // ── Председатель публикует объявление ──
  await cp.getByTestId("nav-announcements").click();
  await cp.waitForURL("**/announcements");
  await cp.getByTestId("ann-title").fill("Отключение воды");
  await cp.getByTestId("ann-body").fill("Завтра с 10:00 до 14:00");
  await cp.getByTestId("ann-submit").click();
  const annChair = cp.getByTestId("ann-row").filter({ hasText: "Отключение воды" });
  await expect(annChair).toBeVisible();
  await expect(annChair.getByTestId("ann-readcount")).toHaveText("Прочитали: 0");

  // ── Житель: читает объявление, отмечает прочтение, подаёт заявку ──
  const resiCtx = await browser.newContext();
  const rp = await resiCtx.newPage();
  await loginByOtp(rp, resiPhone);

  const annResi = rp.getByTestId("ann-row").filter({ hasText: "Отключение воды" });
  await expect(annResi).toBeVisible();
  await annResi.getByRole("button", { name: "Отметить прочитанным" }).click();
  await expect(annResi.getByTestId("ann-read")).toBeVisible(); // «✓ Прочитано»

  // Подача заявки — на вкладке «Заявки» (таб-бар, срез 8).
  await rp.getByTestId("tab-requests").click();
  await rp.waitForURL("**/app/requests");
  await rp.getByTestId("req-category").selectOption("PLUMBING");
  await rp.getByTestId("req-text").fill("Течёт кран на кухне");
  await rp.getByTestId("req-submit").click();
  const reqResi = rp.getByTestId("request-card").filter({ hasText: "Течёт кран" });
  await expect(reqResi).toBeVisible();
  await expect(reqResi.getByTestId("request-status")).toHaveText("Принята");

  // ── Председатель видит прочтение (счётчик) и меняет статус заявки ──
  await cp.goto(`${buildingUrl}/announcements`);
  await expect(
    cp.getByTestId("ann-row").filter({ hasText: "Отключение воды" }).getByTestId("ann-readcount"),
  ).toHaveText("Прочитали: 1");

  await cp.goto(`${buildingUrl}/requests`);
  const reqChair = cp.getByTestId("request-card").filter({ hasText: "Течёт кран" });
  await expect(reqChair).toBeVisible();
  await reqChair.getByTestId("status-IN_PROGRESS").click();
  await expect(reqChair.getByTestId("status-IN_PROGRESS")).toBeDisabled(); // активный статус

  // ── Житель видит обновлённый статус ──
  await rp.reload();
  await expect(
    rp.getByTestId("request-card").filter({ hasText: "Течёт кран" }).getByTestId("request-status"),
  ).toHaveText("В работе");

  await chairCtx.close();
  await resiCtx.close();
});
