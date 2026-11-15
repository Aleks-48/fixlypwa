import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { chairmanContext, memberContext } from "@/lib/auth/context";
import { hasRole } from "@/lib/auth/guards";
import { createInfoItem, listInfoItems, getOccupantBuilding } from "@/lib/comms/service";
import { getBuilding, listBuildings } from "@/lib/onboarding/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  buildingId: z.string().uuid(),
  type: z.enum([
    "TRASH_SCHEDULE",
    "EMERGENCY_CONTACTS",
    "PAYMENT_DETAILS",
    "CHAIRMAN_CONTACTS",
    "OTHER",
  ]),
  title: z.string().trim().min(1, "Заголовок обязателен").max(200),
  content: z.string().trim().min(1, "Текст обязателен").max(10000),
});

// GET /api/info — инфо-раздел дома (житель — своего дома, председатель — ?buildingId= или первого дома ОСИ).
export async function GET(req: Request) {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(req.url);
  const rawBuildingId = url.searchParams.get("buildingId");
  const buildingIdParam = rawBuildingId && rawBuildingId.trim() ? rawBuildingId.trim() : null;

  let targetBuildingId: string | null = null;
  if (hasRole(ctx.auth, ctx.osiId, "CHAIRMAN", "SUPERADMIN")) {
    if (buildingIdParam) {
      if (!z.string().uuid().safeParse(buildingIdParam).success) {
        return Errors.validation("Некорректный идентификатор дома");
      }
      if (!(await getBuilding(ctx.osiId, buildingIdParam))) {
        return Errors.notFound("Дом");
      }
      targetBuildingId = buildingIdParam;
    } else {
      targetBuildingId = (await listBuildings(ctx.osiId))[0]?.id ?? null;
    }
  } else {
    const occ = await getOccupantBuilding(ctx.osiId, ctx.auth.user.id);
    const ownBuildingId = occ?.apartment?.buildingId ?? null;
    if (buildingIdParam && buildingIdParam !== ownBuildingId) {
      return Errors.forbidden();
    }
    targetBuildingId = ownBuildingId;
  }

  if (!targetBuildingId) return ok({ items: [] });

  const items = await listInfoItems(ctx.osiId, targetBuildingId);
  return ok({ items });
}

// POST /api/info — председатель добавляет запись в инфо-раздел дома (features.md блок B).
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  if (!(await getBuilding(ctx.osiId, parsed.data.buildingId))) {
    return Errors.notFound("Дом");
  }

  const item = await createInfoItem(ctx.osiId, parsed.data);
  return ok({ infoItem: { id: item.id, title: item.title } }, { status: 201 });
}
