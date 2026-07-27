import type { InfoItemType, RequestCategory, RequestStatus } from "@prisma/client";
import { forTenant } from "@/lib/db/tenant";
import {
  notifyAnnouncementPublished,
  notifyRequestCreated,
  notifyRequestStatusChanged,
  notifyRequestMessage,
} from "@/lib/notifications/service";

// Коммуникация (features.md блок B): объявления с отметками о прочтении, заявки со статусами и
// тредом. Всё через forTenant — RLS изолирует по ОСИ. AnnouncementRead/RequestMessage несут osiId
// (денормализация под RLS, schema.prisma).
//
// Триггеры уведомлений (REQ-101) вызываются ПОСЛЕ коммита записи (вне её транзакции) и
// best-effort: сбой уведомления логируется, но не валит основное действие.

function fireAndLog(p: Promise<void>): Promise<void> {
  return p.catch((err) => {
    console.error("[notify] trigger failed:", err instanceof Error ? err.message : err);
  });
}

// ---- Контекст жителя: его дом/квартира (occupant → apartment → building) ----
export function getOccupantBuilding(osiId: string, userId: string) {
  return forTenant(osiId, (tx) =>
    tx.occupant.findFirst({
      where: { userId },
      select: { apartmentId: true, apartment: { select: { buildingId: true } } },
    }),
  );
}

// Профиль жителя для кабинета (REQ-052): ФИО, телефон, привязка к квартире/дому.
export function getResidentProfile(osiId: string, userId: string) {
  return forTenant(osiId, (tx) =>
    tx.occupant.findFirst({
      where: { userId },
      select: {
        fullName: true,
        phone: true,
        apartment: { select: { number: true, building: { select: { address: true } } } },
      },
    }),
  );
}

// ================= Объявления =================
export async function createAnnouncement(
  osiId: string,
  input: { buildingId: string; authorUserId: string; title: string; body: string; isPinned?: boolean },
) {
  const ann = await forTenant(osiId, (tx) =>
    tx.announcement.create({
      data: {
        osiId,
        buildingId: input.buildingId,
        authorUserId: input.authorUserId,
        title: input.title,
        body: input.body,
        isPinned: input.isPinned ?? false,
      },
    }),
  );
  // REQ-101: объявление → жителям дома.
  await fireAndLog(notifyAnnouncementPublished(osiId, ann));
  return ann;
}

export type AnnouncementView = {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: Date;
  readCount: number;
  readByViewer: boolean;
};

// Объявления дома + агрегат прочтений и признак «прочитано текущим пользователем».
export function listAnnouncements(
  osiId: string,
  buildingId: string,
  viewerUserId: string,
): Promise<AnnouncementView[]> {
  return forTenant(osiId, async (tx) => {
    const rows = await tx.announcement.findMany({
      where: { buildingId },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { reads: true } },
        reads: { where: { userId: viewerUserId }, select: { userId: true } },
      },
    });
    return rows.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      isPinned: a.isPinned,
      createdAt: a.createdAt,
      readCount: a._count.reads,
      readByViewer: a.reads.length > 0,
    }));
  });
}

// Отметка о прочтении (идемпотентно). Возвращает признак «объявление существует в этой ОСИ».
export function markAnnouncementRead(osiId: string, announcementId: string, userId: string) {
  return forTenant(osiId, async (tx) => {
    // RLS уже ограничивает объявление своей ОСИ; проверяем существование, чтобы не плодить
    // читатели на чужой/несуществующий id.
    const ann = await tx.announcement.findUnique({ where: { id: announcementId }, select: { id: true } });
    if (!ann) return false;
    await tx.announcementRead.upsert({
      where: { announcementId_userId: { announcementId, userId } },
      update: {},
      create: { osiId, announcementId, userId },
    });
    return true;
  });
}

// ================= Заявки =================
export async function createRequest(
  osiId: string,
  input: {
    buildingId: string;
    apartmentId?: string | null;
    authorUserId: string;
    category: RequestCategory;
    text: string;
    photoUrls?: string[];
  },
) {
  const request = await forTenant(osiId, (tx) =>
    tx.request.create({
      data: {
        osiId,
        buildingId: input.buildingId,
        apartmentId: input.apartmentId ?? null,
        authorUserId: input.authorUserId,
        category: input.category,
        text: input.text,
        photoUrls: input.photoUrls ?? [],
      },
    }),
  );
  // REQ-101: новая заявка → председателям ОСИ.
  await fireAndLog(notifyRequestCreated(osiId, request));
  return request;
}

// Список заявок с тредом. authorUserId задан → только свои (житель); иначе все по дому (председатель).
export function listRequests(
  osiId: string,
  opts: { buildingId?: string; authorUserId?: string },
) {
  return forTenant(osiId, (tx) =>
    tx.request.findMany({
      where: {
        ...(opts.buildingId ? { buildingId: opts.buildingId } : {}),
        ...(opts.authorUserId ? { authorUserId: opts.authorUserId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    }),
  );
}

export function getRequestWithMessages(osiId: string, requestId: string) {
  return forTenant(osiId, (tx) =>
    tx.request.findUnique({
      where: { id: requestId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    }),
  );
}

export async function addRequestMessage(
  osiId: string,
  requestId: string,
  authorUserId: string,
  text: string,
  attachments?: { audioUrl?: string; imageUrl?: string },
) {
  const result = await forTenant(osiId, async (tx) => {
    const req = await tx.request.findUnique({
      where: { id: requestId },
      select: { id: true, authorUserId: true },
    });
    if (!req) return null;
    const message = await tx.requestMessage.create({
      data: {
        osiId,
        requestId,
        authorUserId,
        text,
        audioUrl: attachments?.audioUrl,
        imageUrl: attachments?.imageUrl,
      },
    });
    return { message, req };
  });
  if (!result) return null;
  // REQ-101: сообщение в тред → другой стороне (не автору реплики).
  await fireAndLog(notifyRequestMessage(osiId, result.req, authorUserId, text));
  return result.message;
}

export async function setRequestStatus(osiId: string, requestId: string, status: RequestStatus) {
  const updated = await forTenant(osiId, async (tx) => {
    const req = await tx.request.findUnique({ where: { id: requestId }, select: { id: true } });
    if (!req) return null;
    return tx.request.update({ where: { id: requestId }, data: { status } });
  });
  if (!updated) return null;
  // REQ-101: смена статуса → автору заявки.
  await fireAndLog(notifyRequestStatusChanged(osiId, updated));
  return updated;
}

// ================= Инфо-раздел дома (features.md блок B) =================
export function listInfoItems(osiId: string, buildingId: string) {
  return forTenant(osiId, (tx) =>
    tx.infoItem.findMany({ where: { buildingId }, orderBy: { title: "asc" } }),
  );
}

export function createInfoItem(
  osiId: string,
  input: { buildingId: string; type: InfoItemType; title: string; content: string },
) {
  return forTenant(osiId, (tx) =>
    tx.infoItem.create({
      data: {
        osiId,
        buildingId: input.buildingId,
        type: input.type,
        title: input.title,
        content: input.content,
      },
    }),
  );
}
