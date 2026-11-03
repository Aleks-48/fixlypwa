"use server";

import { chairmanContext } from "@/lib/auth/context";
import { forTenant } from "@/lib/db/tenant";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const _createPollSchema = z.object({
  question: z.string().min(1, "Введите вопрос"),
  options: z.array(z.string().min(1, "Заполните вариант")).min(2, "Минимум 2 варианта"),
  buildingId: z.string().optional(),
  endDate: z.string().optional(),
});

export async function deleteLegalVotingAction(pollId: string, buildingId: string) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return { success: false, error: "Недостаточно прав" };

  try {
    await forTenant(ctx.osiId, async (tx) => {
      await tx.poll.delete({ where: { id: pollId } });
    });
    revalidatePath(`/app/buildings/${buildingId}/legal-voting`);
    return { success: true };
  } catch (caughtError) {
const err = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

    return { success: false, error: err?.message ?? "Ошибка удаления" };
  }
}