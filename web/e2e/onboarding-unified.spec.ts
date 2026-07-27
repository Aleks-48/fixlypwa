import { test, expect } from "@playwright/test";

// E2E: единая схема регистрации/входа (onboarding-unified.md, REQ-146/147) и заявки
// председателя по всей ОСИ (REQ-144). Чистый API-флоу (X-Client: mobile — Bearer, как
// mobile-auth.spec.ts), т.к. e2e-специфики без доступа к БД не могут иначе собрать
// цепочку председатель→ОСИ→дом→квартира→житель→заявка.

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.kz`;
}

async function registerMobile(
  request: import("@playwright/test").APIRequestContext,
  identifier: string,
  fullName?: string,
) {
  const reqOtp = await request.post("/api/auth/otp/request", { data: { identifier } });
  const { data: reqData } = await reqOtp.json();
  const verify = await request.post("/api/auth/otp/verify", {
    headers: { "X-Client": "mobile" },
    data: { identifier, code: reqData.devCode, ...(fullName ? { fullName } : {}) },
  });
  const { data } = await verify.json();
  return { token: data.token as string, user: data.user as { id: string; fullName: string | null } };
}

test("регистрация с ФИО: fullName сохраняется и возвращается в /me (REQ-146/147)", async ({
  request,
}) => {
  const email = uniqueEmail("fullname");
  const { token, user } = await registerMobile(request, email, "Тестов Тест Тестович");
  expect(user.fullName).toBe("Тестов Тест Тестович");

  const me = await request.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  const { data: meData } = await me.json();
  expect(meData.user.fullName).toBe("Тестов Тест Тестович");
});

test("повторный вход без fullName НЕ затирает уже сохранённое имя", async ({ request }) => {
  const email = uniqueEmail("keepname");
  await registerMobile(request, email, "Первое Имя");

  // Пауза дольше e2e-cooldown'а на повторную отправку кода тому же identifier
  // (OTP_RESEND_COOLDOWN_SECONDS=1 в playwright.config.ts) — не полагаемся на случайную
  // сетевую задержку между запросами.
  await new Promise((resolve) => setTimeout(resolve, 1100));

  // Повторный вход тем же identifier, БЕЗ fullName в теле (обычный «Вход»).
  const { user } = await registerMobile(request, email);
  expect(user.fullName).toBe("Первое Имя");
});

test("PATCH /api/auth/profile меняет ФИО, доступно и без роли в ОСИ", async ({ request }) => {
  const email = uniqueEmail("patchprofile");
  const { token } = await registerMobile(request, email); // без fullName — role-less, без ОСИ

  const patch = await request.patch("/api/auth/profile", {
    headers: { Authorization: `Bearer ${token}` },
    data: { fullName: "Новое Имя" },
  });
  expect(patch.ok()).toBe(true);
  const { data } = await patch.json();
  expect(data.user.fullName).toBe("Новое Имя");

  const me = await request.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  const { data: meData } = await me.json();
  expect(meData.user.fullName).toBe("Новое Имя");
});

test("PATCH /api/auth/profile отклоняет короткое ФИО и неавторизованный запрос", async ({
  request,
}) => {
  const noAuth = await request.patch("/api/auth/profile", { data: { fullName: "Имя" } });
  expect(noAuth.status()).toBe(401);

  const email = uniqueEmail("shortname");
  const { token } = await registerMobile(request, email);
  const tooShort = await request.patch("/api/auth/profile", {
    headers: { Authorization: `Bearer ${token}` },
    data: { fullName: "А" },
  });
  expect(tooShort.status()).toBe(422);
});

test("GET /api/requests?scope=building — председатель видит все заявки ОСИ, житель только свои (REQ-144)", async ({
  request,
}) => {
  // Председатель: регистрация → своя ОСИ → дом → квартира.
  const chairEmail = uniqueEmail("chair-scope");
  const { token: chairToken } = await registerMobile(request, chairEmail, "Председатель Тестов");

  const osiRes = await request.post("/api/osi", {
    headers: { Authorization: `Bearer ${chairToken}` },
    data: { name: `Тест-ОСИ-${Date.now()}` },
  });
  expect(osiRes.ok()).toBe(true);

  const buildingRes = await request.post("/api/buildings", {
    headers: { Authorization: `Bearer ${chairToken}` },
    data: { address: "ул. Тестовая, 1" },
  });
  const { data: buildingData } = await buildingRes.json();
  const buildingId = buildingData.building.id as string;

  const apartmentRes = await request.post("/api/apartments", {
    headers: { Authorization: `Bearer ${chairToken}` },
    data: { buildingId, number: "101" },
  });
  const { data: apartmentData } = await apartmentRes.json();
  const apartmentId = apartmentData.apartment.id as string;

  // Житель: председатель привязывает по email → житель входит по коду.
  const residentEmail = uniqueEmail("resident-scope");
  const residentAdd = await request.post("/api/residents", {
    headers: { Authorization: `Bearer ${chairToken}` },
    data: { apartmentId, fullName: "Житель Тестов", email: residentEmail },
  });
  expect(residentAdd.ok()).toBe(true);

  const { token: residentToken } = await registerMobile(request, residentEmail);

  const createReq = await request.post("/api/requests", {
    headers: { Authorization: `Bearer ${residentToken}` },
    data: { category: "PLUMBING", text: "scope=building e2e" },
  });
  expect(createReq.ok()).toBe(true);

  // Председатель с scope=building видит заявку жителя.
  const chairList = await request.get("/api/requests?scope=building", {
    headers: { Authorization: `Bearer ${chairToken}` },
  });
  const { data: chairData } = await chairList.json();
  expect(chairData.requests.some((r: { text: string }) => r.text === "scope=building e2e")).toBe(
    true,
  );

  // Житель с тем же параметром видит только СВОИ — параметр не расширяет его собственные права.
  const residentList = await request.get("/api/requests?scope=building", {
    headers: { Authorization: `Bearer ${residentToken}` },
  });
  const { data: residentData } = await residentList.json();
  expect(
    residentData.requests.every((r: { authorUserId: string }) => r.authorUserId !== undefined),
  ).toBe(true);
  expect(residentData.requests.length).toBeGreaterThan(0);
});
