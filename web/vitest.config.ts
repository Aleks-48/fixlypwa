import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { TEST_DATABASE_URL, TEST_DIRECT_URL } from "./tests/testDb";

// Тестовая пирамида (mvp-build-prompt §6):
//  - unit         — доменная логика и права, без БД (быстрые, гоняются в `npm test`);
//  - integration  — RLS-изоляция, миграции, репозитории; требуют поднятой Postgres.
// Разделены на projects, чтобы `npm test` не падал без БД, а CI гонял оба явно.
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "tests/*.test.ts"],
          exclude: ["src/**/*.integration.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          // Изоляция состояния тестовой БД между файлами — один воркер (последовательно).
          pool: "threads",
          maxWorkers: 1,
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
          // Faza A обзора (2026-07-21): отдельная тестовая БД (fixlypwa_test) вместо демо-данных
          // (fixlypwa) — раньше интеграционные тесты писали прямо в стенд, показанный
          // инвестору, и оставляли там «Тест-ОСИ-*» строки. globalSetup создаёт БД/прогоняет
          // миграции один раз перед прогоном; env здесь переопределяет то, что видят тесты
          // (DATABASE_URL/DIRECT_URL из .env читает Prisma сам при импорте — этого достаточно,
          // чтобы его подстраховать явным значением до того, как он это сделает).
          globalSetup: ["./tests/globalSetup.ts"],
          // Изоляция от РЕАЛЬНЫХ каналов доставки (review 2026-07-22): демо сегодня работает с
          // настоящими Resend/Telegram/Mobizon в .env — без этого переопределения тесты бьют по
          // живым API (реальные письма/сообщения, чужие rate-limit'ы) вместо console-заглушек,
          // на которые они писаны. OTP_DEV_ECHO=0 — тесты telegram-otp.integration.test.ts
          // фиксируют ПРОД-конт­ракт needs_telegram_link (REQ-009), а не демо-режим с эхом кода.
          env: {
            DATABASE_URL: TEST_DATABASE_URL ?? "",
            DIRECT_URL: TEST_DIRECT_URL ?? "",
            EMAIL_PROVIDER: "console",
            SMS_PROVIDER: "console",
            TELEGRAM_PROVIDER: "console",
            OTP_DEV_ECHO: "0",
          },
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Серверные модули (lib/admin/service и др.) импортируют "server-only" — в node-тестах
      // пакет падает без react-server условия, подменяем пустой заглушкой.
      "server-only": fileURLToPath(new URL("./tests/mocks/server-only.ts", import.meta.url)),
    },
  },
});
