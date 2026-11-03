import { getCurrentAuth } from "@/lib/auth/session";
import { Errors, ok } from "@/lib/http";
import { prisma } from "@/lib/db/prisma";
import { getMasterReviews, getShortName } from "@/lib/masters/reviewService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/public/masters/[masterId]
// Полный профиль мастера с портфолио и отзывами — для экрана профиля мастера у жителя.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ masterId: string }> },
) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const { masterId } = await params;

  const master = await prisma.master.findUnique({
    where: { id: masterId },
    include: {
      portfolio: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!master || master.status !== "APPROVED") return Errors.notFound("Мастер");

  const user = await prisma.user.findUnique({
    where: { id: master.userId },
    select: { phone: true },
  });

  const reviews = await getMasterReviews(master.id);

  return ok({
    master: {
      id: master.id,
      fullName: master.fullName,
      shortName: getShortName(master.fullName),
      city: master.city,
      categories: master.categories,
      bio: master.bio,
      phone: user?.phone ?? null,
      rating: master.rating,
      reviewsCount: master.reviewsCount,
      portfolio: master.portfolio.map((p) => ({
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
        authorPhone: null, // Reviews do not disclose residents' contact details.
      })),
    },
  });
}
