import { env } from "@/lib/env";
import { ok, Errors } from "@/lib/http";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/telegram";

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

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  if (update) {
    // Best-effort: сбой обработки не должен превращаться в ретраи от Telegram (200 всегда).
    await handleTelegramUpdate(update).catch((err) => {
      console.error("[telegram webhook] обработка апдейта упала:", err);
    });
  }

  return ok({ ok: true });
}
