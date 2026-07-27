import { execSync } from "child_process";
import { test, expect, type Page } from "@playwright/test";

// E2E маркетплейса заявок (ADR-0009, marketplace.md): председатель публикует заявку мастерам →
// мастер (после ручного одобрения, Q-053) видит заказ и откликается → председатель принимает
// отклик → мастеру раскрывается контакт. Плюс проверка приватности: ФИО жителя нигде не
// попадает на страницы мастера ни до, ни после принятия отклика.

const CITY = "Кокшетау"; // дефолт Building.city — должен совпасть с городом анкеты мастера

function uniquePhone(): string {
  return `+7775${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
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

test("маркетплейс: публикация → отклик мастера → принятие → раскрытие контакта", async ({ browser }) => {
  test.setTimeout(60_000); // одобрение мастера шелл-скриптом (npx tsx) добавляет время старта

  const chairPhone = uniquePhone();
  const resiPhone = uniquePhone();
  const masterPhone = uniquePhone();
  const residentFullName = "Житель МаркетПриватность"; // не должно светиться на страницах мастера

  // ── Председатель: ОСИ → дом → квартира → житель ──
  const chairCtx = await browser.newContext();
  const cp = await chairCtx.newPage();
  await loginByOtp(cp, chairPhone);
  await cp.getByTestId("osi-name").fill("ОСИ Маркетплейс");
  await cp.getByTestId("osi-submit").click();
  await cp.getByTestId("building-address").fill("ул. Маркетная, 1");
  await cp.getByTestId("building-submit").click();
  await cp.getByTestId("building-link").filter({ hasText: "ул. Маркетная, 1" }).click();
  await cp.waitForURL("**/app/buildings/**");
  const buildingUrl = cp.url();

  await cp.getByTestId("apartment-number").fill("9");
  await cp.getByTestId("apartment-submit").click();
  const aptRow = cp.getByTestId("apartment-row").filter({ hasText: "Кв. 9" });
  await aptRow.getByRole("button", { name: "Житель" }).click();
  await aptRow.getByTestId("resident-name").fill(residentFullName);
  await aptRow.getByTestId("resident-phone").fill(resiPhone);
  await aptRow.getByTestId("resident-submit").click();
  await expect(aptRow.getByText(residentFullName, { exact: false })).toBeVisible();

  // ── Житель подаёт заявку ──
  const resiCtx = await browser.newContext();
  const rp = await resiCtx.newPage();
  await loginByOtp(rp, resiPhone);
  await rp.getByTestId("tab-requests").click();
  await rp.waitForURL("**/app/requests");
  await rp.getByTestId("req-category").selectOption("PLUMBING");
  await rp.getByTestId("req-text").fill("Течёт кран — маркетплейс-тест");
  await rp.getByTestId("req-submit").click();
  await expect(
    rp.getByTestId("request-card").filter({ hasText: "маркетплейс-тест" }),
  ).toBeVisible();

  // ── Председатель публикует заявку мастерам ──
  await cp.goto(`${buildingUrl}/requests`);
  const reqChair = cp.getByTestId("request-card").filter({ hasText: "маркетплейс-тест" });
  await expect(reqChair).toBeVisible();
  await reqChair.getByTestId("publish-to-market").click();
  await cp.getByTestId("market-publish-submit").click();
  await expect(reqChair.getByTestId("market-status-published")).toBeVisible();
  // Приватность: председатель формирует листинг без квартиры/телефона жителя — сам диалог
  // публикации их и не показывал; после публикации бейдж не содержит ПДн.
  await expect(reqChair.getByTestId("market-status-published")).not.toContainText(resiPhone);

  // ── Мастер регистрируется (тот же город, категория «Сантехника») ──
  const masterCtx = await browser.newContext();
  const mp = await masterCtx.newPage();
  await mp.goto("/register?role=master");
  await mp.getByTestId("master-phone-input").fill(masterPhone);
  await mp.getByTestId("master-request-otp").click();
  const masterCode = await mp.getByTestId("master-dev-code").innerText();
  await mp.getByTestId("master-code-input").fill(masterCode.replace(/\D/g, "").slice(-6));
  await mp.getByTestId("master-verify-otp").click();
  await mp.getByTestId("master-fullname").fill("Мастер Тестовый");
  await mp.getByTestId("master-city").fill(CITY);
  await mp.getByTestId("master-cat-PLUMBING").click();
  await mp.getByTestId("master-submit-profile").click();
  await mp.waitForURL("**/master");
  await expect(mp.getByTestId("master-status-pending")).toBeVisible();

  // Приватность: анкета «на проверке» не может знать о заявке/жителе.
  await expect(mp.locator("body")).not.toContainText(residentFullName);

  // ── Ручное одобрение (Q-053, как в проде — тот же CLI-скрипт) ──
  execSync(`npx tsx scripts/approve-master.ts ${masterPhone}`, {
    cwd: process.cwd(),
    stdio: "pipe",
  });

  // ── Мастер видит заказ (без квартиры/ФИО жителя) и откликается ──
  await mp.reload();
  await expect(mp.getByTestId("master-status-approved")).toBeVisible();
  const listingCard = mp.getByTestId("listing-card").filter({ hasText: "маркетплейс-тест" });
  await expect(listingCard).toBeVisible();
  await expect(listingCard).not.toContainText(residentFullName);
  await expect(listingCard).not.toContainText(resiPhone);
  await expect(listingCard).not.toContainText("кв. 9");

  await listingCard.getByTestId("respond-to-listing").click();
  await mp.getByTestId("offer-message").fill("Могу подъехать сегодня вечером");
  await mp.getByTestId("offer-submit").click();
  await expect(listingCard.getByTestId("my-listing-offer-status")).toHaveText("Отклик отправлен");

  // ── Председатель видит отклик и принимает его ──
  await cp.reload();
  const offerRow = reqChair.getByTestId("offer-row").filter({ hasText: "Мастер Тестовый" });
  await expect(offerRow).toBeVisible();
  await offerRow.getByTestId("offer-accept").click();
  const takenPanel = reqChair.getByTestId("market-status-taken");
  await expect(takenPanel).toBeVisible();
  await expect(takenPanel).toContainText("Мастер Тестовый");
  await expect(takenPanel).toContainText(masterPhone); // раскрыт ПОСЛЕ принятия — это ожидаемо

  // ── Мастер видит, что отклик принят (вкладка «Мои отклики») ──
  await mp.reload();
  await mp.getByTestId("master-tab-offers").click();
  const myOfferRow = mp.getByTestId("my-offer-row").filter({ hasText: "маркетплейс-тест" });
  await expect(myOfferRow).toBeVisible();
  await expect(myOfferRow.getByTestId("my-offer-status")).toHaveText("Отклик принят");
  // Приватность: даже после принятия карточка отклика не показывает ФИО/квартиру жителя —
  // контакт для связи передаётся вне приложения (председатель↔мастер по телефону).
  await expect(myOfferRow).not.toContainText(residentFullName);

  await chairCtx.close();
  await resiCtx.close();
  await masterCtx.close();
});
