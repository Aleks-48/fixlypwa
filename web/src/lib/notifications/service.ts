import { requestCategoryLabels,requestStatusLabels } from "@/lib/comms/labels";
import { prisma } from "@/lib/db/prisma";
import { forTenant } from "@/lib/db/tenant";
import { publish } from "@/lib/events/bus";
import { reportPeriodLabel } from "@/lib/finance/periodLabel";
import type { NotificationType } from "@prisma/client";
import { sendFcmToMany } from "./fcm";
import { sendPushToMany } from "./push";

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
  // Два независимых канала (Web Push + FCM, ADR-0012 §5), каждый берёт токены ОДНИМ батч-запросом
  // на весь fan-out (не 2N запросов на N получателей — code review 2026-07-16). allSettled:
  // сбой одного канала не блокирует другой (REQ-128).
  const entries = created.map((n) => ({
    userId: n.userId,
    payload: { type: input.type, notificationId: n.id },
  }));
  // SSE (срез 24, REQ-132/133): та же дисциплина REQ-105 — в событие уходят только
  // type/entityType/entityId/notificationId, не title/body. Синхронно и локально (in-memory
  // bus), в отличие от push — не требует await, доставка мгновенная или никакая (нет
  // подписчика сейчас — клиент увидит изменение при следующей ручной загрузке).
  for (const n of created) {
    publish(n.userId, {
      type: input.type,
      notificationId: n.id,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    });
  }
  await Promise.allSettled([sendPushToMany(entries), sendFcmToMany(entries)]);
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

// Все мастера города = Master (APPROVED, identity-таблица)
export async function mastersOfCity(city: string): Promise<string[]> {
  const masters = await prisma.master.findMany({
    where: { city, status: "APPROVED" },
    select: { userId: true },
  });
  return masters.map((m) => m.userId);
}

export async function notifyMastersNewListing(city: string, listingId: string, _title: string): Promise<void> {
  const userIds = await mastersOfCity(city);
  if (userIds.length === 0) return;

  for (const userId of userIds) {
    publish(userId, {
      type: "MARKET_LISTING_CREATED",
      notificationId: listingId,
      entityType: "MarketListing",
      entityId: listingId,
    });
  }
}

// Жители конкретных квартир, сгруппированные по apartmentId (REQ-106: точечное уведомление
// о начислении — не всем жителям дома, как в residentsOfBuilding).
async function residentsByApartment(
  osiId: string,
  apartmentIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (apartmentIds.length === 0) return map;
  const occupants = await forTenant(osiId, (tx) =>
    tx.occupant.findMany({
      where: { apartmentId: { in: apartmentIds } },
      select: { apartmentId: true, userId: true },
    }),
  );
  for (const o of occupants) {
    map.set(o.apartmentId, [...(map.get(o.apartmentId) ?? []), o.userId]);
  }
  return map;
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

// Заявка жителя на подключение к ОСИ (REQ-152, docs/specs/osi-join-request.md) → председателям.
// identifier — телефон/email заявителя (contact для председателя, ПДн допустимы в теле —
// это in-app центр под RLS, не push-payload REQ-105).
export async function notifyOsiJoinRequest(
  osiId: string,
  req: { id: string; identifier: string; note: string | null },
): Promise<void> {
  const userIds = await chairmenOfOsi(osiId);
  await notify(osiId, {
    userIds,
    type: "OSI_JOIN_REQUEST",
    title: "Заявка на подключение",
    body: req.note ? `${req.identifier} · ${truncate(req.note)}` : req.identifier,
    entityType: "osi_join_request",
    entityId: req.id,
  });
}

// Массовая генерация начислений (REQ-106) → жителям квартиры. Один вызов на прогон
// generateCharges с уже агрегированной суммой по квартире (не по каждому Charge отдельно —
// иначе несколько тарифов дадут несколько уведомлений за одно и то же начисление). Квартиры
// без жителей молча пропускаются (нет адресата — не ошибка).
export async function notifyChargesCreated(
  osiId: string,
  items: { apartmentId: string; accountId: string; period: Date; amount: number }[],
): Promise<void> {
  if (items.length === 0) return;
  const residents = await residentsByApartment(
    osiId,
    items.map((i) => i.apartmentId),
  );
  await Promise.all(
    items.map((item) => {
      const userIds = residents.get(item.apartmentId);
      if (!userIds || userIds.length === 0) return Promise.resolve();
      return notify(osiId, {
        userIds,
        type: "CHARGE_CREATED",
        title: "Начислена оплата",
        body: `За ${reportPeriodLabel("MONTHLY", item.period)}: ₸ ${item.amount.toLocaleString("ru-RU")}`,
        entityType: "charge",
        entityId: item.accountId,
      });
    }),
  );
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
