"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/apiClient";
import { requestCategoryLabels } from "@/lib/comms/labels";

// Анкета мастера, заполняемая ПОСЛЕ входа (случай: пользователь уже вошёл жителем/по OTP
// и открыл /master напрямую, минуя MasterRegisterForm на /register). Тот же API, что и там.
export function MasterOnboardingForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleCategory(key: string) {
    setCategories((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (categories.length === 0) {
      setError("Выберите хотя бы одну категорию работ");
      return;
    }
    setLoading(true);
    try {
      await postJson("/api/master/register", {
        fullName,
        city,
        categories,
        bio: bio || undefined,
      });
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
        <Label htmlFor="mo-name">ФИО</Label>
        <Input
          id="mo-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          data-testid="master-fullname"
          className="h-12 rounded-xl text-base"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="mo-city">Город</Label>
        <Input
          id="mo-city"
          placeholder="Кокшетау"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
          data-testid="master-city"
          className="h-12 rounded-xl text-base"
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Категории работ</Label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(requestCategoryLabels).map(([value, text]) => {
            const active = categories.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleCategory(value)}
                aria-pressed={active}
                data-testid={`master-cat-${value}`}
                className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {text}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="mo-bio">О себе (необязательно)</Label>
        <Textarea
          id="mo-bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          data-testid="master-bio"
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        data-testid="master-submit-profile"
        size="lg"
        className="h-12 rounded-xl text-base"
      >
        {loading ? "Отправляем…" : "Подать анкету"}
      </Button>
      {error && (
        <p role="alert" data-testid="error" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
