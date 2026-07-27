import webpush, { WebPushError } from "web-push";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";

// Web Push доставка (REQ-102/103/105). Payload — ТОЛЬКО { type, notificationId }: доставка идёт
// через FCM/autopush (серверы вне РК), никаких ПДн/содержимого (REQ-105, NFR-001/051).
// Текст уведомления живёт в таблице Notification (под RLS) и читается через наш API.

export type PushPayload = { type: string; notificationId: string };

let vapidReady = false;
let warned = false;

export function webPushConfigured(): boolean {
  return Boolean(
    env.WEB_PUSH_EMAIL &&
      env.WEB_PUSH_PRIVATE_KEY &&
      env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY,
  );
}

function ensureVapid(): boolean {
  if (!webPushConfigured()) {
    if (!warned) {
      console.warn("[push] VAPID-ключи не заданы — web push отключён (in-app центр работает)");
      warned = true;
    }
    return false;
  }
  if (!vapidReady) {
    webpush.setVapidDetails(
      `mailto:${env.WEB_PUSH_EMAIL}`,
      env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY as string,
      env.WEB_PUSH_PRIVATE_KEY as string,
    );
    vapidReady = true;
  }
  return true;
}

// Best-effort fan-out с адресным payload (у каждого получателя свой notificationId, REQ-105).
// Выборка подписок — ОДИН findMany на весь fan-out (не по одному на получателя — code review
// 2026-07-16). 404/410 от шлюза → подписка мертва, удаляем (REQ-103). Никогда не бросает наружу.
export async function sendPushToMany(
  entries: { userId: string; payload: PushPayload }[],
): Promise<void> {
  if (entries.length === 0 || !ensureVapid()) return;

  const byUser = new Map(entries.map((e) => [e.userId, e.payload]));
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: [...byUser.keys()] } },
  });
  if (subs.length === 0) return;

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(byUser.get(s.userId)),
        );
      } catch (err) {
        if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          await prisma.pushSubscription
            .delete({ where: { endpoint: s.endpoint } })
            .catch(() => {});
        }
        // Прочие ошибки доставки глотаем: push — прогрессивное улучшение поверх in-app центра.
      }
    }),
  );
}

// Один payload на группу пользователей — тонкая обёртка над батчем.
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  await sendPushToMany(userIds.map((userId) => ({ userId, payload })));
}

export async function savePushSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent: string | null,
): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent },
    create: {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent,
    },
  });
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}
