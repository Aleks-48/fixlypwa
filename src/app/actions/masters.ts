"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { RequestCategory } from "@prisma/client";

// 1. Назначить мастера на заявку (для Председателя)
export async function assignMasterToRequest(requestId: string, masterId: string) {
  await prisma.request.update({
    where: { id: requestId },
    data: { masterId },
  });

  revalidatePath(`/requests/${requestId}`);
}

// 2. Оставить отзыв о работе мастера (для Жителя)
export async function createMasterReview(data: {
  osiId: string;
  requestId: string;
  masterId: string;
  rating: number;
  comment?: string;
  photoUrls?: string[];
}) {
  await prisma.masterReview.create({
    data: {
      osiId: data.osiId,
      requestId: data.requestId,
      masterId: data.masterId,
      rating: data.rating,
      comment: data.comment,
      photoUrls: data.photoUrls || [],
    },
  });

  // Автоматически переводим заявку в статус RESOLVED при отзыве
  await prisma.request.update({
    where: { id: data.requestId },
    data: { status: "RESOLVED" },
  });

  revalidatePath(`/requests/${data.requestId}`);
}

// 3. Создать мастера ОСИ (для реестра председателя)
export async function createOsiMaster(data: {
  osiId: string;
  fullName: string;
  phone: string;
  whatsapp?: string;
  telegram?: string;
  specialties: RequestCategory[];
  experienceYears?: number;
}) {
  const master = await prisma.master.create({
    data: {
      osiId: data.osiId,
      fullName: data.fullName,
      phone: data.phone,
      whatsapp: data.whatsapp,
      telegram: data.telegram,
      specialties: data.specialties,
      experienceYears: data.experienceYears ?? 1,
    },
  });

  revalidatePath("/masters");
  return master;
}