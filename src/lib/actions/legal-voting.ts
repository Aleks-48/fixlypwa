"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Создание голосования
export async function createLegalVotingAction(data: {
  buildingId: string;
  title: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  requiredQuorum: number;
}) {
  const building = await prisma.building.findUnique({
    where: { id: data.buildingId },
    select: { id: true, osiId: true },
  });

  let osiId = building?.osiId;

  if (!osiId) {
    const osi = await prisma.osi.findFirst({
      where: { buildingId: data.buildingId },
      select: { id: true },
    });
    osiId = osi?.id;
  }

  if (!osiId) {
    const defaultOsi = await prisma.osi.findFirst();
    osiId = defaultOsi?.id;
  }

  if (!osiId) {
    throw new Error("Не найден ID зарегистрированного ОСИ для этого дома.");
  }

  const deadline = data.endDate ? new Date(data.endDate) : null;
  const fullQuestion =
    data.description && data.description !== data.title
      ? `${data.title}\n\n${data.description}`
      : data.title;

  await prisma.poll.create({
    data: {
      buildingId: data.buildingId,
      osiId: osiId,
      question: fullQuestion,
      deadline: deadline,
    },
  });

  revalidatePath(`/app/buildings/${data.buildingId}/legal-voting`, "page");
  redirect(`/app/buildings/${data.buildingId}/legal-voting`);
}

// Удаление голосования
export async function deleteLegalVotingAction(pollId: string, buildingId: string) {
  try {
    await prisma.poll.delete({
      where: { id: pollId },
    });

    revalidatePath(`/app/buildings/${buildingId}/legal-voting`, "page");
    return { success: true };
  } catch (error) {
    console.error("Ошибка при удалении голосования:", error);
    throw new Error("Не удалось удалить голосование из базы данных.");
  }
}