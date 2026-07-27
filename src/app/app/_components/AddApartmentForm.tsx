"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/apiClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Добавить квартиру в дом (REQ-011).
export function AddApartmentForm({ buildingId }: { buildingId: string }) {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [area, setArea] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/apartments", {
        buildingId,
        number,
        ...(area ? { area: Number(area) } : {}),
      });
      setNumber("");
      setArea("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2.5">
      <Input
        aria-label="Номер квартиры"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        required
        placeholder="№ квартиры"
        data-testid="apartment-number"
        className="flex-1 basis-[120px]"
      />
      <Input
        aria-label="Площадь, м²"
        value={area}
        onChange={(e) => setArea(e.target.value.replace(/[^\d.]/g, ""))}
        inputMode="decimal"
        placeholder="м² (необяз.)"
        data-testid="apartment-area"
        className="flex-1 basis-[120px]"
      />
      <Button type="submit" disabled={loading} data-testid="apartment-submit" className="basis-full">
        {loading ? "Добавляем…" : "Добавить квартиру"}
      </Button>
      {error && (
        <p role="alert" data-testid="error" className="m-0 basis-full text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
