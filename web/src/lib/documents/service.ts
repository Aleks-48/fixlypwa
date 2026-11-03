import type { DocumentCategory } from "@prisma/client";
import { forTenant } from "@/lib/db/tenant";

// Сервисный слой для Библиотеки документов ОСИ (Document Library).
// Все операции выполняются под RLS через forTenant(osiId, ...).

// src/lib/documents/constants.ts

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  GOV_REGULATION: "Нормативные акты",
  REPORT: "Отчёты",
  PROTOCOL: "Протоколы",
  ESTIMATE: "Сметы",
  CONTRACT: "Договоры",
  TECHNICAL: "Техническая документация",
  OTHER: "Прочее",
};

export const documentCategoryOrder: DocumentCategory[] = [
  "PROTOCOL",
  "REPORT",
  "ESTIMATE",
  "GOV_REGULATION",
  "CONTRACT",
  "TECHNICAL",
  "OTHER",
];

export type CreateDocumentInput = {
  buildingId: string;
  category: DocumentCategory;
  title: string;
  description?: string | null;
  fileUrl: string;
  fileSize?: number | null;
  fileType?: string | null;
  isPublic?: boolean;
  authorUserId: string;
};

export async function createDocument(osiId: string, input: CreateDocumentInput) {
  return forTenant(osiId, (tx) =>
    tx.document.create({
      data: {
        osiId,
        buildingId: input.buildingId,
        category: input.category,
        title: input.title,
        description: input.description ?? null,
        fileUrl: input.fileUrl,
        fileSize: input.fileSize ?? null,
        fileType: input.fileType ?? null,
        isPublic: input.isPublic ?? true,
        authorUserId: input.authorUserId,
      },
    }),
  );
}

export async function markDocumentRead(osiId: string, documentId: string, userId: string) {
  return forTenant(osiId, async (tx) => {
    const document = await tx.document.findUnique({ where: { id: documentId }, select: { id: true } });
    if (!document) throw new Error("Документ не найден");
    return tx.documentRead.upsert({
      where: {
        documentId_userId: { documentId, userId },
      },
      create: {
        osiId,
        documentId,
        userId,
      },
      update: {
        readAt: new Date(),
      },
    });
  });
}

export async function listDocumentsWithReadStatus(
  osiId: string,
  buildingId: string,
  userId: string,
  opts?: { isPublicOnly?: boolean; category?: DocumentCategory },
) {
  return forTenant(osiId, async (tx) => {
    const docs = await tx.document.findMany({
      where: {
        buildingId,
        ...(opts?.isPublicOnly ? { isPublic: true } : {}),
        ...(opts?.category ? { category: opts.category } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        reads: {
          where: { userId },
          select: { readAt: true },
        },
      },
    });

    return docs.map((d) => ({
      ...d,
      isRead: d.reads.length > 0,
      readAt: d.reads[0]?.readAt ?? null,
    }));
  });
}

export async function listDocuments(
  osiId: string,
  buildingId: string,
  opts?: { isPublicOnly?: boolean; category?: DocumentCategory },
) {
  return forTenant(osiId, async (tx) => {
    const docs = await tx.document.findMany({
      where: {
        buildingId,
        ...(opts?.isPublicOnly ? { isPublic: true } : {}),
        ...(opts?.category ? { category: opts.category } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { reads: true },
        },
      },
    });

    return docs.map((d) => ({
      ...d,
      readCount: d._count.reads,
    }));
  });
}

export async function getDocument(osiId: string, documentId: string) {
  return forTenant(osiId, (tx) =>
    tx.document.findUnique({
      where: { id: documentId },
    }),
  );
}

export async function deleteDocument(osiId: string, documentId: string) {
  return forTenant(osiId, (tx) =>
    tx.document.delete({
      where: { id: documentId },
    }),
  );
}
