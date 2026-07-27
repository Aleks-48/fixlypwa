import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import type { PushPayload } from "./push";

// FCM-доставка для нативного клиента (ADR-0012 §5, REQ-127..130) — параллельный канал к
// Web Push (push.ts): разные протоколы, разные таблицы (FcmToken vs PushSubscription), общий
// payload-контракт { type, notificationId } (REQ-105 — без ПДн/содержимого, текст читается
// через наш API). Graceful-off без сервисного аккаунта — тот же паттерн, что и VAPID.

type FcmApp = import("firebase-admin/app").App;
type FcmMessaging = import("firebase-admin/messaging").Messaging;

// Мемоизируем ПРОМИС инициализации, не флаг: с флагом (initTried=true до завершения await)
// конкурентные вызовы первого fan-out видели app===null и молча выходили — FCM-push первой
// рассылки уходил только первому получателю (code review 2026-07-16). Промис же все ждут общий.
let messagingPromise: Promise<FcmMessaging | null> | null = null;
let warned = false;

function fcmConfigured(): boolean {
  return Boolean(
    env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY,
  );
}

async function initMessaging(): Promise<FcmMessaging | null> {
  if (!fcmConfigured()) {
    if (!warned) {
      console.warn("[fcm] FIREBASE_* не заданы — push в приложение отключён (Web Push и in-app центр работают)");
      warned = true;
    }
    return null;
  }
  const [{ initializeApp, cert }, { getMessaging }] = await Promise.all([
    import("firebase-admin/app"),
    import("firebase-admin/messaging"),
  ]);
  const app: FcmApp = initializeApp(
    {
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        // .env хранит ключ с литеральными \n (многострочность в одну переменную) — разворачиваем.
        privateKey: (env.FIREBASE_PRIVATE_KEY as string).replace(/\\n/g, "\n"),
      }),
    },
    "fixlypwa-fcm",
  );
  return getMessaging(app);
}

function ensureMessaging(): Promise<FcmMessaging | null> {
  messagingPromise ??= initMessaging().catch((err) => {
    // Ошибка инициализации (битый ключ) — канал выключен, но не навсегда закэширован промисом-ошибкой.
    console.warn("[fcm] инициализация не удалась — канал отключён:", err);
    messagingPromise = null;
    return null;
  });
  return messagingPromise;
}

// Адресная доставка: у каждого получателя СВОЙ payload (его notificationId, REQ-105), поэтому
// multicast одного сообщения на всех невозможен. Батчится выборка токенов (один findMany на
// весь fan-out — не N+1, code review 2026-07-16) и отправка (sendEach: firebase-admin шлёт
// пачку по общему HTTP/2-соединению; batch-endpoint FCM закрыт Google в 2024, sendEach — замена).
export async function sendFcmToMany(entries: { userId: string; payload: PushPayload }[]): Promise<void> {
  if (entries.length === 0) return;
  const messaging = await ensureMessaging();
  if (!messaging) return;

  const byUser = new Map(entries.map((e) => [e.userId, e.payload]));
  const tokens = await prisma.fcmToken.findMany({
    where: { userId: { in: [...byUser.keys()] } },
  });
  if (tokens.length === 0) return;

  const messages = tokens.map((t) => {
    const payload = byUser.get(t.userId)!;
    return {
      token: t.token,
      data: { type: payload.type, notificationId: payload.notificationId },
    };
  });

  try {
    const res = await messaging.sendEach(messages);
    // Мёртвые токены (REQ-130) — удаляем; прочие ошибки глотаем: push — прогрессивное
    // улучшение поверх in-app центра, никогда не бросает наружу. responses[i] соответствует
    // messages[i], а messages строились из tokens — индексы совпадают по контракту sendEach.
    const dead: string[] = [];
    res.responses.forEach((r, i) => {
      const code = r.error?.code ?? "";
      const token = tokens[i];
      if (
        token &&
        (code.includes("registration-token-not-registered") || code.includes("invalid-argument"))
      ) {
        dead.push(token.id);
      }
    });
    if (dead.length > 0) {
      await prisma.fcmToken.deleteMany({ where: { id: { in: dead } } }).catch(() => {});
    }
  } catch {
    // Сбой всей пачки (сеть/квота) — глотаем, как и в sendPushToUsers.
  }
}

// Один payload на группу пользователей — тонкая обёртка над батчем (используется тестами
// и точечными отправками).
export async function sendFcmToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  await sendFcmToMany(userIds.map((userId) => ({ userId, payload })));
}

export async function saveFcmToken(userId: string, token: string): Promise<void> {
  await prisma.fcmToken.upsert({
    where: { token },
    update: { userId },
    create: { userId, token },
  });
}

// userId обязателен: удалить можно только СВОЙ токен (иначе любой вошедший, узнавший чужую
// строку токена, отписывал бы чужое устройство от push — code review 2026-07-16).
export async function removeFcmToken(userId: string, token: string): Promise<void> {
  await prisma.fcmToken.deleteMany({ where: { token, userId } });
}
