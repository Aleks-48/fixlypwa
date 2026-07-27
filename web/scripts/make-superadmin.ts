import { PrismaClient } from "@prisma/client";
import { parseIdentifier } from "../src/lib/identifier";

// Назначение/снятие суперадмина платформы (ADR-0008, REQ-110). ЕДИНСТВЕННЫЙ путь мутации
// User.isSuperadmin — из веб-приложения поле не изменяется нигде (нет пути эскалации из веба).
// DIRECT_URL — консистентно с остальными скриптами обслуживания (bootstrap/seed/approve-master).
//
// Использование (телефон или email — auth-email.md):
//   npx tsx scripts/make-superadmin.ts +77011234567          # → isSuperadmin = true
//   npx tsx scripts/make-superadmin.ts rahim@example.kz      # → isSuperadmin = true
//   npx tsx scripts/make-superadmin.ts rahim@example.kz off  # → isSuperadmin = false
//
// Пользователь должен уже существовать (обычная регистрация по коду или сид) —
// скрипт не создаёт аккаунтов, только помечает существующий.

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

async function main() {
  const [rawIdentifier, mode] = process.argv.slice(2);
  if (!rawIdentifier) {
    console.error("Использование: npx tsx scripts/make-superadmin.ts <телефон|email> [off]");
    process.exitCode = 1;
    return;
  }

  const identifier = parseIdentifier(rawIdentifier);
  if (!identifier) {
    console.error(`Некорректный телефон или email: ${rawIdentifier}`);
    process.exitCode = 1;
    return;
  }

  const isSuperadmin = mode !== "off";
  const where =
    identifier.kind === "email" ? { email: identifier.value } : { phone: identifier.value };
  const user = await prisma.user.findUnique({ where });
  if (!user) {
    console.error(
      `Пользователь ${identifier.value} не найден — сначала обычная регистрация/вход`,
    );
    process.exitCode = 1;
    return;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isSuperadmin },
  });
  console.log(`user ${updated.id} (${identifier.value}) → isSuperadmin=${updated.isSuperadmin}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
