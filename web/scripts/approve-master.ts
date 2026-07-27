import { PrismaClient, MasterStatus } from "@prisma/client";
import { normalizeKzPhone } from "../src/lib/phone";

// Ручное одобрение анкеты мастера (Q-053) — до появления админки (ADR-0008). Суперпользователь
// (DIRECT_URL) — Master identity-таблица вне RLS, но используем DIRECT_URL для консистентности
// с остальными скриптами (bootstrap/seed).
//
// Использование:
//   npx tsx scripts/approve-master.ts +77011234567           # → APPROVED
//   npx tsx scripts/approve-master.ts +77011234567 REJECTED  # → любой статус MasterStatus

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

async function main() {
  const [rawPhone, rawStatus] = process.argv.slice(2);
  if (!rawPhone) {
    console.error("Использование: npx tsx scripts/approve-master.ts <телефон> [STATUS]");
    process.exitCode = 1;
    return;
  }

  const phone = normalizeKzPhone(rawPhone);
  if (!phone) {
    console.error(`Некорректный номер телефона: ${rawPhone}`);
    process.exitCode = 1;
    return;
  }

  const status = (rawStatus ?? "APPROVED") as MasterStatus;
  if (!Object.values(MasterStatus).includes(status)) {
    console.error(`Некорректный статус: ${rawStatus}. Допустимо: ${Object.values(MasterStatus).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    console.error(`Пользователь с телефоном ${phone} не найден`);
    process.exitCode = 1;
    return;
  }

  const master = await prisma.master.findUnique({ where: { userId: user.id } });
  if (!master) {
    console.error(`Анкета мастера для ${phone} не найдена — сначала регистрация через /register?role=master`);
    process.exitCode = 1;
    return;
  }

  const updated = await prisma.master.update({ where: { id: master.id }, data: { status } });
  console.log(`master ${updated.id} (${phone}, ${updated.fullName}, город ${updated.city}) → ${updated.status}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
