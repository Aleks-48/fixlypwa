import { prisma } from "@/lib/db/prisma";
import { ok, fail } from "@/lib/http";

// Healthcheck для Docker/оркестрации (mvp-build-prompt §7.1). Проверяет и живость процесса,
// и доступность БД через пул (app_login → PgBouncer → Postgres). Не кэшируется.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Лёгкий пинг БД. RLS-контекст не нужен (запрос вне tenant-таблиц).
    await prisma.$queryRaw`SELECT 1`;
    return ok({ status: "ok", db: "up", time: new Date().toISOString() });
  } catch {
    // Не раскрываем детали ошибки БД наружу (могут содержать хост/креды).
    return fail("DB_UNAVAILABLE", "База данных недоступна", 503);
  }
}
