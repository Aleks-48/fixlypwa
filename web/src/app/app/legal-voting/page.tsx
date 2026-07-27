import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentAuth as getAuthContext } from "@/lib/auth/session";

export default async function LegalVotingRedirectPage() {
  let buildingId: string | null = null;

  try {
    const ctx = await getAuthContext();
    const userId = (ctx as any)?.user?.id || (ctx as any)?.auth?.user?.id || (ctx as any)?.id || null;

    if (userId) {
      const occupant = await prisma.occupant.findFirst({
        where: { userId },
        select: { apartment: { select: { buildingId: true } }, apartmentId: true },
      }).catch(() => null);

      if (occupant?.apartment?.buildingId) {
        buildingId = occupant.apartment.buildingId;
      } else if (occupant?.apartmentId) {
        const apt = await prisma.apartment.findUnique({
          where: { id: occupant.apartmentId },
          select: { buildingId: true },
        }).catch(() => null);
        buildingId = apt?.buildingId || null;
      }
    }
  } catch (e) {
    console.error("Redirect auth error:", e);
  }

  if (!buildingId) {
    const fallback = await prisma.building.findFirst({ select: { id: true } });
    buildingId = fallback?.id || null;
  }

  if (buildingId) {
    redirect(`/app/buildings/${buildingId}/legal-voting`);
  }

  redirect("/app");
}
