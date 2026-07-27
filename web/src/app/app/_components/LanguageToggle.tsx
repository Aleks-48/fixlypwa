"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const NEXT_LANG: Record<string, string> = {
  ru: "kk",
  kk: "en",
  en: "ru",
};

const LANG_LABELS: Record<string, string> = {
  ru: "RU",
  kk: "ҚАЗ",
  en: "EN",
};

export function LanguageToggle({ currentLang = "ru" }: { currentLang?: string }) {
  const router = useRouter();
  const [lang, setLang] = useState(currentLang);
  const [isPending, startTransition] = useTransition();

  const toggleLanguage = async () => {
    const nextLang = NEXT_LANG[lang] || "ru";
    setLang(nextLang);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: nextLang }),
      });

      if (!res.ok) throw new Error("Ошибка смены языка");

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setLang(lang);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      disabled={isPending}
      aria-label="Change language"
      title="Switch language"
      className="h-9 px-2.5 rounded-full font-bold text-xs uppercase flex items-center gap-1.5 transition-colors"
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Globe className="size-3.5 text-muted-foreground" />
      )}
      <span>{LANG_LABELS[lang] ?? "RU"}</span>
    </Button>
  );
}