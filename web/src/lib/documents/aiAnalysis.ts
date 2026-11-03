import "server-only";
import { getLlmProvider } from "@/lib/assistant/providers";
import { listDocuments } from "./service";
import { forTenant } from "@/lib/db/tenant";
import { z } from "zod";


export type DocumentAnalysisResult = {
  summary: string;
  legalCheck: string;
  risksAndGaps: string[];
  recommendations: string[];
};
const DocumentAnalysis = z.object({
  summary: z.string(),
  legalCheck: z.string(),
  risksAndGaps: z.array(z.string()),
  recommendations: z.array(z.string()),
});

/**
 * Провести экспресс-анализ одного документа председателя с помощью Groq AI
 */
export async function analyzeDocumentWithAi(
  osiId: string,
  documentId: string,
): Promise<DocumentAnalysisResult> {
  const doc = await forTenant(osiId, (tx) => tx.document.findUnique({
    where: { id: documentId },
    include: {
      poll: {
        include: {
          options: {
            include: {
              _count: { select: { votes: true } },
            },
          },
        },
      },
    },
  }));

  if (!doc) throw new Error("Документ не найден");

  let documentContext = `Документ: "${doc.title}"
Категория: ${doc.category}
Описание: ${doc.description ?? "Без описания"}
Дата создания: ${doc.createdAt.toLocaleDateString("ru-RU")}
Файл: ${doc.fileUrl}`;

  if (doc.poll) {
    const totalVotes = doc.poll.options.reduce((acc, o) => acc + o._count.votes, 0);
    const optionsSummary = doc.poll.options
      .map((o) => `- ${o.label}: ${o._count.votes} голосов`)
      .join("\n");
    documentContext += `\n\nСвязанное голосование: "${doc.poll.question}"
Всего голосов: ${totalVotes}
Результаты:
${optionsSummary}`;
  }

  const systemPrompt = `Ты — AI-юрист и эксперт по ЖКХ в Казахстане (Закон РК "О жилищных отношениях" № 211-VI).
Твоя задача — проанализировать метаданные документа ОСИ/КСП для Председателя дома и предоставить структурированный JSON-ответ.
Содержимое файла не предоставлено. Не утверждай, что проверены подписи, юридическая сила или соответствие закону. Укажи это ограничение в legalCheck.

Верни строго JSON со следующей структурой (БЕЗ markdown блоков code, только сырой JSON):
{
  "summary": "Краткая суть документа в 2-3 предложениях",
  "legalCheck": "Оценка соответствия нормам Закона РК О жилищных отношениях (кворум, оформление, сроки)",
  "risksAndGaps": ["Риск 1 или замечание", "Риск 2"],
  "recommendations": ["Рекомендация Председателю 1", "Рекомендация 2"]
}`;

  const provider = getLlmProvider();
  let fullText = "";

  for await (const delta of provider.chat({
    systemPrompt,
    messages: [{ role: "user", content: `Проанализируй документ:\n${documentContext}` }],
    tools: [],
  })) {
    if (delta.type === "text") {
      fullText += delta.text;
    }
  }

  try {
    const cleanJson = fullText.replace(/```json/g, "").replace(/```/g, "").trim();
    return DocumentAnalysis.parse(JSON.parse(cleanJson));
  } catch {
    return {
      summary: "Не удалось получить структурированный результат анализа.",
      legalCheck: "Соответствие документа законодательству не установлено.",
      risksAndGaps: ["Ответ модели не прошёл проверку формата."],
      recommendations: ["Повторите анализ или передайте документ специалисту для проверки."],
    };
  }
}

/**
 * Глобальный AI-аудит библиотеки документов дома для Председателя
 */
export async function analyzeHouseDocumentationAi(
  osiId: string,
  buildingId: string,
): Promise<{
  overview: string;
  categoryStats: Record<string, number>;
  keyRecommendations: string[];
}> {
  const docs = await listDocuments(osiId, buildingId);

  const categoryStats: Record<string, number> = {};
  docs.forEach((d) => {
    categoryStats[d.category] = (categoryStats[d.category] || 0) + 1;
  });

  const docsSummary = docs
    .map(
      (d) =>
        `- [${d.category}] ${d.title} (Дата: ${d.createdAt.toLocaleDateString("ru-RU")}, Публичный: ${d.isPublic ? "Да" : "Нет"})`,
    )
    .join("\n");

  const systemPrompt = `Ты — ведущий AI-аудитор ОСИ/КСП Казахстана.
Проведи комплексную проверку полноты пакета документов дома.
Верни строго JSON (БЕЗ markdown блоков code):
{
  "overview": "Общий вывод о состоянии документации дома",
  "keyRecommendations": ["Чего не хватает в документах", "Что нужно утвердить на следующем собрании"]
}`;

  const provider = getLlmProvider();
  let fullText = "";

  for await (const delta of provider.chat({
    systemPrompt,
    messages: [
      {
        role: "user",
        content: `Список документов дома (${docs.length} шт):\n${docsSummary}`,
      },
    ],
    tools: [],
  })) {
    if (delta.type === "text") {
      fullText += delta.text;
    }
  }

  try {
    const cleanJson = fullText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    return {
      overview: parsed.overview,
      categoryStats,
      keyRecommendations: parsed.keyRecommendations || [],
    };
  } catch {
    return {
      overview: `В доме зарегистрировано ${docs.length} документов. Базовый пакет сформирован.`,
      categoryStats,
      keyRecommendations: [
        "Проверьте актуальность финансового отчета за прошедший месяц.",
        "Загрузите протокол последнего собрания собственников.",
      ],
    };
  }
}

