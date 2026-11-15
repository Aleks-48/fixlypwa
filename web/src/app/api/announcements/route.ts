import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { chairmanContext, memberContext } from "@/lib/auth/context";
import { hasRole } from "@/lib/auth/guards";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  getOccupantBuilding,
} from "@/lib/comms/service";
import { getBuilding, listBuildings } from "@/lib/onboarding/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  buildingId: z.string().uuid(),
  title: z.string().trim().min(1, "Заголовок обязателен").max(200),
  body: z.string().trim().min(1, "Текст обязателен").max(10000),
  isPinned: z.boolean().optional(),
});

const DeleteBody = z.object({
  id: z.string().uuid(),
});

// GET /api/announcements — объявления дома (житель — своего дома, председатель — выбранного
// через ?buildingId= или первого дома ОСИ). Веб-кабинет читает listAnnouncements() напрямую из
// Server Component — этот роут существует для мобильного и API-клиентов.
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

  if (!targetBuildingId) return ok({ announcements: [] });

  const announcements = await listAnnouncements(ctx.osiId, targetBuildingId, ctx.auth.user.id);
  return ok({ announcements });
}

// POST /api/announcements — председатель публикует объявление дома (features.md блок B).
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

  const ann = await createAnnouncement(ctx.osiId, {
    ...parsed.data,
    authorUserId: ctx.auth.user.id,
  });
  return ok({ announcement: { id: ann.id, title: ann.title } }, { status: 201 });
}

// DELETE /api/announcements?id=... или { id } — председатель удаляет объявление.
export async function DELETE(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(req.url);
  const queryId = url.searchParams.get("id");
  let rawId: unknown = queryId && queryId.trim() ? queryId.trim() : undefined;
  if (rawId === undefined) {
    const body = await req.json().catch(() => null);
    if (body && typeof body === "object" && "id" in body) {
      rawId = (body as { id?: unknown }).id;
    }
  }

  const parsed = DeleteBody.safeParse({ id: rawId });
  if (!parsed.success) {
    return Errors.validation("Некорректный идентификатор объявления");
  }

  const { count } = await deleteAnnouncement(ctx.osiId, parsed.data.id);
  if (count === 0) return Errors.notFound("Объявление");

  return ok({ deleted: true });
}
