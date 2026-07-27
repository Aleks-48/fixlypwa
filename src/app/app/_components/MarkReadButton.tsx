"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { postJson } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";

// Отметка «прочитано» жителем (features.md блок B — отметки о прочтении).
export function MarkReadButton({ id, read }: { id: string; read: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (read) {
    return (
      <span data-testid="ann-read" className="flex items-center gap-1 text-sm text-primary">
        <Check aria-hidden size={14} /> Прочитано
      </span>
    );
  }

  async function mark() {
    setLoading(true);
    try {
      await postJson(`/api/announcements/${id}/read`, {});
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={mark}
      disabled={loading}
      data-testid={`ann-mark-${id}`}
      className="h-8 rounded-full text-primary"
    >
      {loading ? "…" : "Отметить прочитанным"}
    </Button>
  );
}
