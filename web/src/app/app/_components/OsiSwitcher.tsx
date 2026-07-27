"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/apiClient";

// Переключатель активной ОСИ (REQ-004): председатель нескольких ОСИ меняет рабочий контекст.
// Сервер проверяет право на выбранную ОСИ (switch-osi), RLS-контекст меняется через сессию.
export function OsiSwitcher({
  options,
  activeOsiId,
}: {
  options: { id: string; name: string }[];
  activeOsiId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (options.length < 2) return null; // одна ОСИ — переключать нечего

  async function change(e: React.ChangeEvent<HTMLSelectElement>) {
    setBusy(true);
    try {
      await postJson("/api/auth/switch-osi", { osiId: e.target.value });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      aria-label="Активная ОСИ"
      value={activeOsiId}
      onChange={change}
      disabled={busy}
      data-testid="osi-switcher"
      className="h-9 max-w-44 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
