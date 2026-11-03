import { ok, Errors } from "@/lib/http";
import { getCurrentAuth } from "@/lib/auth/session";
import { getMasterByUserId } from "@/lib/master/service";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/master/me — статус анкеты текущего пользователя (REQ-148, marketplace.md §6).
// Не masterContext(): та отказывает не-APPROVED, а мобильному клиенту как раз нужно отличить
// «анкеты нет» от PENDING/REJECTED/BLOCKED, чтобы показать правильный экран (по образцу того,
// как /api/auth/me всегда отвечает состоянием, а не отказом).
export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const master = await getMasterByUserId(auth.user.id);
  if (!master) return ok({ master: null });

  return ok({
    master: {
      id: master.id,
      status: master.status,
      city: master.city,
      categories: master.categories,
      fullName: master.fullName,
      bio: master.bio,
    },
  });
}

// PATCH /api/master/me — обновление данных профиля мастера (город, категории, био)
export async function PATCH(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const master = await getMasterByUserId(auth.user.id);
  if (!master) return Errors.forbidden("Профиль мастера не найден");

  const body = await req.json().catch(() => ({}));
  const { city, bio, categories } = body;

  const updated = await prisma.master.update({
    where: { id: master.id },
    data: {
      ...(typeof city === "string" && city.trim() ? { city: city.trim() } : {}),
      ...(typeof bio === "string" ? { bio: bio.trim() } : {}),
      ...(Array.isArray(categories) ? { categories } : {}),
    },
  });

  return ok({
    master: {
      id: updated.id,
      status: updated.status,
      city: updated.city,
      categories: updated.categories,
      fullName: updated.fullName,
      bio: updated.bio,
    },
  });
}
