import { chairmanContext, memberContext } from "@/lib/auth/context";
import { hasRole } from "@/lib/auth/guards";
import { getOccupantBuilding } from "@/lib/comms/service";
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
} from "@/lib/documents/service";
import { Errors, ok } from "@/lib/http";
import { getBuilding, listBuildings } from "@/lib/onboarding/service";
import { canReadUpload } from "@/lib/uploads/private";
import { DocumentCategory } from "@prisma/client";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateBody = z.object({
  buildingId: z.string().uuid(),
  category: z.nativeEnum(DocumentCategory),
  title: z.string().trim().min(1, "Название обязательно").max(200),
  description: z.string().trim().max(1000).optional(),
  fileUrl: z.string().trim().min(1, "Ссылка на файл обязательна").max(500),
  fileSize: z.number().int().nonnegative().optional(),
  fileType: z.string().max(200).optional(),
  isPublic: z.boolean().optional(),
});

// GET /api/documents?buildingId=... — список документов
export async function GET(req: Request) {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(req.url);
  const rawBuildingId = url.searchParams.get("buildingId");
  const buildingIdParam = rawBuildingId && rawBuildingId.trim() ? rawBuildingId.trim() : null;

  let targetBuildingId: string | null = null;
  const isChairman = hasRole(ctx.auth, ctx.osiId, "CHAIRMAN", "SUPERADMIN");

  if (isChairman) {
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

  if (!targetBuildingId) {
    return ok({ documents: [] });
  }

  // Житель видит только isPublic: true, Председатель — все
  const documents = await listDocuments(ctx.osiId, targetBuildingId, {
    isPublicOnly: !isChairman,
  });

  return ok({ documents });
}

// POST /api/documents — добавление документа (только председатель)
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  if (!(await canReadUpload(ctx.auth, parsed.data.fileUrl))) return Errors.forbidden("Файл недоступен");
  if (!(await getBuilding(ctx.osiId, parsed.data.buildingId))) return Errors.notFound("Дом");
  const doc = await createDocument(ctx.osiId, {
    ...parsed.data,
    category: parsed.data.category,
    authorUserId: ctx.auth.user.id,
  });

  return ok({ document: doc }, { status: 201 });
}

// DELETE /api/documents?id=... — удаление документа (только председатель)
export async function DELETE(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(req.url);
  const id = url.searchParams.get("id")?.trim();
  if (!id) return Errors.validation("Идентификатор документа обязателен");
  if (!z.string().uuid().safeParse(id).success) {
    return Errors.validation("Некорректный идентификатор документа");
  }

  const existing = await getDocument(ctx.osiId, id);
  if (!existing) return Errors.notFound("Документ");

  try {
    await deleteDocument(ctx.osiId, id);
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2025") {
      return Errors.notFound("Документ");
    }
    throw err;
  }
  return ok({ success: true });
}
