"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation"; // <-- Добавили импорт

export async function createLegalVotingAction(data: {
  buildingId: string;
  title: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  requiredQuorum: number;
}) {
  // 1. Поиск osiId
  const building = await prisma.building.findUnique({
    where: { id: data.buildingId },
    select: { id: true, osiId: true },
  });

  let osiId = building?.osiId;

  if (!osiId) {
    const osi = await prisma.osi.findFirst({
      where: {
  buildings: {
    some: { id: data.buildingId }
  }
},
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

  // 2. Подготовка полей
  const deadline = data.endDate ? new Date(data.endDate) : null;
  const fullQuestion = data.description && data.description !== data.title
    ? `${data.title}\n\n${data.description}`
    : data.title;

  // 3. Создание записи в PostgreSQL
  await prisma.poll.create({
    data: {
      buildingId: data.buildingId,
      osiId: osiId,
      question: fullQuestion,
      deadline: deadline,
    },
  });

  // 4. Сбрасываем кэш конкретного маршрута
  revalidatePath(`/app/buildings/${data.buildingId}/legal-voting`, "page");

  // 5. Перенаправляем пользователя на страницу списка (Next.js заново затребует серверные данные)
  redirect(`/app/buildings/${data.buildingId}/legal-voting`);
}