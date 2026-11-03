import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const data = JSON.parse(fs.readFileSync("../.local-run/qa-credentials.json", "utf8"));
const out = path.resolve("../artifacts/qa-2026-09-26");
fs.mkdirSync(out, { recursive: true });
const results = [];
async function main() {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  try {
    for (const role of ["chairman", "resident", "master"]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        locale: "ru-RU",
        colorScheme: "light",
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(60000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      try {
        await page.goto(
          "http://127.0.0.1:3000/login" + (role === "chairman" ? "?role=chairman" : ""),
          { waitUntil: "domcontentloaded", timeout: 180000 },
        );
        if (role === "chairman") {
          await page.getByTestId("email-input").fill(data.chairEmail);
          await page.getByTestId("password-input").fill(data.password);
          await page.getByTestId("login-submit").click();
        } else {
          await page
            .getByTestId("phone-input")
            .fill(role === "resident" ? data.residentPhone : data.masterPhone);
          await page.getByTestId("request-otp").click();
          const hint = page.getByTestId("dev-code");
          await hint.waitFor({ state: "visible", timeout: 90000 });
          const code = (await hint.innerText()).replace(/\D/g, "").slice(-6);
          if (!/^\d{6}$/.test(code)) throw Error("No local OTP hint");
          await page.getByTestId("code-input").fill(code);
          await page.getByTestId("verify-otp").click();
        }
        await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 180000 });
        results.push({ role, check: "login", ok: true });
        const buildingsResponse = await context.request.get("http://127.0.0.1:3000/api/buildings");
        if (role === "chairman") {
          const buildings = (await buildingsResponse.json()).data?.buildings;
          if (
            !Array.isArray(buildings) ||
            buildings.length !== 1 ||
            buildings[0].id !== data.buildingId
          )
            throw Error("Tenant isolation failed: unexpected buildings");
          results.push({ role, check: "only own building is visible", ok: true });
        } else {
          if (buildingsResponse.status() !== 403) throw Error("Chairman API allowed another role");
          results.push({ role, check: "chairman API denied", ok: true });
        }
        const routes =
          role === "chairman"
            ? [
                ["dashboard", "/app"],
                ["finance", "/app/buildings/" + data.buildingId + "/finance"],
                ["documents", "/app/buildings/" + data.buildingId + "/documents"],
                ["polls", "/app/buildings/" + data.buildingId + "/polls"],
              ]
            : role === "resident"
              ? [
                  ["payments", "/app/payments"],
                  ["documents", "/app/documents"],
                  ["requests", "/app/requests"],
                  ["receipt", "/app/payments/receipt"],
                ]
              : [["dashboard", "/master"]];
        for (const [name, route] of routes) {
          const response = await page.goto("http://127.0.0.1:3000" + route, {
            waitUntil: "domcontentloaded",
            timeout: 180000,
          });
          await page.locator("body").waitFor();
          await page.waitForTimeout(1200);
          if (role === "master")
            await page.getByText("Пока нет отзывов", { exact: true }).waitFor();
          if (response.status() !== 200) throw Error(route + " returned " + response.status());
          if (page.url().includes("/login")) throw Error("Unexpected logout");
          const text = await page.locator("body").innerText();
          if (
            /PrismaClientKnownRequestError|Application error|Runtime Error|Internal Server Error/.test(
              text,
            )
          )
            throw Error("Runtime error on " + route);
          const screenshot = role + "-" + name + ".png";
          await page.screenshot({ path: path.join(out, screenshot), fullPage: false });
          results.push({ role, check: route, ok: true, screenshot });
          console.log(role + ": " + name + " OK");
        }
        if (role === "master") {
          await page.getByRole("button", { name: /Моё портфолио/ }).click();
          if (
            !(await page
              .getByRole("heading", { name: "Техническая проверка портфолио", exact: true })
              .count())
          ) {
            await page.getByRole("button", { name: "Добавить работу", exact: true }).click();
            await page
              .getByLabel("Название работы", { exact: true })
              .fill("Техническая проверка портфолио");
            await page
              .getByLabel("Описание работы", { exact: true })
              .fill("Тестовая работа: сохранена через API и повторно прочитана из базы.");
            await page
              .getByRole("dialog")
              .getByRole("button", { name: "Сохранить", exact: true })
              .click();
            await page.getByRole("dialog").waitFor({ state: "hidden" });
          }
          await page
            .getByRole("heading", { name: "Техническая проверка портфолио", exact: true })
            .waitFor();
          await page.screenshot({ path: path.join(out, "master-portfolio.png") });
          results.push({
            role,
            check: "portfolio saved and read from API",
            ok: true,
            screenshot: "master-portfolio.png",
          });
          await page.getByRole("button", { name: /Заказы города/ }).click();
          const card = page
            .getByRole("heading", { name: "Тестовая заявка: осмотр крана", exact: true })
            .locator("..");
          const respond = card.getByRole("button", { name: "Откликнуться", exact: true });
          if (await respond.count()) {
            await respond.click();
            await page
              .getByLabel("Сообщение председателю", { exact: true })
              .fill("Техническая проверка: готов выполнить осмотр");
            await page.getByLabel("Цена", { exact: true }).fill("1500");
            await page
              .getByRole("dialog")
              .getByRole("button", { name: "Откликнуться", exact: true })
              .click();
            await page.getByRole("dialog").waitFor({ state: "hidden" });
          }
          await page.getByRole("button", { name: /Мои отклики/ }).click();
          await page
            .getByText("Техническая проверка: готов выполнить осмотр", { exact: true })
            .waitFor();
          await page.screenshot({ path: path.join(out, "master-offers.png") });
          results.push({
            role,
            check: "offer saved and visible",
            ok: true,
            screenshot: "master-offers.png",
          });
        }
        if (role !== "master") {
          const file = await context.request.get("http://127.0.0.1:3000" + data.documentUrl);
          if (file.status() !== 200) throw Error("Own file unavailable: " + file.status());
          results.push({ role, check: "authorized document download", ok: true });
        } else {
          const file = await context.request.get("http://127.0.0.1:3000" + data.documentUrl);
          if (file.status() !== 404) throw Error("Unrelated master can read a house document");
          results.push({ role, check: "house document denied to unrelated master", ok: true });
        }
        if (errors.length) throw Error(errors.join("\n"));
      } catch (e) {
        await page.screenshot({ path: path.join(out, role + "-failure.png") }).catch(() => {});
        results.push({ role, ok: false, error: e.message });
        console.error(role + ": " + e.message);
      } finally {
        await context.close();
        fs.writeFileSync(path.join(out, "browser-results.json"), JSON.stringify(results, null, 2));
      }
    }
    const anon = await browser.newContext();
    const response = await anon.request.get("http://127.0.0.1:3000" + data.documentUrl);
    results.push({
      check: "anonymous document denied",
      ok: response.status() === 401,
      status: response.status(),
    });
    await anon.close();
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out, "browser-results.json"), JSON.stringify(results, null, 2));
  }
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
