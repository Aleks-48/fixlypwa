import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CheckCircle2 } from "lucide-react";
import { getCurrentAuth } from "@/lib/auth/session";
import { aituConfigured } from "@/lib/gov/aitu";
import { ThemeToggle } from "@/app/app/_components/ThemeToggle";
import { LoginForm } from "./LoginForm";

const BULLETS = [
  "Объявления с отметками о прочтении",
  "Заявки с фото и статусами",
  "Финансы и отчёты — прозрачно",
];

// Вход (REQ-001/005, auth-email.md). Дефолт — единая форма кода (телефон или email);
// ?role=chairman → форма email+пароль (пароль сохраняется для председателей).
// Макет: сплит-экран (синяя брендпанель на lg+) — auth-флоу прежний, только UI.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  // Уже вошедших уводим в кабинет.
  if (await getCurrentAuth()) redirect("/app");

  const { role } = await searchParams;
  const mode = role === "chairman" ? "chairman" : "code";

  return (
    <main className="relative flex min-h-dvh">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      {/* Брендпанель (desktop) */}
      <section className="hidden w-[46%] flex-col justify-between bg-primary p-14 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3.5">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15">
            <Building2 aria-hidden size={24} />
          </span>
          <span className="text-xl font-bold">Дом</span>
        </div>
        <div>
          <h2 className="m-0 max-w-md text-4xl font-extrabold leading-tight tracking-tight">
            Ваш дом под управлением — в одном приложении
          </h2>
          <p className="mt-5 max-w-sm text-lg leading-relaxed opacity-85">
            Объявления, заявки на ремонт и прозрачные финансы ОСИ. Для председателя и для жителя.
          </p>
        </div>
        <ul className="m-0 grid list-none gap-4 p-0">
          {BULLETS.map((b) => (
            <li key={b} className="flex items-center gap-3 text-[15px]">
              <CheckCircle2 aria-hidden size={20} className="shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      </section>

      {/* Форма */}
      <section className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <span className="mb-7 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground lg:hidden">
            <Building2 aria-hidden size={28} />
          </span>
          <h1 className="m-0 text-2xl font-extrabold tracking-tight lg:text-3xl">
            {mode === "chairman" ? "Вход по паролю" : "Вход"}
          </h1>
          <p className="mb-0 mt-1.5 text-[15px] text-muted-foreground">
            {mode === "chairman"
              ? "Email и пароль, выданные при подключении ОСИ."
              : "Введите телефон или email — пришлём код для входа."}
          </p>

          <LoginForm mode={mode} />

          {mode === "code" && aituConfigured() && (
            <a
              href="/api/auth/aitu/start"
              data-testid="aitu-login"
              className="mt-4 block rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-semibold text-foreground no-underline transition-colors hover:bg-muted"
            >
              Войти через Aitu (Digital ID)
            </a>
          )}

          <div className="mt-7 grid gap-2 text-center text-[15px] text-muted-foreground">
            {mode === "chairman" ? (
              <p className="m-0">
                <Link href="/login" className="font-semibold text-primary no-underline">
                  Вход по коду (телефон или email)
                </Link>
              </p>
            ) : (
              <p className="m-0">
                Есть пароль?{" "}
                <Link
                  href="/login?role=chairman"
                  className="font-semibold text-primary no-underline"
                >
                  Вход по паролю
                </Link>
              </p>
            )}
            <p className="m-0">
              Нет аккаунта?{" "}
              <Link href="/register" className="font-semibold text-primary no-underline">
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
