import { env } from "./env";

// Почтовый транспорт OTP (auth-email.md §6, REQ-006) — по образцу sms.ts: внешний сервис
// только доставляет код, письмо не содержит ПДн/данных приложения (NFR-001).
// В dev/test — заглушка 'console' (код в лог сервера). Прод — SMTP через nodemailer.
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (env.EMAIL_PROVIDER === "console") {
    console.info(`[EMAIL:console] ${maskEmail(to)} → ${subject}: ${text}`);
    return;
  }

  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.MAIL_FROM) {
    throw new Error("EMAIL_PROVIDER=smtp: SMTP_HOST/SMTP_PORT/MAIL_FROM обязательны");
  }
  // Динамический импорт: при console-провайдере nodemailer не грузится вовсе.
  const { createTransport } = await import("nodemailer");
  const transport = createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: env.MAIL_FROM, to, subject, text });
}

// Маскировка адреса для логов: b***o@gmail.com — не пишем ПДн в логи целиком.
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const head = local.slice(0, 1);
  const tail = local.length > 2 ? local.slice(-1) : "";
  return `${head}***${tail}@${domain}`;
}
