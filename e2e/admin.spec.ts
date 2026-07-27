import { execSync } from "child_process";
import { test, expect, type Page } from "@playwright/test";

// E2E админки платформы (ADR-0008, admin-panel.md DoD §8):
//  1. гейт: не вошедший → redirect /login; вошедший НЕ-суперадмин → 404 (существование
//     /admin не подтверждаем);
//  2. суперадмин (назначен CLI make-superadmin — единственный путь, из веба эскалации нет)
//     одобряет PENDING-мастера через UI → мастер видит витрину (замыкает Q-053: раньше
//     одобрение было только CLI approve-master).

const CITY = "Кокшетау";

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

test("админка: гейт по isSuperadmin + одобрение мастера через UI", async ({ browser }) => {
  test.setTimeout(60_000); // make-superadmin шелл-скриптом (npx tsx) добавляет время старта

  const adminPhone = uniquePhone();
  const masterPhone = uniquePhone();

  // ── Гейт: не вошедший → redirect на /login ──
  const anonCtx = await browser.newContext();
  const anon = await anonCtx.newPage();
  await anon.goto("/admin");
  await anon.waitForURL("**/login");
  await anonCtx.close();

  // ── Мастер подаёт анкету (PENDING) ──
  const masterCtx = await browser.newContext();
  const mp = await masterCtx.newPage();
  await mp.goto("/register?role=master");
  await mp.getByTestId("master-phone-input").fill(masterPhone);
  await mp.getByTestId("master-request-otp").click();
  const masterCode = await mp.getByTestId("master-dev-code").innerText();
  await mp.getByTestId("master-code-input").fill(masterCode.replace(/\D/g, "").slice(-6));
  await mp.getByTestId("master-verify-otp").click();
  await mp.getByTestId("master-fullname").fill("Мастер Админтест");
  await mp.getByTestId("master-city").fill(CITY);
  await mp.getByTestId("master-cat-ELECTRICITY").click();
  await mp.getByTestId("master-submit-profile").click();
  await mp.waitForURL("**/master");
  await expect(mp.getByTestId("master-status-pending")).toBeVisible();

  // ── Гейт: вошедший ОБЫЧНЫЙ пользователь получает 404 на /admin ──
  const userCtx = await browser.newContext();
  const up = await userCtx.newPage();
  await loginByOtp(up, adminPhone);
  const forbidden = await up.goto("/admin");
  expect(forbidden?.status()).toBe(404);

  // ── Назначение суперадмина — ТОЛЬКО CLI (ADR-0008); сессия жива, флаг подхватится ──
  execSync(`npx tsx scripts/make-superadmin.ts ${adminPhone}`, {
    cwd: process.cwd(),
    stdio: "pipe",
  });

  // ── Суперадмин одобряет мастера через UI (REQ-114) ──
  await up.goto("/admin/masters");
  const card = up.getByTestId("admin-master-card").filter({ hasText: "Мастер Админтест" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("На проверке");
  await card.getByTestId("master-approve").click();
  await expect(card.getByText("Одобрен", { exact: true })).toBeVisible();

  // ── Мастер видит витрину (доступ открыт) ──
  await mp.reload();
  await expect(mp.getByTestId("master-status-approved")).toBeVisible();

  await userCtx.close();
  await masterCtx.close();
});
