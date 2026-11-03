import { getCurrentAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Errors, ok } from "@/lib/http";
import { getMasterByUserId } from "@/lib/master/service";
import { getMasterReviews } from "@/lib/masters/reviewService";
import { RequestCategory } from "@prisma/client";
import { canReadUpload } from "@/lib/uploads/private";
import { forMaster } from "@/lib/db/master";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PortfolioBody = z.object({
  title: z.string().min(1, "Укажите название работы").max(100),
  description: z.string().max(500).optional(),
  category: z.nativeEnum(RequestCategory),
  photoUrls: z.array(z.string()).optional(),
});

// GET /api/master/me/details — детальный профиль мастера с портфолио, отзывами и точной статистикой
export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const master = await getMasterByUserId(auth.user.id);
  if (!master) return ok({ master: null });

  const [portfolio, reviews, offersCount] = await Promise.all([
    prisma.masterPortfolioItem.findMany({
      where: { masterId: master.id },
      orderBy: { createdAt: "desc" },
    }),
    getMasterReviews(master.id),
    forMaster(master.id, master.city, (tx) =>
      tx.marketOffer.count({
        where: { masterId: master.id },
      }),
    ),
  ]);

  return ok({
    master: {
      id: master.id,
      status: master.status,
      city: master.city,
      categories: master.categories,
      fullName: master.fullName,
      bio: master.bio,
      phone: auth.user.phone,
      rating: master.rating,
      reviewsCount: master.reviewsCount,
      offersCount,
      portfolio: portfolio.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        photoUrls: p.photoUrls,
      })),
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        authorPhone: null,
      })),
    },
  });
}

// POST /api/master/me/details — добавление работы в портфолио мастером
export async function POST(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const master = await getMasterByUserId(auth.user.id);
  if (!master) return Errors.forbidden("Профиль мастера не найден");

  const json = await req.json().catch(() => null);
  const parsed = PortfolioBody.safeParse(json);
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  for (const url of parsed.data.photoUrls ?? []) {
    if (!(await canReadUpload(auth, url))) return Errors.forbidden("Файл недоступен");
  }
  const item = await prisma.masterPortfolioItem.create({
    data: {
      masterId: master.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      photoUrls: parsed.data.photoUrls ?? [],
    },
  });

  return ok({ item });
}
