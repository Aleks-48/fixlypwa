import { prisma } from "@/lib/db/prisma";
import { forTenant } from "@/lib/db/tenant";

// Онбординг структуры дома (REQ-010..013). ВСЕ операции над tenant-таблицами (building/apartment/
// occupant) идут через forTenant(osiId, …) — RLS гарантирует изоляцию (ADR-0006, guardrails §8).
// Osi/UserOsiRole — identity (вне RLS), создаются напрямую (bootstrap ОСИ, Q-051).

export type NewOsi = { name: string; bin?: string | null; address?: string | null };
export type NewBuilding = {
  address: string;
  apartmentsCount?: number | null;
  builtYear?: number | null;
};
export type NewApartment = { buildingId: string; number: string; area?: number | null };
export type NewResident = { apartmentId: string; fullName: string; phone: string };

// Создать ОСИ и сделать пользователя её председателем (Q-051 — self-service онбординг).
export async function createOsiForUser(userId: string, input: NewOsi) {
  return prisma.$transaction(async (tx) => {
    const osi = await tx.osi.create({
      data: { name: input.name, bin: input.bin ?? null, address: input.address ?? null },
    });
    await tx.userOsiRole.create({
      data: { userId, osiId: osi.id, role: "CHAIRMAN" },
    });
    return osi;
  });
}

export function listBuildings(osiId: string) {
  return forTenant(osiId, (tx) =>
    tx.building.findMany({ orderBy: { address: "asc" } }),
  );
}

export function createBuilding(osiId: string, input: NewBuilding) {
  return forTenant(osiId, (tx) =>
    tx.building.create({
      data: {
        osiId,
        address: input.address,
        apartmentsCount: input.apartmentsCount ?? null,
        builtYear: input.builtYear ?? null,
      },
    }),
  );
}

export function listApartments(osiId: string, buildingId: string) {
  return forTenant(osiId, (tx) =>
    tx.apartment.findMany({
      where: { buildingId },
      orderBy: { number: "asc" },
    }),
  );
}

export function getBuilding(osiId: string, buildingId: string) {
  return forTenant(osiId, (tx) => tx.building.findUnique({ where: { id: buildingId } }));
}

// Квартиры дома вместе с привязанными жителями (для экрана управления домом).
export function listApartmentsWithOccupants(osiId: string, buildingId: string) {
  return forTenant(osiId, (tx) =>
    tx.apartment.findMany({
      where: { buildingId },
      orderBy: { number: "asc" },
      include: {
        occupants: { select: { id: true, fullName: true, phone: true }, orderBy: { fullName: "asc" } },
      },
    }),
  );
}

export function createApartment(osiId: string, input: NewApartment) {
  return forTenant(osiId, async (tx) => {
    // RLS уже гарантирует, что чужой дом не виден; findUnique вернёт null для чужого/несуществующего.
    const building = await tx.building.findUnique({ where: { id: input.buildingId } });
    if (!building) throw new OnboardingError("BUILDING_NOT_FOUND", "Дом не найден");

    return tx.apartment.create({
      data: {
        osiId,
        buildingId: input.buildingId,
        number: input.number,
        area: input.area ?? null,
      },
    });
  });
}

// Привязать жителя к квартире (REQ-013): пользователь (по телефону) + роль RESIDENT + Occupant.
// Всё в одной транзакции forTenant: identity-таблицы (user/user_osi_role) вне RLS, occupant — под
// RLS (WITH CHECK по osiId контекста).
export async function addResident(osiId: string, input: NewResident) {
  return forTenant(osiId, async (tx) => {
    const apartment = await tx.apartment.findUnique({ where: { id: input.apartmentId } });
    if (!apartment) throw new OnboardingError("APARTMENT_NOT_FOUND", "Квартира не найдена");

    const user = await tx.user.upsert({
      where: { phone: input.phone },
      update: {},
      create: { phone: input.phone },
    });

    await tx.userOsiRole.upsert({
      where: { userId_osiId: { userId: user.id, osiId } },
      update: {},
      create: { userId: user.id, osiId, role: "RESIDENT" },
    });

    const occupant = await tx.occupant.upsert({
      where: { userId: user.id },
      update: { apartmentId: input.apartmentId, fullName: input.fullName, phone: input.phone },
      create: {
        osiId,
        apartmentId: input.apartmentId,
        userId: user.id,
        fullName: input.fullName,
        phone: input.phone,
      },
    });

    return { occupant, userId: user.id };
  });
}

export class OnboardingError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "OnboardingError";
  }
}
