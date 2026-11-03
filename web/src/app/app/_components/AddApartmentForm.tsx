"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/apiClient";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AddApartmentForm({ buildingId }: { buildingId: string }) {
  const { t } = useTranslation();
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
        aria-label={t("label_apt_number")}
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        required
        placeholder={t("label_apt_number")}
        data-testid="apartment-number"
        className="flex-1 basis-[120px]"
      />
      <Input
        aria-label={t("label_area")}
        value={area}
        onChange={(e) => setArea(e.target.value.replace(/[^\d.]/g, ""))}
        inputMode="decimal"
        placeholder={t("label_area_optional")}
        data-testid="apartment-area"
        className="flex-1 basis-[120px]"
      />
      <Button type="submit" disabled={loading} data-testid="apartment-submit" className="basis-full">
        {loading ? t("status_adding") : t("label_add_apartment")}
      </Button>
      {error && (
        <p role="alert" data-testid="error" className="m-0 basis-full text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
