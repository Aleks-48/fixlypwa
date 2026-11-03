import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Заменяет плейсхолдер-пароли ролей БД (prisma/migrations/..._rls_policies создаёт app_login и
// app_superadmin с 'CHANGE_ME_IN_DEPLOY') на реальные секреты из окружения деплоя
// (prisma/README.md, NFR-053: секреты вне репо). Запускается ПОСЛЕ `prisma migrate deploy`
// суперпользователем (DIRECT_URL), т.к. ALTER ROLE требует прав на роли.
//
// Пароли — DDL, их нельзя параметризовать; экранируем одинарные кавычки. Значения приходят
// из контролируемого окружения деплоя, не из пользовательского ввода.

function sqlQuote(value: string): string {
  return value.replace(/'/g, "''");
}

async function main(): Promise<void> {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("db-bootstrap: DIRECT_URL/DATABASE_URL не задан");

  const appPassword = process.env.APP_DB_PASSWORD;
  if (!appPassword) {
    throw new Error("db-bootstrap: APP_DB_PASSWORD не задан (пароль роли app_login)");
  }
  const superPassword = process.env.APP_SUPERADMIN_PASSWORD ?? appPassword;

  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    await prisma.$executeRawUnsafe(
      `ALTER ROLE app_login LOGIN PASSWORD '${sqlQuote(appPassword)}'`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER ROLE app_superadmin LOGIN PASSWORD '${sqlQuote(superPassword)}'`,
    );
    console.log("db-bootstrap: пароли ролей app_login/app_superadmin обновлены");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("db-bootstrap failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
