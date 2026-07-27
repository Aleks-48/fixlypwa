"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

// Колокольчик + лента уведомлений (REQ-100). Счётчик приходит с сервера (initialUnread),
// лента подгружается при открытии панели; «прочитать всё» сбрасывает счётчик.

type Item = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Item[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/notifications");
    const json = (await res.json().catch(() => null)) as {
      data?: { notifications: Item[]; unread: number };
    } | null;
    if (json?.data) {
      setItems(json.data.notifications);
      setUnread(json.data.unread);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void load();
  }

  async function markAll() {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setUnread(0);
    setItems((prev) =>
      prev?.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })) ?? null,
    );
  }

  // Закрытие по клику вне панели и по Escape (a11y).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={toggle}
        aria-expanded={open}
        aria-label={unread > 0 ? `Уведомления, непрочитанных: ${unread}` : "Уведомления"}
        data-testid="bell"
        className="relative size-9 rounded-full"
      >
        <Bell aria-hidden size={17} />
        {unread > 0 && (
          <span
            data-testid="bell-count"
            className="absolute -right-1 -top-1 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] font-semibold text-destructive-foreground"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Уведомления"
          data-testid="notifications-panel"
          className="absolute right-0 top-11 z-50 w-[min(320px,88vw)] max-h-[400px] overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-lg"
        >
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <strong className="text-sm">Уведомления</strong>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                data-testid="mark-all-read"
                className="cursor-pointer border-none bg-transparent p-0 text-sm text-primary"
              >
                Прочитать всё
              </button>
            )}
          </div>

          {items === null ? (
            <p className="p-2 text-sm text-muted-foreground">Загрузка…</p>
          ) : items.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">Пока пусто.</p>
          ) : (
            <ul className="grid list-none gap-1 p-0">
              {items.map((n) => (
                <li
                  key={n.id}
                  data-testid="notification-item"
                  className={`rounded-xl p-2 ${n.readAt ? "" : "bg-accent"}`}
                >
                  <div className="flex justify-between gap-2">
                    <strong className="text-sm">{n.title}</strong>
                    {!n.readAt && (
                      <span aria-label="не прочитано" className="text-primary">
                        •
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
