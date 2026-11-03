import { getCurrentAuth } from "@/lib/auth/session";
import { Errors,ok } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Бесплатный публичный API для перевода текстов MyMemory API
export async function POST(req: Request) {
  try {
    const auth = await getCurrentAuth();
    if (!auth) return Errors.unauthorized();

    const body = await req.json().catch(() => ({}));
    const { text, targetLang } = body; // targetLang: 'kk', 'ru', 'en'

    if (!text || typeof text !== "string" || !text.trim()) {
      return Errors.validation("Укажите текст для перевода");
    }

    const target = (targetLang || "ru").toLowerCase();
    const langPair = target === "kk" ? "ru|kk" : target === "en" ? "ru|en" : "kk|ru";

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=${langPair}`;
    const res = await fetch(url);
    const data = await res.json();

    const translatedText = data?.responseData?.translatedText || text;

    return ok({ translatedText });
  } catch (caughtError) {
const err = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

    return Errors.validation(err?.message || "Ошибка перевода");
  }
}
