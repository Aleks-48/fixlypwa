"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

type Prefs = {
  announcements: boolean;
  requestUpdates: boolean;
  charges: boolean;
};

const LABELS: { key: keyof Prefs; label: string; desc: string }[] = [
  {
    key: "announcements",
    label: "Объявления дома",
    desc: "Новые объявления от председателя",
  },
  {
    key: "requestUpdates",
    label: "Статус заявок",
    desc: "Изменения статуса ваших заявок",
  },
  {
    key: "charges",
    label: "Новые начисления",
    desc: "Квитанции и счета за обслуживание",
  },
];

// Тумблеры push-уведомлений (REQ-048)
export function NotificationPrefsForm({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState<keyof Prefs | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: keyof Prefs) {
    const next = !prefs[key];
    setSaving(key);
    setError(null);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Ошибка");
      setPrefs((p) => ({ ...p, [key]: next }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="grid gap-4">
      {LABELS.map(({ key, label, desc }) => (
        <div key={key} className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="m-0 text-sm font-medium">{label}</p>
            <p className="m-0 text-xs text-muted-foreground">{desc}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs[key]}
            onClick={() => toggle(key)}
            disabled={saving === key}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              prefs[key] ? "bg-primary" : "bg-secondary"
            } ${saving === key ? "opacity-50" : ""}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                prefs[key] ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
            {saving === key && (
              <Loader2 className="absolute right-[-22px] size-3.5 animate-spin text-muted-foreground" />
            )}
          </button>
        </div>
      ))}
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
