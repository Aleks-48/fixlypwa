import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { RequestCategory } from "@prisma/client";

// Сервисный слой модуля «Карта и портфолио мастеров» (docs/specs/masters-map.md, REQ-072..075).
// Master и MasterPortfolioItem — identity-уровень (вне RLS), мастера не привязаны к конкретной ОСИ.

export type MasterWithPortfolio = {
  id: string;
  fullName: string;
  city: string;
  categories: RequestCategory[];
  bio: string | null;
  phone: string | null;
  portfolio: {
    id: string;
    title: string;
    description: string | null;
    category: RequestCategory;
    photoUrls: string[];
    createdAt: Date;
  }[];
};

/**
 * Получить список проверенных мастеров города с фильтрацией по категории (REQ-072)
 */
export async function listApprovedMasters(
  city: string = "Кокшетау",
  category?: RequestCategory,
): Promise<MasterWithPortfolio[]> {
  const masters = await prisma.master.findMany({
    where: {
      city,
      status: "APPROVED",
      ...(category ? { categories: { has: category } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const userIds = masters.map((m) => m.userId);
  const masterIds = masters.map((m) => m.id);

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, phone: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u.phone]));

  const portfolioItems = await (prisma as any).masterPortfolioItem?.findMany({
    where: { masterId: { in: masterIds } },
    orderBy: { createdAt: "desc" },
  }).catch(() => []);

  const portfolioMap = new Map<string, any[]>();
  if (Array.isArray(portfolioItems)) {
    for (const item of portfolioItems) {
      const list = portfolioMap.get(item.masterId) || [];
      list.push(item);
      portfolioMap.set(item.masterId, list);
    }
  }

  return masters.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    city: m.city,
    categories: m.categories,
    bio: m.bio,
    phone: userMap.get(m.userId) ?? null,
    portfolio: portfolioMap.get(m.id) ?? [],
  }));
}

/**
 * Получить подробный профиль мастера с портфолио по ID (REQ-073)
 */
export async function getMasterProfile(masterId: string): Promise<MasterWithPortfolio | null> {
  const master = await prisma.master.findUnique({
    where: { id: masterId },
  });

  if (!master || master.status !== "APPROVED") return null;

  const user = await prisma.user.findUnique({
    where: { id: master.userId },
    select: { phone: true },
  });

  const portfolio = await (prisma as any).masterPortfolioItem?.findMany({
    where: { masterId: master.id },
    orderBy: { createdAt: "desc" },
  }).catch(() => []);

  return {
    id: master.id,
    fullName: master.fullName,
    city: master.city,
    categories: master.categories,
    bio: master.bio,
    phone: user?.phone ?? null,
    portfolio: Array.isArray(portfolio) ? portfolio : [],
  };
}
