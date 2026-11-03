"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { Language } from "@/lib/i18n/dictionaries";

const NEXT_LANG: Record<Language, Language> = {
  ru: "kk",
  kk: "en",
  en: "ru",
};

const LANG_LABELS: Record<Language, string> = {
  ru: "RU",
  kk: "ҚАЗ",
  en: "EN",
};

export function LanguageToggle() {
  const router = useRouter();
  const { language, setLanguage } = useTranslation();
  const [isPending, startTransition] = useTransition();

  const toggleLanguage = async () => {
    const nextLang = NEXT_LANG[language] || "ru";
    setLanguage(nextLang);

    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: nextLang }),
      });
    } catch {
      // Игнорируем сетевые ошибки сохранения в БД
    }

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      disabled={isPending}
      aria-label="Change language"
      title="Switch language (RU / ҚАЗ / EN)"
      className="h-9 px-2.5 rounded-full font-bold text-xs uppercase flex items-center gap-1.5 transition-all hover:border-primary/50"
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Globe className="size-3.5 text-primary" />
      )}
      <span>{LANG_LABELS[language] ?? "RU"}</span>
    </Button>
  );
}