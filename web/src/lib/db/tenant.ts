import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Ядро мультитенант-паттерна (ADR-0006, подтверждён спайком spikes/rls-prisma/src/tenant.ts).
 *
 * ЕДИНСТВЕННЫЙ санкционированный способ доступа к tenant-таблицам. Каждый доступ
 * оборачивается в ОДНУ интерактивную транзакцию, в начале которой ставится
 * `app.current_osi_id` через set_config(..., is_local=true) == `SET LOCAL`.
 *
 * Почему транзакция обязательна (ADR-0006, риск №2/№3):
 *  - `SET LOCAL` живёт только внутри транзакции и гарантированно попадает в то же
 *    соединение, что и последующие запросы;
 *  - при PgBouncer transaction pooling контекст сбрасывается на COMMIT и не «протекает»
 *    между клиентами/тенантами.
 *
 * Без обёртки контекст не установлен → RLS сравнивает osi_id с NULL → 0 строк
 * (DENY BY DEFAULT), а не «все строки».
 *
 * ⚠️ Никогда не прокидывай osiId в обход сессии и не хардкодь его (guardrails §8).
 * osiId должен приходить из session.activeOsiId после проверки прав пользователя.
 */
export async function forTenant<T>(
  osiId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!osiId || typeof osiId !== "string") {
    // Пустой контекст == deny-by-default. Падаем явно, чтобы не выполнить запрос,
    // который «молча» ничего не вернёт и замаскирует баг авторизации.
    throw new Error("forTenant: osiId is required (deny-by-default)");
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_osi_id', ${osiId}, true)`;
      return fn(tx);
    },
    // Дефолтный maxWait=2s мал под параллельной нагрузкой (много одновременных
    // интерактивных транзакций → очередь на пул соединений): ждём до 10s, сама
    // транзакция — до 15s.
    { maxWait: 10_000, timeout: 15_000 },
  );
}
