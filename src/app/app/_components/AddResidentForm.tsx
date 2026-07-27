"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { postJson } from "@/lib/apiClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Привязать жителя к квартире (REQ-013). Житель потом входит по телефону+OTP.
export function AddResidentForm({ apartmentId }: { apartmentId: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/residents", { apartmentId, fullName, phone });
      setFullName("");
      setPhone("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid={`add-resident-${apartmentId}`}
        className="h-7 gap-1 px-2 text-primary"
      >
        <UserPlus aria-hidden size={14} /> Житель
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <Input
        aria-label="ФИО жителя"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
        minLength={2}
        placeholder="ФИО"
        data-testid="resident-name"
      />
      <Input
        aria-label="Телефон жителя"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        type="tel"
        placeholder="+7 701 000 00 01"
        data-testid="resident-phone"
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} data-testid="resident-submit" size="sm">
          {loading ? "Сохраняем…" : "Добавить"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
          Отмена
        </Button>
      </div>
      {error && (
        <p role="alert" data-testid="error" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
