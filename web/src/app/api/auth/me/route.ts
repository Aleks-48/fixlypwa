import { ok, Errors } from "@/lib/http";
import { getCurrentAuth } from "@/lib/auth/session";
import { publicUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/auth/me — текущий пользователь, активная ОСИ и роли (для UI/навигации).
export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const activeOsiId = auth.session.activeOsiId;
  let osiName: string | null = null;
  let apartmentNumber: string | null = null;
  let buildingAddress: string | null = null;

  if (activeOsiId) {
    const osi = await prisma.osi.findUnique({
      where: { id: activeOsiId },
      select: { name: true },
    }).catch(() => null);
    osiName = osi?.name ?? null;

    // Ищем квартиру и дом жителя
    const occupant = await prisma.occupant.findFirst({
      where: { userId: auth.user.id },
      include: {
        apartment: {
          include: { building: true },
        },
      },
    }).catch(() => null);

    if (occupant?.apartment) {
      apartmentNumber = occupant.apartment.number;
      buildingAddress = occupant.apartment.building?.address ?? null;
    }
  }

  return ok({
    user: publicUser(auth.user),
    activeOsiId,
    osiName,
    apartmentNumber,
    buildingAddress,
    roles: auth.user.roles.map((r) => ({ osiId: r.osiId, role: r.role })),
  });
}
