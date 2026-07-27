import { requestsDict } from "./dictionaries/requests";
// Импортируйте остальные словари по мере создания...

export type Language = "ru" | "kk" | "en";

export const dictionaries = {
  ru: {
    requests: requestsDict.ru,
    // finance: financeDict.ru,
  },
  kk: {
    requests: requestsDict.kk,
    // finance: financeDict.kk,
  },
  en: {
    requests: requestsDict.en,
    // finance: financeDict.en,
  },
} as const;

// Хелпер для получения словаря с автофолбэком на 'ru'
export function getDictionary(lang: string = "ru") {
  const l = (lang as Language) in dictionaries ? (lang as Language) : "ru";
  return dictionaries[l];
}