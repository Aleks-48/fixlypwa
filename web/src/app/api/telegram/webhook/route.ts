import { env } from "@/lib/env";
import { ok, Errors, fail } from "@/lib/http";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/telegram";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/telegram/webhook — Telegram шлёт сюда апдейты бота (REQ-009, telegram-otp.md §7).
// Не наш пользователь, без сессии/RLS — подлинность проверяется секретом из заголовка
// X-Telegram-Bot-Api-Secret-Token (задаётся при регистрации через setWebhook). Без
// TELEGRAM_WEBHOOK_SECRET в env — роут отклоняет всё (нечего сверять, безопасный дефолт).
export async function POST(req: Request) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    return Errors.unauthorized();
  }

  const update = (await req.json().catch(() => null)) as (TelegramUpdate & { update_id?: number }) | null;
  if (!update || !Number.isSafeInteger(update.update_id) || update.update_id! < 0 || update.update_id! > 2147483647) return Errors.validation("Invalid update_id");
  try {
    await prisma.$transaction(async tx => {
      const id = update.update_id!;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(260926, ${id}::integer)::text`;
      if (await tx.telegramUpdateReceipt.findUnique({ where: { id } })) return;
      await handleTelegramUpdate(update);
      await tx.telegramUpdateReceipt.create({ data: { id } });
    }, { maxWait: 5000, timeout: 40000 });
    return ok({ ok: true });
  } catch {
    // ACCEPT-003: no acknowledgement on failure; Telegram retries. Never log bot secrets.
    console.error("[telegram webhook] processing failed; update will be retried");
    return fail("TELEGRAM_RETRY", "Temporary processing failure", 503);
  }
}
