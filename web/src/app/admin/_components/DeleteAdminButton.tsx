"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendJson } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type DeleteAdminButtonProps = {
  endpoint: "/api/admin/requests" | "/api/admin/announcements";
  body: { osiId: string; requestId?: string; announcementId?: string };
  testId?: string;
};

export function DeleteAdminButton({ endpoint, body, testId }: DeleteAdminButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Вы уверены, что хотите удалить эту запись? Это действие необратимо.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendJson("DELETE", endpoint, body);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при удалении");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={busy}
        onClick={handleDelete}
        data-testid={testId}
        className="flex items-center gap-1 rounded-full text-xs font-semibold"
      >
        <Trash2 size={13} />
        Удалить
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
