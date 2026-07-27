import { env } from "./env";
import { maskPhone, normalizeKzPhone } from "./phone";
import { prisma } from "./db/prisma";

const TELEGRAM_API = "https://api.telegram.org";

// Транспорт Telegram-канала OTP (REQ-009, telegram-otp.md) — временная замена SMS-шлюза,
// пока не оформлено ИП/юрлицо (Q-030). По образцу sms.ts/email.ts: 'console' — dev-заглушка
// (в лог, сеть не трогаем), 'bot' — реальный Bot API.
export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  if (env.TELEGRAM_PROVIDER === "console") {
    console.info(`[TELEGRAM:console] chat ${chatId} → ${text}`);
    return;
  }
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_PROVIDER=bot: TELEGRAM_BOT_TOKEN обязателен");
  }

  const res = await fetch(`${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  const json = (await res.json().catch(() => null)) as
    | { ok?: boolean; description?: string }
    | null;
  if (!res.ok || !json?.ok) {
    throw new Error(`Telegram: не удалось отправить сообщение (${json?.description ?? res.status})`);
  }
}

// Клавиатура с кнопкой «Поделиться номером» (Bot API request_contact) — единственный источник
// телефона в этой схеме (telegram-otp.md §1): Telegram технически не позволяет поделиться
// ЧУЖИМ номером через эту кнопку, поэтому её нажатие само по себе доказывает владение.
async function sendRequestContact(chatId: string): Promise<void> {
  if (env.TELEGRAM_PROVIDER === "console") {
    console.info(`[TELEGRAM:console] chat ${chatId} → [кнопка «Поделиться номером»]`);
    return;
  }
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_PROVIDER=bot: TELEGRAM_BOT_TOKEN обязателен");
  }

  const res = await fetch(`${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "Нажмите кнопку ниже, чтобы привязать номер телефона для входа в Fixly.",
      reply_markup: {
        keyboard: [[{ text: "📱 Поделиться номером", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }),
  });

  const json = (await res.json().catch(() => null)) as
    | { ok?: boolean; description?: string }
    | null;
  if (!res.ok || !json?.ok) {
    throw new Error(`Telegram: не удалось отправить клавиатуру (${json?.description ?? res.status})`);
  }
}

// Минимальный срез Update, который нам реально нужен (полный тип Bot API — десятки полей).
export type TelegramUpdate = {
  message?: {
    chat: { id: number | string };
    text?: string;
    contact?: { phone_number: string; user_id?: number };
  };
};

// Бизнес-логика вебхука (POST /api/telegram/webhook) — вынесена отдельно от роута, чтобы
// тестироваться без сети/без реального Telegram (просто вызов с синтетическим Update).
// /start → клавиатура «Поделиться номером»; contact → привязка (upsert TelegramLink).
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message) return;
  const chatId = String(message.chat.id);

  if (message.contact) {
    const phone = normalizeKzPhone(message.contact.phone_number);
    if (!phone) {
      await sendTelegramMessage(chatId, "Не удалось распознать номер. Попробуйте ещё раз.");
      return;
    }
    await prisma.telegramLink.upsert({
      where: { phone },
      create: { phone, chatId },
      update: { chatId },
    });
    console.info(`[TELEGRAM] привязан ${maskPhone(phone)} → chat ${chatId}`);
    await sendTelegramMessage(
      chatId,
      "Готово! Вернитесь на сайт или в приложение Fixly и введите этот же номер телефона.",
    );
    return;
  }

  if (message.text === "/start") {
    await sendRequestContact(chatId);
  }
}
