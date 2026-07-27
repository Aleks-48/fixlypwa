import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { chairmanContext, memberContext } from "@/lib/auth/context";
import { createDocument, listDocuments, deleteDocument, documentCategoryOrder } from "@/lib/documents/service";
import { getOccupantBuilding } from "@/lib/comms/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateBody = z.object({
  buildingId: z.string().uuid(),
  category: z.enum(documentCategoryOrder as [string, ...string[]]),
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
  const isChairman = ctx.auth.user.roles.some((r) => r.role === "CHAIRMAN" || r.role === "SUPERADMIN");

  if (!targetBuildingId) {
    if (!isChairman) {
      const occ = await getOccupantBuilding(ctx.osiId, ctx.auth.user.id);
      targetBuildingId = occ?.apartment?.buildingId ?? null;
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

  const doc = await createDocument(ctx.osiId, {
    ...parsed.data,
    category: parsed.data.category as any,
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
