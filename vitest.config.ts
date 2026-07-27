import { defineConfig } from "vitest/config";

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
          include: ["src/**/*.test.ts"],
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
          poolOptions: { threads: { singleThread: true } },
          testTimeout: 30_000,
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      // Серверные модули (lib/admin/service и др.) импортируют "server-only" — в node-тестах
      // пакет падает без react-server условия, подменяем пустой заглушкой.
      "server-only": new URL("./tests/mocks/server-only.ts", import.meta.url).pathname,
    },
  },
});
