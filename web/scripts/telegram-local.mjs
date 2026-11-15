import { setTimeout as sleep } from "node:timers/promises";

const { TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET } = process.env;
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_WEBHOOK_SECRET) throw new Error("Missing bot configuration");

let offset;
while (true) {
  try {
    const response = await fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/getUpdates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offset, timeout: 25, limit: 10 }),
      signal: AbortSignal.timeout(40000),
    });
    if (!response.ok) throw new Error("Telegram HTTP " + response.status);
    const { result } = await response.json();
    for (const update of result) {
      const local = await fetch("http://app:3000/api/telegram/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Telegram-Bot-Api-Secret-Token": TELEGRAM_WEBHOOK_SECRET },
        body: JSON.stringify(update),
        signal: AbortSignal.timeout(50000),
      });
      if (!local.ok) throw new Error("Fixly HTTP " + local.status);
      offset = update.update_id + 1;
      console.log("Delivered to Fixly");
    }
  } catch (error) {
    const status = /^(Telegram|Fixly) HTTP \d{3}$/.test(error.message) ? error.message : "Connection interrupted";
    console.error(status);
    await sleep(5000);
  }
}
