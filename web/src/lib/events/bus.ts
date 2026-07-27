// In-memory pub/sub для SSE (срез 24, REQ-132/133). Один Map<userId, слушатели> в памяти
// процесса Next.js — публикует notify() (web/src/lib/notifications/service.ts), читает
// GET /api/events.
//
// ⚠️ Однопроцессная реализация: клиент получает события только от того инстанса app, к
// которому подключён по SSE. При горизонтальном масштабировании (несколько инстансов Next.js
// за балансировщиком — см. NFR в CLAUDE.md) событие, опубликованное на другом инстансе, до
// этого соединения не дойдёт. Не блокирует MVP на одном инстансе (текущий docker-compose.yml);
// внешний pub/sub (Redis/Postgres LISTEN) — задача следующего среза при переходе на несколько
// реплик, не этого.

export type BusEvent = {
  type: string;
  notificationId: string;
  entityType: string | null;
  entityId: string | null;
};

type Listener = (event: BusEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(userId: string, listener: Listener): () => void {
  let set = listeners.get(userId);
  if (!set) {
    set = new Set();
    listeners.set(userId, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0 && listeners.get(userId) === set) {
      listeners.delete(userId);
    }
  };
}

export function publish(userId: string, event: BusEvent): void {
  const set = listeners.get(userId);
  if (!set) return;
  for (const listener of set) listener(event);
}
