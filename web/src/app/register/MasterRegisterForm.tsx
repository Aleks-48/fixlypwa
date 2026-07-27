"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/apiClient";
import { requestCategoryLabels } from "@/lib/comms/labels";

function ErrorText({ children }: { children: string }) {
  return (
    <p role="alert" data-testid="error" className="m-0 text-sm text-destructive">
      {children}
    </p>
  );
}

type Step = "phone" | "code" | "profile";

// Регистрация мастера — единственная РЕАЛЬНАЯ ветка на /register (marketplace.md §3):
// телефон+OTP (тот же флоу, что у жителя — verifyOtp создаёт User при первом входе) →
// анкета (ФИО/город/категории) → POST /api/master/register (status PENDING) → /master
// покажет «на проверке» (одобрение — вручную, scripts/approve-master.ts, Q-053).
export function MasterRegisterForm() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleCategory(key: string) {
    setCategories((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]));
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await postJson<{ devCode?: string }>("/api/auth/otp/request", { phone });
      setStep("code");
      setDevCode(data?.devCode ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/auth/otp/verify", { phone, code });
      setStep("profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function submitProfile(e: React.FormEvent) {
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
      window.location.assign("/master");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  if (step === "phone") {
    return (
      <form onSubmit={requestCode} className="mt-6 grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="m-phone">Номер телефона</Label>
          <Input
            id="m-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 701 000 00 01"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            data-testid="master-phone-input"
            className="h-12 rounded-xl text-base"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          data-testid="master-request-otp"
          size="lg"
          className="h-12 rounded-xl text-base"
        >
          {loading ? "Отправляем…" : "Получить код"}
        </Button>
        {error && <ErrorText>{error}</ErrorText>}
      </form>
    );
  }

  if (step === "code") {
    return (
      <form onSubmit={verifyCode} className="mt-6 grid gap-4">
        {devCode && (
          <p
            data-testid="master-dev-code"
            className="rounded-xl border border-dashed border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
          >
            Код для входа (dev): <strong className="text-foreground">{devCode}</strong>
          </p>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="m-code">Код из SMS</Label>
          <Input
            id="m-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="______"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
            data-testid="master-code-input"
            className="h-12 rounded-xl text-center text-lg tracking-[0.3em]"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          data-testid="master-verify-otp"
          size="lg"
          className="h-12 rounded-xl text-base"
        >
          {loading ? "Проверяем…" : "Продолжить"}
        </Button>
        {error && <ErrorText>{error}</ErrorText>}
      </form>
    );
  }

  return (
    <form onSubmit={submitProfile} className="mt-6 grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="m-name">ФИО</Label>
        <Input
          id="m-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          data-testid="master-fullname"
          className="h-12 rounded-xl text-base"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="m-city">Город</Label>
        <Input
          id="m-city"
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
        <Label htmlFor="m-bio">О себе (необязательно)</Label>
        <Textarea
          id="m-bio"
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
      {error && <ErrorText>{error}</ErrorText>}
    </form>
  );
}
