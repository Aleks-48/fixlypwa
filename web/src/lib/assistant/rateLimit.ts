import { forTenant } from "@/lib/db/tenant";
import { env } from "@/lib/env";

// Лимиты сообщений ассистента (REQ-160) — durable-счётчик по AssistantMessage (не in-memory,
// работает при нескольких инстансах Next.js, тот же принцип, что checkOtpRequestAllowed).
// AssistantMessage — tenant-таблица под RLS, поэтому счёт ОБЯЗАТЕЛЬНО через forTenant, не
// напрямую через глобальный prisma-клиент (иначе RLS вернёт 0 строк, deny-by-default).

export type AssistantRateResult = { allowed: true } | { allowed: false; reason: "user" | "osi" };

export async function checkAssistantMessageAllowed(
  osiId: string,
  userId: string,
): Promise<AssistantRateResult> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);

  return forTenant(osiId, async (tx) => {
    const [userCount, osiCount] = await Promise.all([
      tx.assistantMessage.count({
        where: { role: "USER", createdAt: { gte: since }, conversation: { userId } },
      }),
      tx.assistantMessage.count({ where: { role: "USER", createdAt: { gte: since } } }),
    ]);
    if (userCount >= env.ASSISTANT_MAX_MESSAGES_PER_DAY_USER)
      return { allowed: false, reason: "user" };
    if (osiCount >= env.ASSISTANT_MAX_MESSAGES_PER_DAY_OSI)
      return { allowed: false, reason: "osi" };
    return { allowed: true };
  });
}
