import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Контекст доступа мастера к маркетплейсу (ADR-0009) — по образцу forTenant() (tenant.ts),
 * но ставит ДВА параметра сессии вместо одного: масштаб «свой отклик» (masterId) и «свой
 * город» (city). RLS-политики market_listing/market_offer читают их наравне с
 * app.current_osi_id из forTenant — контексты независимы и не пересекаются (см. миграцию
 * 20260705073011_marketplace_masters).
 *
 * Вызывающий обязан проверить status === 'APPROVED' у Master ДО вызова (Master — identity-
 * таблица вне RLS, читается обычным prisma-запросом) — так же, как activeChairmanOsi()
 * проверяет роль до forTenant() (guardrails §8: не хардкодить/не обходить проверку прав).
 */
export async function forMaster<T>(
  masterId: string,
  city: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!masterId || typeof masterId !== "string" || !city || typeof city !== "string") {
    // Пустой контекст == deny-by-default (см. forTenant).
    throw new Error("forMaster: masterId and city are required (deny-by-default)");
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_master_id', ${masterId}, true)`;
      await tx.$queryRaw`SELECT set_config('app.current_master_city', ${city}, true)`;
      return fn(tx);
    },
    { maxWait: 10_000, timeout: 15_000 },
  );
}
