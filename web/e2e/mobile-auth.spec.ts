import { test, expect } from "@playwright/test";

// E2E: Bearer-авторизация для нативного клиента (ADR-0012 §1, REQ-122/123). Чистый API-флоу
// (без UI) — Flutter не ходит через страницы сайта, только через /api/**. Требует
// OTP_DEV_ECHO=1 (см. playwright.config.ts) для получения кода без почтового/SMS-шлюза.

function uniqueEmail(): string {
  return `mobile-e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.kz`;
}

test("мобильный клиент: X-Client: mobile отдаёт токен вместо cookie, Bearer работает на /me", async ({
  request,
}) => {
  const email = uniqueEmail();

  const reqOtp = await request.post("/api/auth/otp/request", {
    data: { identifier: email },
  });
  expect(reqOtp.ok()).toBe(true);
  const { data: reqData } = await reqOtp.json();
  expect(reqData.devCode).toMatch(/^\d{6}$/);

  const verify = await request.post("/api/auth/otp/verify", {
    headers: { "X-Client": "mobile" },
    data: { identifier: email, code: reqData.devCode },
  });
  expect(verify.ok()).toBe(true);
  const { data: verifyData } = await verify.json();
  expect(typeof verifyData.token).toBe("string");
  expect(verifyData.token.length).toBeGreaterThan(20);
  expect(verifyData.expiresAt).toBeTruthy();

  // Мобильная ветка не ставит cookie — заголовка Set-Cookie в ответе нет.
  expect(verify.headers()["set-cookie"]).toBeUndefined();

  // Тот же токен, отправленный как Bearer, аутентифицирует /api/auth/me — cookie для этого
  // не понадобилась, а мобильная ветка verify её и не ставила (проверено выше).
  const me = await request.get("/api/auth/me", {
    headers: { Authorization: `Bearer ${verifyData.token}` },
  });
  expect(me.ok()).toBe(true);
  const { data: meData } = await me.json();
  expect(meData.user.email).toBe(email);

  // logout по Bearer инвалидирует сессию — повторный /me с тем же токеном получает 401.
  const logout = await request.post("/api/auth/logout", {
    headers: { Authorization: `Bearer ${verifyData.token}` },
  });
  expect(logout.ok()).toBe(true);

  const meAfterLogout = await request.get("/api/auth/me", {
    headers: { Authorization: `Bearer ${verifyData.token}` },
  });
  expect(meAfterLogout.status()).toBe(401);
});

test("веб-клиент (без X-Client): вход по-прежнему ставит httpOnly cookie, токен в теле не отдаётся", async ({
  request,
}) => {
  const email = uniqueEmail();

  const reqOtp = await request.post("/api/auth/otp/request", {
    data: { identifier: email },
  });
  const { data: reqData } = await reqOtp.json();

  const verify = await request.post("/api/auth/otp/verify", {
    data: { identifier: email, code: reqData.devCode },
  });
  expect(verify.ok()).toBe(true);
  const { data: verifyData } = await verify.json();
  expect(verifyData.token).toBeUndefined();
  expect(verify.headers()["set-cookie"]).toContain("osi_session");
});
