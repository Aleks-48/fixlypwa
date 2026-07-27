import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createOsiForUser,
  createBuilding,
  createApartment,
  addResident,
  listBuildings,
} from "@/lib/onboarding/service";

// Интеграция онбординга (REQ-010..013) поверх forTenant + RLS. Проверяет полный флоу
// председателя и изоляцию между ОСИ на уровне сервиса (не только сырого SQL, как в rls.*).
const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const TAG = `onb-${Date.now()}`;
const phoneA = `+7770${String(Date.now()).slice(-7)}`;
const phoneB = `+7771${String(Date.now()).slice(-7)}`;
const residentPhone = `+7772${String(Date.now()).slice(-7)}`;

let osiA = "";
let osiB = "";

beforeAll(async () => {
  const chairA = await admin.user.create({ data: { phone: phoneA } });
  const chairB = await admin.user.create({ data: { phone: phoneB } });
  osiA = (await createOsiForUser(chairA.id, { name: `${TAG}-A` })).id;
  osiB = (await createOsiForUser(chairB.id, { name: `${TAG}-B` })).id;
});

afterAll(async () => {
  await admin.building.deleteMany({ where: { osiId: { in: [osiA, osiB] } } });
  await admin.osi.deleteMany({ where: { id: { in: [osiA, osiB] } } });
  await admin.user.deleteMany({ where: { phone: { startsWith: "+777" } } });
  await admin.$disconnect();
});

describe("Онбординг через forTenant (REQ-010..013)", () => {
  it("председатель создаёт дом → квартиру → жителя в своей ОСИ", async () => {
    const building = await createBuilding(osiA, { address: `${TAG}-Абая 1` });
    expect(building.osiId).toBe(osiA);

    const apt = await createApartment(osiA, { buildingId: building.id, number: "12" });
    expect(apt.osiId).toBe(osiA);
    expect(apt.buildingId).toBe(building.id);

    const { occupant, userId } = await addResident(osiA, {
      apartmentId: apt.id,
      fullName: "Иван Жилец",
      phone: residentPhone,
    });
    expect(occupant.apartmentId).toBe(apt.id);

    // Житель получил роль RESIDENT в ОСИ A и Occupant-привязку.
    const role = await admin.userOsiRole.findUnique({
      where: { userId_osiId: { userId, osiId: osiA } },
    });
    expect(role?.role).toBe("RESIDENT");
  });

  it("ОСИ B не видит дома ОСИ A (изоляция через RLS)", async () => {
    const buildingsA = await listBuildings(osiA);
    const buildingsB = await listBuildings(osiB);
    expect(buildingsA).toHaveLength(1);
    expect(buildingsB).toHaveLength(0);
  });

  it("нельзя создать квартиру в чужом доме (RLS скрывает дом другого тенанта)", async () => {
    const buildingA = (await listBuildings(osiA))[0]!;
    // Контекст B, но buildingId принадлежит A → сервис не находит дом (RLS) → ошибка.
    await expect(
      createApartment(osiB, { buildingId: buildingA.id, number: "99" }),
    ).rejects.toThrow(/не найден/i);
  });
});
