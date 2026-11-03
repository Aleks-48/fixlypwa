import { cookies } from "next/headers";
import { dictionaries, type Language, type DictionaryKey } from "./dictionaries";

export async function getServerLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  const lang = cookieStore.get("fixly_lang")?.value as Language;
  if (lang && (lang === "ru" || lang === "kk" || lang === "en")) {
    return lang;
  }
  return "ru";
}

export async function getTranslation() {
  const language = await getServerLanguage();
  const dict = dictionaries[language] as Record<DictionaryKey, string> | undefined;
  const ruDict = dictionaries.ru as Record<DictionaryKey, string>;

  return {
    language,
    t: (key: DictionaryKey): string => {
      return (dict && dict[key]) || ruDict[key] || key;
    },
  };
}

export function localeForLanguage(language: Language): string {
  const map: Record<Language, string> = { ru: "ru-RU", kk: "kk-KZ", en: "en-US" };
  return map[language];
}
