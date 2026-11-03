import { z } from "zod";
import { getCurrentAuth } from "@/lib/auth/session";
import { Errors, fail, ok } from "@/lib/http";
import { env } from "@/lib/env";
import Groq from "groq-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestBody = z.object({
  imageBase64: z.string().min(1).max(8 * 1024 * 1024).optional(),
  hintText: z.string().trim().min(1).max(2000).optional(),
}).refine((input) => Boolean(input.imageBase64 || input.hintText));

const CATEGORIES = ["PLUMBING", "ELECTRICITY", "CLEANING", "ELEVATOR", "OTHER"] as const;
const ScanResult = z.object({
  category: z.enum(CATEGORIES),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  confidence: z.number().min(0).max(1),
});

// POST /api/ai/scan-defect — распознавание дефекта по фото/описанию через Groq (Vision / Llama-3)
export async function POST(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const json = await req.json().catch(() => null);
  const parsed = RequestBody.safeParse(json);
  if (!parsed.success) {
    return Errors.validation("Передайте изображение или описание проблемы");
  }

  const { imageBase64, hintText } = parsed.data;

  if (!env.GROQ_API_KEY || env.LLM_PROVIDER !== "groq") {
    return fail("AI_NOT_CONFIGURED", "GROQ_API_KEY не настроен", 503);
  }

  try {
    const groq = new Groq({ apiKey: env.GROQ_API_KEY });

    const systemPrompt = `Ты эксперт по коммунально-бытовым проблемам ЖКХ и ОСИ. 
Проанализируй предоставленное фото/описание поломки и верни результат СТРОГО в формате JSON без какого-либо другого текста или тегов markdown.

Формат ответа JSON:
{
  "category": "одна из категорий: PLUMBING, ELECTRICITY, CLEANING, ELEVATOR, OTHER",
  "title": "краткое заглавие дефекта (до 60 символов на русском)",
  "description": "подробный профессиональный анализ дефекта и что нужно сделать (2-3 предложения на русском)",
  "confidence": число от 0 до 1; не завышай уверенность при недостатке данных
}

Категории:
- PLUMBING (трубы, вода, протечки, краны, канализация, отопление, батареи)
- ELECTRICITY (провода, искрение, щиток, розетки, свет, выключатели)
- CLEANING (мусор, грязь в подъезде, замена лампочек, разбитые окна, уборка)
- ELEVATOR (лифт, застревание, двери лифта, шумы)
- OTHER (прочее)`;

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [{ role: "system", content: systemPrompt }];

    if (imageBase64) {
      // Готовим Data URI для Groq Vision (llama-3.2-11b-vision-preview или llama-3.3-70b-versatile)
      const dataUri = imageBase64.startsWith("data:")
          ? imageBase64
          : `data:image/jpeg;base64,${imageBase64}`;

      messages.push({
        role: "user",
        content: [
          { type: "text", text: hintText || "Определи дефект на этом фото и укажи категорию." },
          { type: "image_url", image_url: { url: dataUri } },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: hintText || "Проанализируй поломку и выбери категорию.",
      });
    }

    const completion = await groq.chat.completions.create({
      model: imageBase64 ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile",
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const rawText = completion.choices[0]?.message?.content || "{}";
    return ok(ScanResult.parse(JSON.parse(rawText)));
  } catch {
    // TECH-005: provider errors must not masquerade as a successful diagnosis.
    return fail("AI_ANALYSIS_FAILED", "Не удалось распознать дефект. Выберите категорию вручную или повторите попытку.", 502);
  }
}
