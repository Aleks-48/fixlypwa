import { forTenant } from "@/lib/db/tenant";
import type { IKomekCategory, IKomekStatus } from "@prisma/client";

export const ikomekCategoryLabels: Record<IKomekCategory, string> = {
  HEATING: "Отопление",
  WATER_SUPPLY: "Водоснабжение",
  YARD: "Благоустройство двора",
  GARBAGE: "Вывоз мусора",
  LIGHTING: "Освещение",
  OTHER: "Прочее",
};

export const ikomekStatusLabels: Record<IKomekStatus, string> = {
  PENDING: "Отправлено",
  IN_PROGRESS: "В работе",
  RESOLVED: "Завершено",
};

export type CreateIKomekComplaintInput = {
  buildingId: string;
  apartmentId?: string | null;
  authorUserId: string;
  category: IKomekCategory;
  description: string;
  photoUrls?: string[];
};

export async function createIKomekComplaint(
  osiId: string,
  input: CreateIKomekComplaintInput,
) {
  // Генерируем тестовый номер тикета 109 (например 109-XXXXX)
  const ticketNumber = `109-${Math.floor(10000 + Math.random() * 90000)}`;

  return forTenant(osiId, (tx) =>
    tx.iKomekComplaint.create({
      data: {
        osiId,
        buildingId: input.buildingId,
        apartmentId: input.apartmentId ?? null,
        authorUserId: input.authorUserId,
        category: input.category,
        description: input.description,
        photoUrls: input.photoUrls ?? [],
        status: "PENDING",
        ticketNumber,
      },
    }),
  );
}

export async function listIKomekComplaints(
  osiId: string,
  opts?: { buildingId?: string; authorUserId?: string },
) {
  return forTenant(osiId, (tx) =>
    tx.iKomekComplaint.findMany({
      where: {
        ...(opts?.buildingId ? { buildingId: opts.buildingId } : {}),
        ...(opts?.authorUserId ? { authorUserId: opts.authorUserId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        building: { select: { address: true } },
        apartment: { select: { number: true } },
      },
    }),
  );
}
