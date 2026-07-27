import type { ApartmentType } from "@prisma/client";
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
/// Телефон И/ИЛИ email — минимум один (ревизия REQ-013, auth-email.md §4): пока SMS-шлюз
/// не подключён, приглашение по email — единственный рабочий путь в проде.
export type NewResident = {
  apartmentId: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
};

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
// user.email — контакт жителя, приглашённого по почте (auth-email.md §4): у него phone = null.
export function listApartmentsWithOccupants(osiId: string, buildingId: string) {
  return forTenant(osiId, (tx) =>
    tx.apartment.findMany({
      where: { buildingId },
      orderBy: { number: "asc" },
      include: {
        occupants: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            user: { select: { email: true } },
          },
          orderBy: { fullName: "asc" },
        },
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

// Привязать жителя к квартире (REQ-013, ревизия auth-email.md §4): пользователь по телефону
// И/ИЛИ email (минимум один) + роль RESIDENT + Occupant. Всё в одной транзакции forTenant:
// identity-таблицы (user/user_osi_role) вне RLS, occupant — под RLS (WITH CHECK по osiId).
export async function addResident(osiId: string, input: NewResident) {
  const phone = input.phone ?? null;
  const email = input.email ?? null;
  if (!phone && !email) {
    throw new OnboardingError("IDENTIFIER_REQUIRED", "Укажите телефон или email жителя");
  }

  return forTenant(osiId, async (tx) => {
    const apartment = await tx.apartment.findUnique({ where: { id: input.apartmentId } });
    if (!apartment) throw new OnboardingError("APARTMENT_NOT_FOUND", "Квартира не найдена");

    // Ищем по любому из идентификаторов (мог зарегистрироваться сам по одному из них, REQ-007);
    // дополняем недостающий идентификатор, не перезаписывая существующий.
    const existing = await tx.user.findFirst({
      where: { OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])] },
    });
    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            ...(phone && !existing.phone ? { phone } : {}),
            ...(email && !existing.email ? { email } : {}),
          },
        })
      : await tx.user.create({ data: { phone, email } });

    await tx.userOsiRole.upsert({
      where: { userId_osiId: { userId: user.id, osiId } },
      update: {},
      create: { userId: user.id, osiId, role: "RESIDENT" },
    });

    const occupant = await tx.occupant.upsert({
      where: { userId: user.id },
      update: { apartmentId: input.apartmentId, fullName: input.fullName, phone },
      create: {
        osiId,
        apartmentId: input.apartmentId,
        userId: user.id,
        fullName: input.fullName,
        phone,
      },
    });

    return { occupant, userId: user.id };
  });
}

// Импорт реестра помещений (REQ-012 ревизия, excel-import.md) — строки уже разобраны
// parseApartmentRegistry(), сервис только пишет в БД. Идемпотентно: повторный импорт того же
// файла обновляет существующие Apartment/Owner (по number/fullName), не дублирует. Account
// создаётся ОДИН раз с реальным номером ЛС из файла — повторный импорт его не трогает (не
// затираем возможную ручную правку). Owner.fullName обязателен в схеме — строки без ФИО
// собственника создают только Apartment+Account, Owner пропускается (ownersSkipped).
export type ApartmentImportRow = {
  number: string;
  ownerName: string | null;
  iin: string | null;
  phone: string | null;
  type: ApartmentType | null;
  accountNumber: string | null;
  area: number | null;
};

export type ApartmentImportSummary = {
  apartmentsCreated: number;
  apartmentsUpdated: number;
  ownersCreated: number;
  ownersUpdated: number;
  ownersSkipped: number;
};

export function importApartments(
  osiId: string,
  buildingId: string,
  rows: ApartmentImportRow[],
): Promise<ApartmentImportSummary> {
  return forTenant(osiId, async (tx) => {
    const building = await tx.building.findUnique({ where: { id: buildingId } });
    if (!building) throw new OnboardingError("BUILDING_NOT_FOUND", "Дом не найден");

    const summary: ApartmentImportSummary = {
      apartmentsCreated: 0,
      apartmentsUpdated: 0,
      ownersCreated: 0,
      ownersUpdated: 0,
      ownersSkipped: 0,
    };

    for (const row of rows) {
      const existingApartment = await tx.apartment.findFirst({
        where: { buildingId, number: row.number },
      });

      const apartment = existingApartment
        ? await tx.apartment.update({
            where: { id: existingApartment.id },
            data: {
              area: row.area ?? existingApartment.area,
              type: row.type ?? existingApartment.type,
            },
          })
        : await tx.apartment.create({
            data: { osiId, buildingId, number: row.number, area: row.area, type: row.type },
          });
      if (existingApartment) summary.apartmentsUpdated++;
      else summary.apartmentsCreated++;

      const existingAccount = await tx.account.findUnique({
        where: { apartmentId: apartment.id },
      });
      if (!existingAccount) {
        await tx.account.create({
          data: {
            osiId,
            apartmentId: apartment.id,
            accountNumber: row.accountNumber ?? `A-${row.number}`,
          },
        });
      }

      if (!row.ownerName) {
        summary.ownersSkipped++;
        continue;
      }
      const existingOwner = await tx.owner.findFirst({
        where: { apartmentId: apartment.id, fullName: row.ownerName },
      });
      if (existingOwner) {
        await tx.owner.update({
          where: { id: existingOwner.id },
          data: {
            iin: row.iin ?? existingOwner.iin,
            phone: row.phone ?? existingOwner.phone,
          },
        });
        summary.ownersUpdated++;
      } else {
        await tx.owner.create({
          data: {
            osiId,
            apartmentId: apartment.id,
            fullName: row.ownerName,
            iin: row.iin,
            phone: row.phone,
          },
        });
        summary.ownersCreated++;
      }
    }

    return summary;
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
