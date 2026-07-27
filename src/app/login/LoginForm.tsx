"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as
    | { data?: unknown; error?: { message?: string } }
    | null;
  if (!res.ok) {
    throw new Error(json?.error?.message ?? "Что-то пошло не так");
  }
  return json?.data as Record<string, unknown>;
}

function ErrorText({ children }: { children: string }) {
  return (
    <p role="alert" data-testid="error" className="m-0 text-sm text-destructive">
      {children}
    </p>
  );
}

export function LoginForm({ mode }: { mode: "resident" | "chairman" }) {
  return mode === "chairman" ? <ChairmanForm /> : <ResidentForm />;
}

function ResidentForm() {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await postJson("/api/auth/otp/request", { phone });
      setStep("code");
      setDevCode((data?.devCode as string | undefined) ?? null);
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
      window.location.assign("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 grid gap-4">
      {step === "phone" ? (
        <form onSubmit={requestCode} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="phone">Номер телефона</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 701 000 00 01"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              data-testid="phone-input"
              className="h-12 rounded-xl text-base"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            data-testid="request-otp"
            size="lg"
            className="h-12 rounded-xl text-base"
          >
            {loading ? "Отправляем…" : "Получить код"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="grid gap-4">
          {devCode && (
            <p
              data-testid="dev-code"
              className="rounded-xl border border-dashed border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
            >
              Код для входа (dev): <strong className="text-foreground">{devCode}</strong>
            </p>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="code">Код из SMS</Label>
            <Input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="______"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
              data-testid="code-input"
              className="h-12 rounded-xl text-center text-lg tracking-[0.3em]"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            data-testid="verify-otp"
            size="lg"
            className="h-12 rounded-xl text-base"
          >
            {loading ? "Проверяем…" : "Войти"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 rounded-xl text-base"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError(null);
            }}
          >
            Изменить номер
          </Button>
        </form>
      )}

      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

function ChairmanForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/auth/login", { email, password });
      window.location.assign("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          data-testid="email-input"
          className="h-12 rounded-xl text-base"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          data-testid="password-input"
          className="h-12 rounded-xl text-base"
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        data-testid="login-submit"
        size="lg"
        className="h-12 rounded-xl text-base"
      >
        {loading ? "Входим…" : "Войти"}
      </Button>
      {error && <ErrorText>{error}</ErrorText>}
    </form>
  );
}
