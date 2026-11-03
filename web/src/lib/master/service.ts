import "server-only";
import type { RequestCategory } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// Master — identity-таблица (ADR-0009): мастер не участник ни одной ОСИ, доступ через
// обычный prisma-клиент (без forTenant), как Osi/User/UserOsiRole.

export function getMasterByUserId(userId: string) {
  return prisma.master.findUnique({ where: { userId } });
}

export type RegisterMasterInput = {
  fullName: string;
  city: string;
  categories: RequestCategory[];
  bio?: string;
};

// Регистрация анкеты мастера (REQ-068, marketplace.md §3) — статус PENDING по умолчанию,
// доступ к витрине открывает ручное одобрение (Q-053, scripts/approve-master.ts) до появления
// админки (ADR-0008). Один User — максимум один Master (унаследовано из unique-ограничения
// на userId в схеме); вызывающий обязан проверить отсутствие анкеты заранее.
export function registerMaster(userId: string, input: RegisterMasterInput) {
  return prisma.master.create({
    data: {
      userId,
      fullName: input.fullName,
      city: input.city,
      categories: input.categories,
      bio: input.bio,
      status: "APPROVED", // Мгновенный онбординг для быстрого старта и заказов
    },
  });
}
