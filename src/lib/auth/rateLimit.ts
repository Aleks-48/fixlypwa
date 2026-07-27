import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";

// Rate limiting OTP (NFR-054, REQ-091). Считается по durable-журналу OtpChallenge, поэтому
// работает и при нескольких инстансах Next.js (NFR-020), без in-memory состояния.
//  - cooldown  — минимальный интервал между отправками на один номер;
//  - per-phone — не более N кодов на номер в окне (защита от подбора/спама на номер);
//  - per-ip    — не более M кодов с одного IP в окне (защита от SMS-pumping за счёт бюджета).
const WINDOW_MS = 60 * 60 * 1000; // 1 час
// Лимиты конфигурируются через env (OTP_MAX_PER_PHONE_HOUR / OTP_MAX_PER_IP_HOUR):
// прод-дефолты 5/20, в e2e/CI поднимаются (все тестовые запросы — с одного IP).

export type RateResult = { allowed: true } | { allowed: false; retryAfterSec: number };

export async function checkOtpRequestAllowed(
  phone: string,
  ip: string | null,
): Promise<RateResult> {
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_MS);
  const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;

  // Cooldown: последняя отправка на этот номер.
  const last = await prisma.otpChallenge.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (last) {
    const since = now - last.createdAt.getTime();
    if (since < cooldownMs) {
      return { allowed: false, retryAfterSec: Math.ceil((cooldownMs - since) / 1000) };
    }
  }

  const [phoneCount, ipCount] = await Promise.all([
    prisma.otpChallenge.count({ where: { phone, createdAt: { gte: windowStart } } }),
    ip
      ? prisma.otpChallenge.count({
          where: { requestIp: ip, createdAt: { gte: windowStart } },
        })
      : Promise.resolve(0),
  ]);

  if (phoneCount >= env.OTP_MAX_PER_PHONE_HOUR || ipCount >= env.OTP_MAX_PER_IP_HOUR) {
    // Не раскрываем, какой именно лимит сработал; предлагаем подождать до конца окна.
    return { allowed: false, retryAfterSec: Math.ceil(WINDOW_MS / 1000) };
  }

  return { allowed: true };
}
