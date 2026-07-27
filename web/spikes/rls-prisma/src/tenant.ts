import { Prisma, PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

/**
 * Ядро паттерна из ADR-0006 (риск №2 + №3).
 *
 * Каждый доступ к tenant-таблицам оборачивается в ОДНУ интерактивную транзакцию,
 * в начале которой ставится `app.current_osi_id` через set_config(..., is_local=true).
 * is_local=true == `SET LOCAL` — контекст живёт только внутри транзакции и гарантированно
 * попадает в то же соединение, что и последующие запросы (важно и для PgBouncer transaction
 * pooling: контекст не «протекает» между клиентами, т.к. сбрасывается на COMMIT).
 *
 * Без обёртки → контекст не установлен → RLS отдаёт 0 строк (DENY BY DEFAULT).
 */
export async function forTenant<T>(
  osiId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.current_osi_id', ${osiId}, true)`;
    return fn(tx);
  });
}
