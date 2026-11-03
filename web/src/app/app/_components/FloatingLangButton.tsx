"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Check, Loader2, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { Language } from "@/lib/i18n/dictionaries";

const LANGUAGES: { code: Language; label: string; subLabel: string }[] = [
  { code: "ru", label: "Русский", subLabel: "RU" },
  { code: "kk", label: "Қазақша", subLabel: "ҚАЗ" },
  { code: "en", label: "English", subLabel: "EN" },
];

export function FloatingLangButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage, t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSelect = async (code: Language) => {
    if (code === language) {
      setIsOpen(false);
      return;
    }
    setLanguage(code);
    setIsOpen(false);

    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: code }),
      });
    } catch {
      // Игнорируем сетевые ошибки
    }

    startTransition(() => {
      router.refresh();
    });
  };

  const currentLangObj = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]!;

  return (
    <>
      {/* Единая плавающая кнопка языка */}
      {/* Мобильная версия (<lg): слева над таббаром (bottom-20 left-4) */}
      {/* ПК версия (lg+): сдвигаем правее сайдбара (264px + 24px = left-[288px]) */}
      <div className="fixed bottom-20 left-4 z-40 lg:bottom-6 lg:left-[288px]">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full border border-primary/20 bg-card/95 px-3.5 py-2.5 text-xs font-bold text-foreground shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:border-primary active:scale-95 dark:bg-slate-900/90 dark:border-slate-700"
          aria-label="Переключение языка"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Globe className="size-3.5" />}
          </span>
          <span className="uppercase tracking-wider font-extrabold text-primary">{currentLangObj.subLabel}</span>
        </button>
      </div>

      {/* Модальное окно выбора языка */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-5 sm:zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-primary" />
                <h3 className="m-0 text-base font-bold">{t("label_language_modal")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {LANGUAGES.map((item) => {
                const active = item.code === language;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSelect(item.code)}
                    className={`flex items-center justify-between rounded-2xl p-3 text-left transition-all ${
                      active
                        ? "bg-primary text-primary-foreground font-semibold shadow-md"
                        : "bg-secondary/60 text-foreground hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-lg ${
                          active
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.subLabel}
                      </span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    {active && <Check className="size-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FloatingLangButton;
