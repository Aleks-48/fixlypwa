"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, Home, Info, ShieldCheck, Wrench } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/app/app/_components/ThemeToggle";
import { RegisterCodeForm } from "@/app/login/LoginForm";
import { MasterRegisterForm } from "./MasterRegisterForm";

import { LanguageToggle } from "@/app/app/_components/LanguageToggle";

type RoleCard = "resident" | "chairman" | "master";

// Регистрация (REQ-007, auth-email.md §3). Все три карточки реальные: житель/председатель —
// единый код-флоу (телефон или email, RegisterCodeForm), различие только в онбординге после
// входа (председатель → создание ОСИ, житель → инструкция о привязке). Мастер — телефон+OTP+
// анкета (MasterRegisterForm).
export function RegisterView({ initialRole }: { initialRole: RoleCard }) {
  const [roleCard, setRoleCard] = useState<RoleCard>(initialRole);

  return (
    <main className="relative flex min-h-dvh">
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <section className="hidden w-[40%] flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3.5">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15">
            <Building2 aria-hidden size={24} />
          </span>
          <span className="text-xl font-bold">Дом</span>
        </div>
        <div>
          <h2 className="m-0 max-w-sm text-3xl font-extrabold leading-tight tracking-tight">
            {roleCard === "master" ? "Принимайте заказы рядом с домом" : "Присоединяйтесь к своему дому"}
          </h2>
          <p className="mt-4 max-w-sm text-[17px] leading-relaxed opacity-85">
            {roleCard === "master"
              ? "Жители публикуют заявки на ремонт — откликайтесь и договаривайтесь напрямую."
              : "Подключение занимает пару минут. Привяжите квартиру — и всё готово."}
          </p>
        </div>
        <ul className="m-0 grid list-none gap-3.5 p-0 text-[15px]">
          {(roleCard === "master"
            ? ["Телефон и код из SMS", "Город и категории работ", "Анкета на проверке"]
            : roleCard === "chairman"
              ? ["Телефон или email", "Код подтверждения", "Создание ОСИ и дома"]
              : ["Телефон или email", "Код подтверждения", "Привязка к квартире"]
          ).map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-white/20 text-[13px] font-bold">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <h1 className="m-0 text-2xl font-extrabold tracking-tight lg:text-3xl">
            Создание аккаунта
          </h1>
          <p className="mb-6 mt-1.5 text-[15px] text-muted-foreground">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="font-semibold text-primary no-underline">
              Войти
            </Link>
          </p>

          <Label className="mb-2.5 block">Я регистрируюсь как</Label>
          <div className="mb-6 grid grid-cols-3 gap-2.5">
            {(
              [
                { key: "resident", label: "Житель", hint: "Квартира в доме", icon: Home },
                { key: "chairman", label: "Председатель", hint: "Администратор ОСИ", icon: ShieldCheck },
                { key: "master", label: "Мастер", hint: "Принимаю заказы", icon: Wrench },
              ] as const
            ).map(({ key, label, hint, icon: Icon }) => {
              const active = roleCard === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRoleCard(key)}
                  aria-pressed={active}
                  data-testid={`register-role-${key}`}
                  className={`rounded-2xl border-2 p-3.5 text-left transition-colors ${
                    active ? "border-primary bg-accent" : "border-border bg-card"
                  }`}
                >
                  <span className="mb-2 flex items-center justify-between">
                    <span
                      className={`flex size-9 items-center justify-center rounded-xl ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Icon aria-hidden size={17} />
                    </span>
                    {active && <CheckCircle2 aria-hidden size={17} className="text-primary" />}
                  </span>
                  <span className="block break-words text-sm font-bold">{label}</span>
                  <span className="block break-words text-xs text-muted-foreground">{hint}</span>
                </button>
              );
            })}
          </div>

          {roleCard === "master" ? (
            <MasterRegisterForm />
          ) : (
            <>
              <RegisterCodeForm role={roleCard} />
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-border bg-secondary px-4 py-3.5 text-sm text-muted-foreground">
                <Info aria-hidden size={17} className="mt-0.5 shrink-0" />
                <p className="m-0">
                  {roleCard === "chairman"
                    ? "После входа создайте свою ОСИ — вы станете её председателем и сможете завести дом, квартиры и жителей."
                    : "После входа сообщите председателю ваш телефон или email — он привяжет вас к квартире, и появятся начисления и объявления дома."}
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
