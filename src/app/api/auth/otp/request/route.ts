import { z } from "zod";
import { ok, fail, Errors, clientIp } from "@/lib/http";
import { normalizeKzPhone } from "@/lib/phone";
import { checkOtpRequestAllowed } from "@/lib/auth/rateLimit";
import { requestOtp } from "@/lib/auth/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ phone: z.string().min(1) });

// POST /api/auth/otp/request — отправить OTP на телефон жителя (REQ-001, REQ-091, NFR-054).
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Errors.validation("Укажите номер телефона");

  const phone = normalizeKzPhone(parsed.data.phone);
  if (!phone) return Errors.validation("Некорректный номер телефона");

  const ip = clientIp(req);
  const rate = await checkOtpRequestAllowed(phone, ip);
  if (!rate.allowed) {
    return fail(
      "RATE_LIMITED",
      `Слишком много запросов. Повторите через ${rate.retryAfterSec} с.`,
      429,
    );
  }

  const { devCode } = await requestOtp(phone, ip);
  // devCode присутствует только при SMS_PROVIDER=console (dev/test), иначе не возвращается.
  return ok({ sent: true, ...(devCode ? { devCode } : {}) });
}
