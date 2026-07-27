/// <reference lib="webworker" />
// Кастомный service worker (customWorkerSrc @ducanh2912/next-pwa) — вшивается в sw.js при сборке.
// Обрабатывает web push (REQ-102/105): payload содержит ТОЛЬКО { type, notificationId } —
// показываем ОБОБЩЁННЫЙ заголовок по типу (без содержимого/ПДн, data residency NFR-001/051).
// Реальный текст пользователь видит в приложении (deep link /app?n=<id>).

declare const self: ServiceWorkerGlobalScope;

const GENERIC_TITLES: Record<string, string> = {
  ANNOUNCEMENT: "Новое объявление",
  REQUEST_CREATED: "Новая заявка",
  REQUEST_STATUS: "Статус заявки обновлён",
  REQUEST_MESSAGE: "Новое сообщение по заявке",
};

self.addEventListener("push", (event: PushEvent) => {
  let payload: { type?: string; notificationId?: string } = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    // Невалидный payload — показываем максимально общий вариант.
  }

  const title = GENERIC_TITLES[payload.type ?? ""] ?? "Новое уведомление ОСИ";
  const url = payload.notificationId ? `/app?n=${payload.notificationId}` : "/app";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: "Откройте приложение, чтобы посмотреть",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? "/app";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Уже открытое окно — фокусируем и ведём на deep link; иначе открываем новое.
      const existing = clients.find((c) => "focus" in c);
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});

export {};
