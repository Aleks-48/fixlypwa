"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/apiClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Добавить дом в активную ОСИ (REQ-010).
export function AddBuildingForm() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [count, setCount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/buildings", {
        address,
        ...(count ? { apartmentsCount: Number(count) } : {}),
      });
      setAddress("");
      setCount("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3.5">
      <div className="grid gap-1.5">
        <Label htmlFor="b-address">Адрес дома</Label>
        <Input
          id="b-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          minLength={3}
          placeholder="ул. Абая, 1"
          data-testid="building-address"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="b-count">
          Кол-во квартир <span className="text-muted-foreground">(необязательно)</span>
        </Label>
        <Input
          id="b-count"
          value={count}
          onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          data-testid="building-count"
        />
      </div>
      <Button type="submit" disabled={loading} data-testid="building-submit">
        {loading ? "Добавляем…" : "Добавить дом"}
      </Button>
      {error && (
        <p role="alert" data-testid="error" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
