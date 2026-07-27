import { test, expect, type Page } from "@playwright/test";

// E2E опросов (Тир 1 lite): председатель создаёт опрос → житель голосует → результат виден.

function uniquePhone(): string {
  return `+7779${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
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

test("опрос: создание председателем → голос жителя → проценты", async ({ browser }) => {
  const chairPhone = uniquePhone();
  const resiPhone = uniquePhone();

  const chairCtx = await browser.newContext();
  const cp = await chairCtx.newPage();
  await loginByOtp(cp, chairPhone);
  await cp.getByTestId("osi-name").fill("ОСИ Опрос");
  await cp.getByTestId("osi-submit").click();
  await cp.getByTestId("building-address").fill("ул. Опросная, 3");
  await cp.getByTestId("building-submit").click();
  await cp.getByTestId("building-link").filter({ hasText: "ул. Опросная, 3" }).click();
  await cp.waitForURL("**/app/buildings/**");
  await cp.getByTestId("apartment-number").fill("2");
  await cp.getByTestId("apartment-submit").click();
  const aptRow = cp.getByTestId("apartment-row").filter({ hasText: "Кв. 2" });
  await aptRow.getByRole("button", { name: "Житель" }).click();
  await aptRow.getByTestId("resident-name").fill("Голосующий");
  await aptRow.getByTestId("resident-phone").fill(resiPhone);
  await aptRow.getByTestId("resident-submit").click();
  await expect(aptRow.getByText("Голосующий", { exact: false })).toBeVisible();

  // Создать опрос.
  await cp.getByTestId("nav-polls").click();
  await cp.waitForURL("**/polls");
  await cp.getByTestId("poll-question").fill("Ставим шлагбаум?");
  await cp.getByTestId("poll-submit").click();
  await expect(cp.getByTestId("poll-card").filter({ hasText: "шлагбаум" })).toBeVisible();

  // Житель голосует с Главной.
  const resiCtx = await browser.newContext();
  const rp = await resiCtx.newPage();
  await loginByOtp(rp, resiPhone);
  const pollResi = rp.getByTestId("poll-card").filter({ hasText: "шлагбаум" });
  await expect(pollResi).toBeVisible();
  await pollResi.getByTestId("poll-option").first().click(); // «Да»

  // После голоса — результаты: мой вариант отмечен, 100%.
  await expect(pollResi.getByTestId("poll-my-option")).toBeVisible();
  await expect(pollResi.getByTestId("poll-pct").first()).toHaveText("100% (1)");

  // Председатель видит живой результат.
  await cp.reload();
  await expect(
    cp.getByTestId("poll-card").filter({ hasText: "шлагбаум" }).getByTestId("poll-pct").first(),
  ).toHaveText("100% (1)");

  await chairCtx.close();
  await resiCtx.close();
});
