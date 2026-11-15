import { z } from "zod";
import { getCurrentAuth } from "@/lib/auth/session";
import { Errors, ok } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  text: z.string().trim().min(1).max(2000),
  targetLang: z.enum(["ru", "kk", "en"]).optional(),
});

// Бесплатный публичный API для перевода текстов MyMemory API
export async function POST(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation("Укажите текст для перевода");
  }

  const { text, targetLang } = parsed.data;
  const target = targetLang ?? "ru";
  const langPair = target === "kk" ? "ru|kk" : target === "en" ? "ru|en" : "kk|ru";

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error("Upstream error");
    const data = (await res.json()) as { responseData?: { translatedText?: unknown } } | null;

    const translatedText =
      typeof data?.responseData?.translatedText === "string" &&
      data.responseData.translatedText.length > 0
        ? data.responseData.translatedText
        : text;

    return ok({ translatedText });
  } catch {
    return Errors.validation("Ошибка перевода");
  }
}
