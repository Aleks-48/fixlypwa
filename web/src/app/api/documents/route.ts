import { chairmanContext,memberContext } from "@/lib/auth/context";
import { getOccupantBuilding } from "@/lib/comms/service";
import { createDocument,deleteDocument,listDocuments } from "@/lib/documents/service";
import { Errors,ok } from "@/lib/http";
import { DocumentCategory } from "@prisma/client";
import { hasRole } from "@/lib/auth/guards";
import { z } from "zod";
import { canReadUpload } from "@/lib/uploads/private";
import { getBuilding } from "@/lib/onboarding/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateBody = z.object({
  buildingId: z.string().uuid(),
  category: z.nativeEnum(DocumentCategory),
  title: z.string().min(1, "Название обязательно").max(200),
  description: z.string().max(1000).optional(),
  fileUrl: z.string().min(1, "Ссылка на файл обязательна"),
  fileSize: z.number().int().optional(),
  fileType: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// GET /api/documents?buildingId=... — список документов
export async function GET(req: Request) {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(req.url);
  const buildingIdParam = url.searchParams.get("buildingId");

  let targetBuildingId = buildingIdParam;
  const isChairman = hasRole(ctx.auth, ctx.osiId, "CHAIRMAN", "SUPERADMIN");

  if (!targetBuildingId) {
    if (!isChairman) {
      const occ = await getOccupantBuilding(ctx.osiId, ctx.auth.user.id);
      if (targetBuildingId && targetBuildingId !== occ?.apartment.buildingId) return Errors.forbidden();
      targetBuildingId = occ?.apartment.buildingId ?? null;
    }
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

  if (!await canReadUpload(ctx.auth, parsed.data.fileUrl)) return Errors.forbidden("Файл недоступен");
  if (!await getBuilding(ctx.osiId, parsed.data.buildingId)) return Errors.notFound("Дом");
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
  const id = url.searchParams.get("id");
  if (!id) return Errors.validation("Идентификатор документа обязателен");

  await deleteDocument(ctx.osiId, id);
  return ok({ success: true });
}
