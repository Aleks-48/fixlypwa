"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendJson } from "@/lib/apiClient";
import { selectClassName } from "@/lib/ui";
import { Button } from "@/components/ui/button";

const STATUSES = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"] as const;

// Управление подпиской дома (REQ-111): статус + сохранение (upsert на сервере).
// Нативный <select> — как везде в проекте (e2e-совместимость, см. lib/ui.ts).
export function SubscriptionEditor({
  osiId,
  buildingId,
  currentStatus,
}: {
  osiId: string;
  buildingId: string;
  currentStatus: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus ?? "TRIAL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await sendJson("PUT", "/api/admin/subscriptions", { osiId, buildingId, status });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className={`${selectClassName} h-8 w-auto text-sm`}
        data-testid="sub-status"
        aria-label="Статус подписки"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy || status === (currentStatus ?? "")}
        onClick={save}
        data-testid="sub-save"
        className="h-8 rounded-full"
      >
        Сохранить
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
