"use client";

import { useState } from "react";
import { postJson } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";

// Сброс пароля председателя (REQ-112): новый временный пароль показывается один раз,
// все сессии пользователя отзываются на сервере.
export function ResetPasswordButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reset() {
    setBusy(true);
    setError(null);
    try {
      const data = await postJson<{ tempPassword: string }>(
        `/api/admin/chairmen/${userId}/reset-password`,
        {},
      );
      setTempPassword(data.tempPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={reset}
        data-testid="chair-reset-password"
        className="h-7 rounded-full text-xs text-muted-foreground"
      >
        Сбросить пароль
      </Button>
      {tempPassword && (
        <code className="rounded bg-warning-soft px-1.5 py-0.5 text-xs font-bold">
          {tempPassword}
        </code>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
