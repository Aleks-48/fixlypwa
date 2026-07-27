"use server";

import { getSession } from "@/lib/auth"; // Укажите ваш путь к получению текущей сессии/пользователя
import { createPoll, listPolls, vote, AuthMethod, NewPoll } from "@/lib/polls/service";
import { revalidatePath } from "next/cache";

/**
 * Получить список всех голосований дома
 */
export async function getPollsAction(buildingId: string) {
  const session = await getSession();
  if (!session || !session.activeOsiId) throw new Error("Unauthorized");

  return listPolls(session.activeOsiId, buildingId, session.userId);
}

/**
 * Проголосовать за выбранный вариант
 */
export async function voteAction(optionId: string, authMethod: AuthMethod = "SMS_OTP") {
  const session = await getSession();
  if (!session || !session.activeOsiId) throw new Error("Unauthorized");

  const result = await vote(session.activeOsiId, optionId, session.userId, authMethod);
  revalidatePath("/polls");
  return result;
}

/**
 * Создать новый опрос
 */
export async function createPollAction(input: NewPoll) {
  const session = await getSession();
  if (!session || !session.activeOsiId) throw new Error("Unauthorized");

  const poll = await createPoll(session.activeOsiId, input);
  revalidatePath("/polls");
  return poll;
}