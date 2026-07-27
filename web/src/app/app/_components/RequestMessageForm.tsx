"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/apiClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Сообщение в тред заявки (features.md блок B — тред).
export function RequestMessageForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson(`/api/requests/${requestId}/messages`, { text });
      setText("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2">
      <Input
        aria-label="Сообщение"
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
        placeholder="Написать в тред…"
        data-testid="msg-text"
        className="flex-1 basis-[200px]"
      />
      <Button type="submit" disabled={loading} data-testid="msg-submit" className="w-auto">
        {loading ? "…" : "Отправить"}
      </Button>
      {error && (
        <p role="alert" data-testid="error" className="m-0 basis-full text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
