import { config as loadDotenv } from "dotenv";

// Явная загрузка .env (не полагаемся на неявную подгрузку Vite/Prisma — она грузит только
// целиком .env и не даёт вывести из неё отдельный URL с другим именем БД для тестов, см.
// review 2026-07-21). Импортируется и из vitest.config.ts, и из globalSetup.ts независимо —
// dotenv.config() идемпотентен (не переопределяет уже установленные переменные).
loadDotenv();

// БД для integration-тестов — тот же кластер Postgres, отдельное имя (Faza A обзора
// 2026-07-21): раньше тесты писали прямо в fixlypwa и насоряли демо-стенд строками
// «Тест-ОСИ-*». Роли/пароли кластерные (app_login/postgres) — общие для всех БД кластера,
// отличается только имя базы в URL.
function withTestDbName(url: string | undefined): string | undefined {
  if (!url) return url;
  return url.replace(/\/fixlypwa(\?|$)/, "/fixlypwa_test$1");
}

export const TEST_DATABASE_URL = withTestDbName(process.env.DATABASE_URL);
export const TEST_DIRECT_URL = withTestDbName(process.env.DIRECT_URL);
