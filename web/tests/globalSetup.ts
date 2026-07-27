import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { TEST_DATABASE_URL, TEST_DIRECT_URL } from "./testDb";

// Faza A обзора (2026-07-21): создаёт fixlypwa_test (если нет) и прогоняет миграции ОДИН РАЗ
// перед всем integration-прогоном (не за каждый файл — singleThread в vitest.config.ts делит
// один worker на все тесты). Роли app_login/app_superadmin — кластерные (общие для всех БД
// Postgres, не per-database), уже существуют — созданы миграцией на демо-БД fixlypwa, а
// RLS-миграция оборачивает CREATE ROLE в IF NOT EXISTS, так что повторный прогон здесь их не
// трогает и не падает.
export default async function globalSetup(): Promise<void> {
  if (!TEST_DIRECT_URL) throw new Error("globalSetup: DIRECT_URL не задан в .env");

  const dbName = new URL(TEST_DIRECT_URL.replace(/^postgresql:/, "http:")).pathname
    .slice(1)
    .split("?")[0];
  const adminUrl = TEST_DIRECT_URL.replace(`/${dbName}`, "/postgres");

  const admin = new PrismaClient({ datasourceUrl: adminUrl });
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
    console.log(`[globalSetup] создана тестовая БД ${dbName}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("already exists")) throw err;
  } finally {
    await admin.$disconnect();
  }

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL!, DIRECT_URL: TEST_DIRECT_URL! },
    stdio: "inherit",
  });
}
