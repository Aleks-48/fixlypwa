import { PrismaClient } from "@prisma/client";
import { normalizeKzPhone } from "../src/lib/phone";

// Назначение/снятие суперадмина платформы (ADR-0008, REQ-110). ЕДИНСТВЕННЫЙ путь мутации
// User.isSuperadmin — из веб-приложения поле не изменяется нигде (нет пути эскалации из веба).
// DIRECT_URL — консистентно с остальными скриптами обслуживания (bootstrap/seed/approve-master).
//
// Использование:
//   npx tsx scripts/make-superadmin.ts +77011234567         # → isSuperadmin = true
//   npx tsx scripts/make-superadmin.ts +77011234567 off     # → isSuperadmin = false
//
// Пользователь должен уже существовать (обычная регистрация по телефону+OTP или сид) —
// скрипт не создаёт аккаунтов, только помечает существующий.

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

async function main() {
  const [rawPhone, mode] = process.argv.slice(2);
  if (!rawPhone) {
    console.error("Использование: npx tsx scripts/make-superadmin.ts <телефон> [off]");
    process.exitCode = 1;
    return;
  }

  const phone = normalizeKzPhone(rawPhone);
  if (!phone) {
    console.error(`Некорректный номер телефона: ${rawPhone}`);
    process.exitCode = 1;
    return;
  }

  const isSuperadmin = mode !== "off";
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    console.error(`Пользователь с телефоном ${phone} не найден — сначала обычная регистрация/вход`);
    process.exitCode = 1;
    return;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isSuperadmin },
  });
  console.log(`user ${updated.id} (${phone}) → isSuperadmin=${updated.isSuperadmin}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
