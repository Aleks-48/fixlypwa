import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { forTenant } from "@/lib/db/tenant";
import { requestCategoryLabels, requestStatusLabels } from "@/lib/comms/labels";
import { sendPushToUsers } from "./push";

// In-app центр уведомлений (REQ-100/101) + запуск Web Push (REQ-105: в push уходит только
// type+id, текст — здесь, в нашей БД под RLS). Триггеры вызываются из comms/service.ts.

type NotifyInput = {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
};

function truncate(s: string, n = 120): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// Ядро: создаёт по одной Notification на получателя (forTenant, WITH CHECK по osiId) и шлёт push.
// Best-effort — ошибки доставки не валят основное действие (вызывается через .catch у триггера).
export async function notify(osiId: string, input: NotifyInput): Promise<void> {
  const userIds = [...new Set(input.userIds)];
  if (userIds.length === 0) return;

  const created = await forTenant(osiId, (tx) =>
    tx.notification.createManyAndReturn({
      data: userIds.map((userId) => ({
        osiId,
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      })),
      select: { id: true, userId: true },
    }),
  );

  // Push: каждому получателю — только его notificationId + тип (REQ-105, без ПДн/содержимого).
  await Promise.allSettled(
    created.map((n) =>
      sendPushToUsers([n.userId], { type: input.type, notificationId: n.id }),
    ),
  );
}

// ---- Разрешение получателей (кто узнаёт о событии, REQ-101) ----

// Жители дома = Occupant'ы квартир этого дома (tenant → forTenant).
function residentsOfBuilding(osiId: string, buildingId: string): Promise<string[]> {
  return forTenant(osiId, async (tx) => {
    const occ = await tx.occupant.findMany({
      where: { apartment: { buildingId } },
      select: { userId: true },
    });
    return occ.map((o) => o.userId);
  });
}

// Председатели ОСИ = UserOsiRole (identity-таблица, вне RLS → обычный prisma).
async function chairmenOfOsi(osiId: string): Promise<string[]> {
  const roles = await prisma.userOsiRole.findMany({
    where: { osiId, role: { in: ["CHAIRMAN", "SUPERADMIN"] } },
    select: { userId: true },
  });
  return roles.map((r) => r.userId);
}

// ---- Триггеры (вызываются из comms/service.ts после записи) ----

export async function notifyAnnouncementPublished(
  osiId: string,
  ann: { id: string; buildingId: string; title: string },
): Promise<void> {
  const userIds = await residentsOfBuilding(osiId, ann.buildingId);
  await notify(osiId, {
    userIds,
    type: "ANNOUNCEMENT",
    title: "Новое объявление",
    body: ann.title,
    entityType: "announcement",
    entityId: ann.id,
  });
}

export async function notifyRequestCreated(
  osiId: string,
  req: { id: string; category: string; text: string },
): Promise<void> {
  const userIds = await chairmenOfOsi(osiId);
  await notify(osiId, {
    userIds,
    type: "REQUEST_CREATED",
    title: "Новая заявка",
    body: `${requestCategoryLabels[req.category] ?? req.category}: ${truncate(req.text)}`,
    entityType: "request",
    entityId: req.id,
  });
}

export async function notifyRequestStatusChanged(
  osiId: string,
  req: { id: string; status: string; authorUserId: string },
): Promise<void> {
  await notify(osiId, {
    userIds: [req.authorUserId],
    type: "REQUEST_STATUS",
    title: "Статус заявки изменён",
    body: requestStatusLabels[req.status] ?? req.status,
    entityType: "request",
    entityId: req.id,
  });
}

// Сообщение в тред → «другой стороне». Автор реплики === автор заявки → шлём председателям,
// иначе → автору заявки.
export async function notifyRequestMessage(
  osiId: string,
  req: { id: string; authorUserId: string },
  messageAuthorUserId: string,
  text: string,
): Promise<void> {
  const authoredByResident = messageAuthorUserId === req.authorUserId;
  const userIds = authoredByResident
    ? await chairmenOfOsi(osiId)
    : [req.authorUserId];
  await notify(osiId, {
    userIds: userIds.filter((id) => id !== messageAuthorUserId),
    type: "REQUEST_MESSAGE",
    title: "Новое сообщение по заявке",
    body: truncate(text),
    entityType: "request",
    entityId: req.id,
  });
}

// ---- Чтение центра уведомлений (REQ-100) ----

export function listNotifications(osiId: string, userId: string) {
  return forTenant(osiId, (tx) =>
    tx.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  );
}

export function getUnreadCount(osiId: string, userId: string): Promise<number> {
  return forTenant(osiId, (tx) =>
    tx.notification.count({ where: { userId, readAt: null } }),
  );
}

// Отметить прочитанным: конкретное (id) или все непрочитанные пользователя.
export function markRead(osiId: string, userId: string, id?: string): Promise<number> {
  return forTenant(osiId, async (tx) => {
    const res = await tx.notification.updateMany({
      where: { userId, readAt: null, ...(id ? { id } : {}) },
      data: { readAt: new Date() },
    });
    return res.count;
  });
}
