"use client";

import { useEffect, useState } from "react";

function useHydrated() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

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

export function LoginForm({ mode, redirectTo }: { mode: "code" | "chairman"; redirectTo?: "/app" | "/master" | "/cabinet" }) {
  return mode === "chairman" ? <ChairmanForm /> : <CodeForm redirectTo={redirectTo} />;
}

// Единая форма входа по коду (REQ-005/006, auth-email.md): одно поле «Телефон или email»,
// канал доставки определяет сервер по типу идентификатора. testid-ы сохранены (e2e).
// collectFullName (onboarding-unified.md §0/9) — регистрация вдобавок собирает ФИО и шлёт его
// в otp/verify (REQ-146/147); обычный вход (/login) поле не показывает и не шлёт.
function CodeForm({
  redirectTo = "/cabinet",
  collectFullName = false,
}: {
  redirectTo?: string;
  collectFullName?: boolean;
}) {
  const [step, setStep] = useState<"identifier" | "code" | "telegram-link">("identifier");
  const ready = useHydrated();
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [channel, setChannel] = useState<"phone" | "email" | null>(null);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [telegramBotUsername, setTelegramBotUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Постоянная ссылка на бота (не только реактивно на шаге needsTelegramLink) — NEXT_PUBLIC_*
  // инлайнится сборкой, поэтому читаем process.env напрямую, без похода на сервер.
  const telegramBotLink = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
    ? `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}`
    : null;
  const [loading, setLoading] = useState(false);

  // Вынесено из onSubmit — вызывается и формой (ввод идентификатора), и кнопкой «Получить код»
  // на шаге telegram-link (REQ-009): после привязки бота ретрай не требует заново вводить номер.
  async function submitIdentifier() {
    if (collectFullName && fullName.trim().length < 2) {
      setError("Укажите ФИО");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await postJson("/api/auth/otp/request", { identifier });
      if (data?.needsTelegramLink) {
        setTelegramBotUsername((data?.telegramBotUsername as string | undefined) ?? null);
        setStep("telegram-link");
        return;
      }
      setStep("code");
      setChannel((data?.channel as "phone" | "email" | undefined) ?? null);
      setDevCode((data?.devCode as string | undefined) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  function requestCode(e: React.FormEvent) {
    e.preventDefault();
    void submitIdentifier();
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/auth/otp/verify", {
        identifier,
        code,
        ...(collectFullName ? { fullName: fullName.trim() } : {}),
      });
      window.location.assign(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 grid gap-4">
      {step === "identifier" ? (
        <form method="post" onSubmit={requestCode} className="grid gap-4">
          {collectFullName && (
            <div className="grid gap-1.5">
              <Label htmlFor="fullName">ФИО</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="Иванов Иван Иванович"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
                data-testid="fullname-input"
                className="h-12 rounded-xl text-base"
              />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="identifier">Телефон или email</Label>
            <Input
              id="identifier"
              name="identifier"
              type="text"
              inputMode="email"
              autoComplete="username"
              placeholder="+7 701 000 00 01 или you@mail.kz"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              data-testid="phone-input"
              disabled={!ready}
              className="h-12 rounded-xl text-base"
            />
          </div>
          {telegramBotLink && (
            <p className="m-0 text-xs text-muted-foreground">
              Входите по телефону? Заранее откройте{" "}
              <a
                href={telegramBotLink}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary no-underline"
              >
                Telegram-бота
              </a>{" "}
              и нажмите «Начать» — код придёт мгновенно.
            </p>
          )}
          <Button
            type="submit"
            disabled={loading || !ready}
            data-testid="request-otp"
            size="lg"
            className="h-12 rounded-xl text-base"
          >
            {loading ? "Отправляем…" : "Получить код"}
          </Button>

          <div className="pt-1 text-center">
            <a
              href="/instructions"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <Play size={13} className="fill-primary/20" />
              🎥 Видеоинструкция: как войти и пользоваться сервисом
            </a>
          </div>

          <p className="m-0 text-center text-[11px] text-muted-foreground leading-relaxed">
            Нажимая «Получить код», вы соглашаетесь с{" "}
            <a href="/legal/terms" target="_blank" className="text-primary underline underline-offset-2">
              Условиями оферты
            </a>{" "}
            и даете согласие на{" "}
            <a href="/legal/privacy" target="_blank" className="text-primary underline underline-offset-2">
              обработку персональных данных
            </a>
            .
          </p>
        </form>
      ) : step === "telegram-link" ? (
        <div className="grid gap-4">
          <p className="m-0 text-sm text-muted-foreground">
            Для этого номера код пока приходит через Telegram (REQ-009). Откройте бота,
            нажмите «Начать», затем «Поделиться номером» — и вернитесь сюда за кодом.
          </p>
          {telegramBotUsername && (
            <a
              href={`https://t.me/${telegramBotUsername}`}
              target="_blank"
              rel="noreferrer"
              data-testid="telegram-link"
              className="flex h-12 items-center justify-center rounded-xl bg-primary text-base font-medium text-primary-foreground no-underline"
            >
              Открыть Telegram-бота
            </a>
          )}
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={loading || !ready}
            data-testid="telegram-retry"
            className="h-12 rounded-xl text-base"
            onClick={() => void submitIdentifier()}
          >
            {loading ? "Проверяем…" : "Я привязал(а) номер — получить код"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-12 rounded-xl text-base"
            onClick={() => {
              setStep("identifier");
              setError(null);
            }}
          >
            Изменить телефон / email
          </Button>
        </div>
      ) : (
        <form method="post" onSubmit={verifyCode} className="grid gap-4">
          {devCode && (
            <p
              data-testid="dev-code"
              className="rounded-xl border border-dashed border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
            >
              Код для тестового входа: <strong className="text-foreground">{devCode}</strong>
              <span className="mt-1 block">Введите этот код ниже. Ждать SMS или Telegram не нужно.</span>
            </p>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="code">
              {devCode ? "Код, показанный выше" : channel === "email" ? "Код из письма" : "Код из SMS/Telegram"}
            </Label>
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
              disabled={!ready}
              className="h-12 rounded-xl text-center text-lg tracking-[0.3em]"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !ready}
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
              setStep("identifier");
              setCode("");
              setError(null);
            }}
          >
            Изменить телефон / email
          </Button>
        </form>
      )}

      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

// Регистрация (REQ-007): тот же код-флоу, но с редиректом в сценарий роли (auth-email.md §3)
// и полем ФИО (onboarding-unified.md §0/9, REQ-146/147) — то, чего ждёт «Вход», регистрация
// собирает дополнительно.
export function RegisterCodeForm({ role }: { role: "resident" | "chairman" }) {
  return (
    <CodeForm
      redirectTo={role === "chairman" ? "/app" : "/app?welcome=resident"}
      collectFullName
    />
  );
}

function ChairmanForm() {
  const ready = useHydrated();
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
    <form method="post" onSubmit={submit} className="mt-6 grid gap-4">
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
          disabled={!ready}
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
          disabled={!ready}
          className="h-12 rounded-xl text-base"
        />
      </div>
      <Button
        type="submit"
        disabled={loading || !ready}
        data-testid="login-submit"
        size="lg"
        className="h-12 rounded-xl text-base"
      >
        {loading ? "Входим…" : "Войти"}
      </Button>

      <p className="m-0 text-center text-[11px] text-muted-foreground leading-relaxed">
        Входя в систему, вы принимаете{" "}
        <a href="/legal/oferta-osi" target="_blank" className="text-primary underline underline-offset-2">
          Оферту для Председателей
        </a>{" "}
        и{" "}
        <a href="/legal/privacy" target="_blank" className="text-primary underline underline-offset-2">
          Политику конфиденциальности
        </a>
        .
      </p>
      {error && <ErrorText>{error}</ErrorText>}
    </form>
  );
}
