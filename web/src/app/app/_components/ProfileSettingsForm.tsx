"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, CheckCircle2 } from "lucide-react";

type Props = {
  fullName: string | null;
  phone: string | null;
  email: string | null;
  language: string;
};

// Форма персональных данных и языка (REQ-046, REQ-047)
export function ProfileSettingsForm({ fullName, phone, email, language }: Props) {
  const [form, setForm] = useState({
    fullName: fullName ?? "",
    email: email ?? "",
    language,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName || undefined,
          email: form.email || null,
          language: form.language,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Ошибка");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="profile-fullname">ФИО</Label>
          <Input
            id="profile-fullname"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Асан Пердешев"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="profile-phone">Телефон</Label>
          <Input
            id="profile-phone"
            value={phone ?? ""}
            readOnly
            disabled
            className="opacity-60"
            placeholder="—"
          />
          <p className="text-xs text-muted-foreground">
            Телефон используется для входа и не может быть изменён здесь.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="profile-email">Email</Label>
          <Input
            id="profile-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.kz"
          />
        </div>
      </div>

      {/* Выбор языка */}
      <div className="grid gap-2">
        <Label>Язык интерфейса</Label>
        <div className="flex gap-3">
          {(["ru", "kk"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setForm({ ...form, language: lang })}
              className={`flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-colors ${
                form.language === lang
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40"
              }`}
            >
              {lang === "ru" ? "🇷🇺 Русский" : "🇰🇿 Қазақша"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <Save className="size-4" />
          )}
          {saved ? "Сохранено!" : "Сохранить"}
        </Button>
      </div>
    </form>
  );
}
