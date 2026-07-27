import type { DocumentCategory } from "@prisma/client";
import { forTenant } from "@/lib/db/tenant";

// Сервисный слой для Библиотеки документов ОСИ (Document Library).
// Все операции выполняются под RLS через forTenant(osiId, ...).

// src/lib/documents/constants.ts

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  GOV_REGULATION: "Нормативные акты",
  REPORT: "Отчёты",
  PROTOCOL: "Протоколы",
  CONTRACT: "Договоры",
  TECHNICAL: "Техническая документация",
  OTHER: "Прочее",
};

export const documentCategoryOrder: DocumentCategory[] = [
  "GOV_REGULATION",
  "REPORT",
  "PROTOCOL",
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

export async function listDocuments(
  osiId: string,
  buildingId: string,
  opts?: { isPublicOnly?: boolean; category?: DocumentCategory },
) {
  return forTenant(osiId, (tx) =>
    tx.document.findMany({
      where: {
        buildingId,
        ...(opts?.isPublicOnly ? { isPublic: true } : {}),
        ...(opts?.category ? { category: opts.category } : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
  );
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
