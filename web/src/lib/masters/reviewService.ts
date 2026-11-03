import "server-only";
import { prisma } from "@/lib/db/prisma";
import { forTenant } from "@/lib/db/tenant";
import type { RequestCategory } from "@prisma/client";

// Сервисный слой «Назначение мастеров + рейтинги» (docs/specs/master-reviews-contacts.md)
// Master — identity-уровень (вне RLS). Request — tenant-уровень (через forTenant).

export type MasterSummary = {
  id: string;
  fullName: string;
  shortName: string; // «Иванов И.» — формат для дропдауна
  city: string;
  categories: RequestCategory[];
  bio: string | null;
  phone: string | null;
  rating: number;
  reviewsCount: number;
  lat?: number | null;
  lng?: number | null;
};

/** Сокращение ФИО: «Иванов Иван Петрович» → «Иванов И.» */
export function getShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts[0]} ${parts[1]?.[0] ?? ""}.`;
}

/** Форматировать метку мастера для дропдауна: «Иванов И. • Сантехник • ★ 4.9 (12)» */
export function formatMasterLabel(master: MasterSummary): string {
  const cat = master.categories[0]
    ? categoryLabel(master.categories[0])
    : null;
  const rating =
    master.reviewsCount > 0
      ? ` • ★ ${master.rating.toFixed(1)} (${master.reviewsCount})`
      : "";
  return `${master.shortName}${cat ? ` • ${cat}` : ""}${rating}`;
}

const CATEGORY_LABELS: Record<RequestCategory, string> = {
  PLUMBING: "Сантехник",
  ELEVATOR: "Лифт",
  CLEANING: "Уборка",
  ELECTRICITY: "Электрик",
  OTHER: "Прочее",
};

export function categoryLabel(cat: RequestCategory): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

/**
 * Список APPROVED мастеров города для дропдауна назначения (chairman only).
 */
export async function listMastersForAssignment(
  city: string = "Кокшетау",
  category?: RequestCategory,
): Promise<MasterSummary[]> {
  const masters = await prisma.master.findMany({
    where: {
      city,
      status: "APPROVED",
      ...(category ? { categories: { has: category } } : {}),
    },
    orderBy: [{ rating: "desc" }, { reviewsCount: "desc" }],
  });

  const userIds = masters.map((m) => m.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, phone: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u.phone]));

  return masters.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    shortName: getShortName(m.fullName),
    city: m.city,
    categories: m.categories,
    bio: m.bio,
    phone: userMap.get(m.userId) ?? null,
    rating: m.rating,
    reviewsCount: m.reviewsCount,
    lat: m.lat,
    lng: m.lng,
  }));
}

/**
 * Назначить мастера на заявку (только chairman).
 * masterId = null — снять назначение.
 */
export async function assignMasterToRequest(
  osiId: string,
  requestId: string,
  masterId: string | null,
): Promise<boolean> {
  return forTenant(osiId, async (tx) => {
    const request = await tx.request.findUnique({
      where: { id: requestId },
      select: { building: { select: { city: true } } },
    });
    if (!request) return false;
    if (masterId) {
      const master = await tx.master.findFirst({
        where: { id: masterId, status: "APPROVED", city: request.building.city },
        select: { id: true },
      });
      if (!master) return false;
    }
    await tx.request.update({ where: { id: requestId }, data: { masterId } });
    return true;
  });
}

/**
 * Добавить отзыв о мастере по закрытой заявке.
 * Пересчитывает rating и reviewsCount в Master атомарно в транзакции.
 * Можно оставить только 1 отзыв на пару (requestId, authorUserId).
 */
export async function addMasterReview({
  osiId,
  masterId,
  authorUserId,
  requestId,
  rating,
  comment,
  photoUrls,
}: {
  osiId: string;
  masterId: string;
  authorUserId: string;
  requestId: string;
  rating: number; // 1..5
  comment?: string;
  photoUrls?: string[];
}): Promise<void> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Рейтинг должен быть от 1 до 5");

  await forTenant(osiId, async (tx) => {
    const request = await tx.request.findUnique({ where: { id: requestId } });
    if (!request || request.authorUserId !== authorUserId || request.masterId !== masterId || request.status !== "RESOLVED") {
      throw new Error("Отзыв доступен автору закрытой заявки о назначенном мастере");
    }
    // Serialize reviews for a master so duplicate checks and rating updates are atomic.
    await tx.$queryRaw`SELECT id FROM master WHERE id = ${masterId}::uuid FOR UPDATE`;
    // Проверить, не оставлял ли уже отзыв
    const existing = await tx.masterReview.findFirst({
      where: { requestId, authorUserId },
    });
    if (existing) throw new Error("Вы уже оставили отзыв по этой заявке");

    // Создать отзыв
    await tx.masterReview.create({
      data: { osiId, masterId, authorUserId, requestId, rating, comment, photoUrls: photoUrls ?? [] },
    });

    // Пересчитать рейтинг мастера
    const agg = await tx.masterReview.aggregate({
      where: { masterId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.master.update({
      where: { id: masterId },
      data: {
        rating: agg._avg.rating ?? 0,
        reviewsCount: agg._count.rating,
      },
    });
  });
}

/**
 * Добавить мастера, выбранного из контактов (chairman only).
 * Использует существующий User по телефону или создаёт нового.
 * Статус сразу APPROVED — председатель лично добавил.
 */
export async function addMasterFromContact({
  fullName,
  phone,
  city,
  categories,
  bio,
}: {
  fullName: string;
  phone: string;
  city: string;
  categories: RequestCategory[];
  bio?: string;
}): Promise<{ masterId: string }> {
  return await prisma.$transaction(async (tx) => {
    // Найти или создать User по номеру телефона
    let user = await tx.user.findUnique({ where: { phone } });
    if (!user) {
      user = await tx.user.create({ data: { phone } });
    }

    // Проверить, не является ли уже мастером
    const existing = await tx.master.findUnique({ where: { userId: user.id } });
    if (existing) {
      // Обновить статус до APPROVED если был другим
      const updated = await tx.master.update({
        where: { id: existing.id },
        data: { status: "APPROVED", fullName, categories, bio },
      });
      return { masterId: updated.id };
    }

    // Создать нового мастера со статусом APPROVED
    const master = await tx.master.create({
      data: {
        userId: user.id,
        fullName,
        city,
        categories,
        bio: bio ?? null,
        status: "APPROVED",
      },
    });

    return { masterId: master.id };
  });
}

/**
 * Список отзывов о мастере с пагинацией
 */
export async function getMasterReviews(masterId: string) {
  return await prisma.masterReview.findMany({
    where: { masterId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      request: { select: { id: true, category: true } },
    },
  });
}

