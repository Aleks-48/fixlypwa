import { PrismaClient } from "@prisma/client";

// Singleton PrismaClient — иначе hot-reload в dev плодит соединения (утечка пула).
// Приложение подключается ОБЫЧНОЙ ролью app_login через PgBouncer (ADR-0006), поэтому RLS
// действует. Прямой доступ к tenant-таблицам минуя forTenant() → 0 строк (deny-by-default).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
