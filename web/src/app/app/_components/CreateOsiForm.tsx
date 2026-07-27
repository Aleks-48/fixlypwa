"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/apiClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Bootstrap ОСИ (Q-051): создатель становится председателем. Онбординг «без беготни» (features §0.1).
export function CreateOsiForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [bin, setBin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/osi", { name, ...(bin ? { bin } : {}) });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="osi-name">Название ОСИ</Label>
        <Input
          id="osi-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          placeholder="ОСИ «Абая 1»"
          data-testid="osi-name"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="osi-bin">
          БИН <span className="text-muted-foreground">(необязательно)</span>
        </Label>
        <Input
          id="osi-bin"
          value={bin}
          onChange={(e) => setBin(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          maxLength={12}
          placeholder="12 цифр"
          data-testid="osi-bin"
        />
      </div>
      <Button type="submit" disabled={loading} data-testid="osi-submit">
        {loading ? "Создаём…" : "Создать ОСИ"}
      </Button>
      {error && (
        <p role="alert" data-testid="error" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
