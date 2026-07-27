import { defineConfig, devices } from "@playwright/test";

// E2E ключевых флоу (mvp-build-prompt §5.4): онбординг, вход по OTP, объявление→прочтение,
// заявка→смена статуса. Mobile-first (features.md §0.5) — гоняем на мобильном вьюпорте.
const PORT = process.env.E2E_PORT ?? "3000";
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // 10s: параллельные воркеры могут на миг исчерпать пул соединений Prisma (интерактивные
  // транзакции forTenant + fan-out уведомлений) — запрос ждёт в очереди пула дольше 5s.
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
  // В CI/локально поднимаем прод-сборку сами (PWA включён только в prod).
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: "npm run build && npm run start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        // Эхо OTP-кода в ответе — только для тестов (в проде выключено, security-review).
        // Per-IP лимит OTP поднят: все тестовые запросы идут с 127.0.0.1.
        env: { OTP_DEV_ECHO: "1", OTP_MAX_PER_IP_HOUR: "100000" },
      },
});
