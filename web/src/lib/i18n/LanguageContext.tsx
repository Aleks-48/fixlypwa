"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { dictionaries, type Language, type DictionaryKey } from "./dictionaries";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: DictionaryKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "ru",
  setLanguage: () => {},
  t: (key: DictionaryKey) => dictionaries.ru[key] || key,
});

function persistLanguage(lang: Language) {
  localStorage.setItem("fixly_lang", lang);
  document.cookie = `fixly_lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
}

export function LanguageProvider({
  children,
  initialLanguage = "ru",
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  // Синхронизируем с cookie после router.refresh() — без чтения localStorage на mount,
  // иначе SSR (cookie) и клиент (localStorage) расходятся → hydration error.
  useEffect(() => {
    setLanguageState(initialLanguage);
    localStorage.setItem("fixly_lang", initialLanguage);
  }, [initialLanguage]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    persistLanguage(lang);
  };

  const t = (key: DictionaryKey): string => {
    const dict = dictionaries[language] as Record<DictionaryKey, string> | undefined;
    const ruDict = dictionaries.ru as Record<DictionaryKey, string>;
    return (dict && dict[key]) || ruDict[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
