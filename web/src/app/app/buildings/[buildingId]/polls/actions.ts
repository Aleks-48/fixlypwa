"use server";

import { activeChairmanOsi } from "@/lib/auth/guards";
import { getCurrentAuth } from "@/lib/auth/session";
import { createPoll } from "@/lib/polls/service";
import { revalidatePath } from "next/cache";

export async function createPollAction(buildingId: string, formData: FormData) {
  const auth = await getCurrentAuth();
  if (!auth) return { success: false, error: "Необходима авторизация" };

  const osiId = activeChairmanOsi(auth);
  if (!osiId) return { success: false, error: "Нет прав для создания опроса" };

  const questionText = (formData.get("title") || formData.get("question")) as string;
  const rawOptions = formData.getAll("options") as string[];
  const options = rawOptions.map((o) => o.trim()).filter(Boolean);

  if (!questionText) return { success: false, error: "Задайте вопрос опроса" };
  if (options.length < 2) return { success: false, error: "Укажите хотя бы 2 варианта ответа" };

  try {
    // 1-й аргумент: osiId
    // 2-й аргумент: объект input с полем question (не title!)
    await createPoll(osiId, {
      buildingId,
      question: questionText,
      options,
    });

    revalidatePath(`/app/buildings/${buildingId}/polls`, "page");
    return { success: true };
  } catch (caughtError) {
const error = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

    console.error("Ошибка при создании опроса:", error);
    return { success: false, error: error?.message || "Не удалось сохранить опрос" };
  }
}