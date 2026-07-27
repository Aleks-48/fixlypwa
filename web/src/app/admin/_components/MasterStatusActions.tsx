"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendJson } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";

// Действия по анкете мастера (REQ-114): любой статус → любой (повторное одобрение после
// BLOCKED допустимо — admin-panel.md §2). Кнопка текущего статуса скрыта.
export function MasterStatusActions({ masterId, status }: { masterId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: string) {
    setBusy(true);
    setError(null);
    try {
      await sendJson("PATCH", `/api/admin/masters/${masterId}`, { status: next });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status !== "APPROVED" && (
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => setStatus("APPROVED")}
          data-testid="master-approve"
          className="h-8 rounded-full"
        >
          Одобрить
        </Button>
      )}
      {status !== "REJECTED" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => setStatus("REJECTED")}
          data-testid="master-reject"
          className="h-8 rounded-full"
        >
          Отклонить
        </Button>
      )}
      {status !== "BLOCKED" && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => setStatus("BLOCKED")}
          data-testid="master-block"
          className="h-8 rounded-full text-destructive"
        >
          Заблокировать
        </Button>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
