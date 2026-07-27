"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/apiClient";
import { requestStatusLabels, requestStatusOrder } from "@/lib/comms/labels";
import { Button } from "@/components/ui/button";

// Смена статуса заявки председателем: принята → в работе → решена (REQ + features.md блок B).
export function RequestStatusControls({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setStatus(next: string) {
    if (next === status) return;
    setLoading(true);
    try {
      await postJson(`/api/requests/${id}/status`, { status: next });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div role="group" aria-label="Статус заявки" className="flex flex-wrap gap-1.5">
      {requestStatusOrder.map((s) => {
        const active = s === status;
        return (
          <Button
            key={s}
            type="button"
            variant={active ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus(s)}
            disabled={loading || active}
            aria-pressed={active}
            data-testid={`status-${s}`}
            className="h-7 rounded-full px-2.5 text-xs"
          >
            {requestStatusLabels[s]}
          </Button>
        );
      })}
    </div>
  );
}
