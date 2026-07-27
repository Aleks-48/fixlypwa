import { prisma, forTenant } from "./tenant";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
const add = (name: string, ok: boolean, detail = "") => checks.push({ name, ok, detail });

async function main() {
  // --- Риск №1: bootstrapping — identity-таблицы читаются БЕЗ tenant-контекста ---
  // (это то, что происходит при входе: сессия → пользователь → его ОСИ, ещё до RLS-контекста)
  const osis = await prisma.osi.findMany({ orderBy: { name: "asc" } });
  const roles = await prisma.userOsiRole.findMany();
  add(
    "Риск №1 bootstrapping: osi/user_osi_role читаются БЕЗ контекста (вне RLS)",
    osis.length === 2 && roles.length === 2,
    `osi=${osis.length}, roles=${roles.length}`,
  );
  if (osis.length < 2) throw new Error("seed не загрузился — прервано");
  const [alfa, beta] = osis;

  // --- DENY BY DEFAULT: tenant-таблица без контекста → 0 строк (не «все») ---
  const leak = await prisma.building.findMany();
  add("Deny-by-default: building без контекста → 0 строк (не утечка всех)", leak.length === 0, `rows=${leak.length}`);

  // --- Риск №2: SET LOCAL в транзакции даёт изоляцию. Контекст Альфа ---
  const alfaBuildings = await forTenant(alfa.id, (tx) => tx.building.findMany());
  add(
    "Изоляция: контекст «Альфа» видит только дома Альфы",
    alfaBuildings.length === 1 && alfaBuildings.every((b) => b.osiId === alfa.id),
    `видно=${alfaBuildings.length}`,
  );

  // Контекст Бета
  const betaBuildings = await forTenant(beta.id, (tx) => tx.building.findMany());
  add(
    "Изоляция: контекст «Бета» видит только дома Беты",
    betaBuildings.length === 1 && betaBuildings.every((b) => b.osiId === beta.id),
    `видно=${betaBuildings.length}`,
  );

  // Нет пересечения
  const overlap = alfaBuildings.some((a) => betaBuildings.some((b) => b.id === a.id));
  add("Изоляция: наборы тенантов не пересекаются", !overlap);

  // charge тоже под RLS
  const alfaCharges = await forTenant(alfa.id, (tx) => tx.charge.findMany());
  add(
    "Изоляция распространяется на charge (не только building)",
    alfaCharges.length === 1 && alfaCharges.every((c) => c.osiId === alfa.id),
    `charges=${alfaCharges.length}`,
  );

  // --- WITH CHECK: нельзя записать строку в ЧУЖОЙ тенант ---
  let blocked = false;
  try {
    await forTenant(alfa.id, (tx) =>
      tx.building.create({ data: { osiId: beta.id, address: "ВЗЛОМ: чужой osi_id" } }),
    );
  } catch {
    blocked = true;
  }
  add("WITH CHECK: запись с чужим osi_id заблокирована", blocked);

  // Легитимная запись в своём тенанте проходит
  const created = await forTenant(alfa.id, (tx) =>
    tx.building.create({ data: { osiId: alfa.id, address: "Новый дом Альфы" } }),
  );
  add("Легитимная запись в своём тенанте разрешена", Boolean(created?.id));

  // Проверим, что запись видна только своему тенанту
  const alfaAfter = await forTenant(alfa.id, (tx) => tx.building.count());
  const betaAfter = await forTenant(beta.id, (tx) => tx.building.count());
  add("После вставки: Альфа=2, Бета=1 (запись не протекла)", alfaAfter === 2 && betaAfter === 1, `A=${alfaAfter}, B=${betaAfter}`);

  // --- Отчёт ---
  console.log("\n=== СПАЙК ADR-0006: RLS + Prisma + PgBouncer (transaction pooling) ===");
  console.log("Соединение: приложение → PgBouncer :6432 (transaction) → Postgres\n");
  let allOk = true;
  for (const c of checks) {
    allOk &&= c.ok;
    console.log(`${c.ok ? "✅ PASS" : "❌ FAIL"}  ${c.name}${c.detail ? `  [${c.detail}]` : ""}`);
  }
  console.log(`\n${allOk ? "ИТОГ: ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ ✅ — механизм ADR-0006 работает через PgBouncer" : "ИТОГ: ЕСТЬ ПАДЕНИЯ ❌"}\n`);

  await prisma.$disconnect();
  process.exit(allOk ? 0 : 1);
}

main().catch(async (e) => {
  console.error("Ошибка спайка:", e);
  await prisma.$disconnect();
  process.exit(1);
});
