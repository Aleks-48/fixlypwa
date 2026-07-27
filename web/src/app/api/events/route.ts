import type { NextRequest } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { Errors } from "@/lib/http";
import { subscribe, type BusEvent } from "@/lib/events/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;

// GET /api/events — SSE-поток уведомлений текущего пользователя (срез 24, REQ-132/133,
// заменяет поллинг: список заявок, тред заявки, лента объявлений, центр уведомлений).
// Авторизация — та же getCurrentAuth() (cookie у браузера, Authorization: Bearer у
// мобильного клиента, REQ-122) — EventSource в браузере шлёт cookie сам; Flutter не
// использует EventSource API (нет поддержки заголовков), а стримит ответ вручную поверх
// http.Client с тем же Bearer-заголовком, что и обычные запросы — доп. транспорт
// (query-параметр с токеном в URL) не понадобился.
export async function GET(req: NextRequest) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const userId = auth.user.id;
  const encoder = new TextEncoder();

  let unsubFn: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const doCleanup = () => {
    unsubFn?.();
    unsubFn = null;
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: BusEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`event: notification\ndata: ${JSON.stringify(event)}\n\n`),
          );
        } catch {
          // Контроллер уже закрыт (клиент отвалился раньше, чем сработал cancel/abort) —
          // событие просто теряется, отписка произойдёт по abort-листенеру ниже.
        }
      };
      controller.enqueue(encoder.encode(": connected\n\n"));
      unsubFn = subscribe(userId, send);
      // Пинг держит соединение живым сквозь прокси/таймауты idle-соединений (nginx, мобильная
      // сеть) — без данных клиент не узнает о разрыве до системного TCP-таймаута.
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // см. комментарий в send()
        }
      }, HEARTBEAT_MS);
    },
    cancel() {
      doCleanup();
    },
  });

  req.signal.addEventListener("abort", doCleanup);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // nginx по умолчанию буферизует ответы (docker/nginx/app.conf не выставляет
      // proxy_buffering off) — без этого заголовка SSE-поток дойдёт до клиента только
      // после закрытия соединения, что для бесконечного потока означает «никогда».
      "X-Accel-Buffering": "no",
    },
  });
}
