import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

// Демо-данные для локальной разработки/показа. Идемпотентно: повторный запуск не плодит дубли.
// Сеет суперпользователем (DIRECT_URL) — обходит RLS, поэтому osiId проставляется явно.
//
// Демо-доступы:
//   Председатель: demo@osi.kz / demo12345 (вход через /login?role=chairman)
//   Житель:       +77010000001            (вход по OTP через /login; код печатается в лог сервера)

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const CHAIR_EMAIL = "demo@osi.kz";
const CHAIR_PHONE = "+77015550000";
// Реальный номер+чат демо-жителя — читаем из env, НЕ хардкодим (review 2026-07-22: это личные
// данные конкретного человека, coздатель репозитория не обязан ими делиться). Заданы в
// web/.env (не коммитится, см. .env.example) — без них резидент сидится с fake-номером без
// Telegram-привязки (нужно будет пройти /start+«Поделиться номером» вручную в @fixlyosibot).
const RESIDENT_PHONE = process.env.SEED_RESIDENT_PHONE || "+77010000001";
const RESIDENT_TELEGRAM_CHAT_ID = process.env.SEED_RESIDENT_TG_CHAT || null;
const OSI_NAME = "ОСИ Демо (Кокшетау)";

async function ensureDemoAccounts(osiId: string) {
  const apartments = await prisma.apartment.findMany({ where: { osiId } });
  for (const apartment of apartments) {
    await prisma.account.upsert({
      where: { apartmentId: apartment.id }, update: {},
      create: { osiId, apartmentId: apartment.id, accountNumber: `DEMO-${apartment.number}` },
    });
  }
}

async function main() {
  const chair = await prisma.user.upsert({
    where: { email: CHAIR_EMAIL },
    update: { passwordHash: hashPassword("demo12345") },
    create: {
      email: CHAIR_EMAIL,
      phone: CHAIR_PHONE,
      passwordHash: hashPassword("demo12345"),
    },
  });

  // Восстанавливаем привязку ДО раннего return ниже (существующая ОСИ прерывает функцию) —
  // иначе повторный сид на непустой БД молча пропустил бы восстановление привязки. Только если
  // задана в env (см. комментарий у RESIDENT_TELEGRAM_CHAT_ID выше).
  if (RESIDENT_TELEGRAM_CHAT_ID) {
    await prisma.telegramLink.upsert({
      where: { phone: RESIDENT_PHONE },
      update: { chatId: RESIDENT_TELEGRAM_CHAT_ID },
      create: { phone: RESIDENT_PHONE, chatId: RESIDENT_TELEGRAM_CHAT_ID },
    });
  }

  const existing = await prisma.osi.findFirst({ where: { name: OSI_NAME } });
  if (existing) {
    await ensureDemoAccounts(existing.id);
    console.log(`seed: демо-ОСИ уже существует (${existing.id}) — пропускаю структуру`);
    await prisma.$disconnect();
    return;
  }

  const osi = await prisma.osi.create({
    data: { name: OSI_NAME, bin: "080840000000", address: "г. Кокшетау, ул. Абая, 1" },
  });
  await prisma.userOsiRole.create({
    data: { userId: chair.id, osiId: osi.id, role: "CHAIRMAN" },
  });

  const building = await prisma.building.create({
    data: { osiId: osi.id, address: "ул. Абая, 1", apartmentsCount: 2, builtYear: 2015 },
  });

  const apt1 = await prisma.apartment.create({
    data: { osiId: osi.id, buildingId: building.id, number: "1", area: "48.5" },
  });
  await prisma.apartment.create({
    data: { osiId: osi.id, buildingId: building.id, number: "2", area: "62.0" },
  });

  const resident = await prisma.user.upsert({
    where: { phone: RESIDENT_PHONE },
    update: {},
    create: { phone: RESIDENT_PHONE },
  });
  await prisma.userOsiRole.upsert({
    where: { userId_osiId: { userId: resident.id, osiId: osi.id } },
    update: {},
    create: { userId: resident.id, osiId: osi.id, role: "RESIDENT" },
  });
  await prisma.occupant.upsert({
    where: { userId: resident.id },
    update: { apartmentId: apt1.id },
    create: {
      osiId: osi.id,
      apartmentId: apt1.id,
      userId: resident.id,
      fullName: "Иван Жилец",
      phone: RESIDENT_PHONE,
    },
  });

  await ensureDemoAccounts(osi.id);
  console.log(`seed: создана демо-ОСИ ${osi.id}`);
  console.log(`  Председатель: ${CHAIR_EMAIL} / demo12345`);
  console.log(`  Житель:       ${RESIDENT_PHONE} (вход по OTP)`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("seed failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
