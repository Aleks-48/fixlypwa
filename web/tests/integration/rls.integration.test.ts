import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { forTenant } from "@/lib/db/tenant";

// Интеграционный тест изоляции тенантов (DoD §5.3, ADR-0006). Доказывает НА РЕАЛЬНОЙ БД:
//  1. запрос к tenant-таблице вне forTenant → 0 строк (DENY BY DEFAULT);
//  2. forTenant(A) видит только данные A, не видит данные B;
//  3. WITH CHECK не даёт записать строку в чужой тенант.
//
// `admin` — суперпользователь (DIRECT_URL), обходит RLS, используется ТОЛЬКО для сева/уборки
// (Osi — identity-таблица вне RLS; Building — под RLS, сеем в обход через superuser).
// Приложение (`prisma`/`forTenant`) ходит ролью app_login (DATABASE_URL), на неё RLS действует.

const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const TAG = `rls-test-${Date.now()}`;
let osiA = "";
let osiB = "";

beforeAll(async () => {
  const a = await admin.osi.create({ data: { name: `${TAG}-A` } });
  const b = await admin.osi.create({ data: { name: `${TAG}-B` } });
  osiA = a.id;
  osiB = b.id;

  await admin.building.create({
    data: { osiId: osiA, address: `${TAG}-A-дом` },
  });
  await admin.building.create({
    data: { osiId: osiB, address: `${TAG}-B-дом` },
  });
});

afterAll(async () => {
  // Уборка через суперпользователя. Building→Osi — identity-связь без каскада (ADR-0006),
  // поэтому сначала удаляем дома, потом сами Osi.
  await admin.building.deleteMany({ where: { osiId: { in: [osiA, osiB] } } });
  await admin.osi.deleteMany({ where: { name: { startsWith: TAG } } });
  await admin.$disconnect();
});

describe("RLS изоляция тенантов (ADR-0006, DoD §5.3)", () => {
  it("вне forTenant() запрос к tenant-таблице возвращает 0 строк (deny-by-default)", async () => {
    // Прямой вызов app_login без установленного app.current_osi_id.
    const rows = await prisma.building.findMany({
      where: { address: { startsWith: TAG } },
    });
    expect(rows).toHaveLength(0);
  });

  it("forTenant(A) видит только дом A", async () => {
    const rows = await forTenant(osiA, (tx) =>
      tx.building.findMany({ where: { address: { startsWith: TAG } } }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.address).toBe(`${TAG}-A-дом`);
    expect(rows[0]?.osiId).toBe(osiA);
  });

  it("forTenant(A) НЕ видит дом B (изоляция)", async () => {
    const rows = await forTenant(osiA, (tx) =>
      tx.building.findMany({ where: { osiId: osiB } }),
    );
    expect(rows).toHaveLength(0);
  });

  it("WITH CHECK блокирует запись в чужой тенант", async () => {
    // Контекст A, но пытаемся создать здание с osiId = B → нарушение WITH CHECK.
    await expect(
      forTenant(osiA, (tx) =>
        tx.building.create({ data: { osiId: osiB, address: `${TAG}-inject` } }),
      ),
    ).rejects.toThrow();
  });
});
