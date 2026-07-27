import { env } from "./env";
import { maskPhone } from "./phone";

// Транспорт OTP (ADR-0005). Внешний шлюз только доставляет код, не хранит ПДн.
// В dev/test — заглушка 'console' (код в лог сервера). Реальный казахстанский шлюз — Q-030.
export async function sendSms(phone: string, message: string): Promise<void> {
  if (env.SMS_PROVIDER === "console") {
    // Телефон маскируем в логе; полный код печатаем только в dev-заглушке.
    console.info(`[SMS:console] ${maskPhone(phone)} → ${message}`);
    return;
  }

  // Q-030: интеграция с реальным SMS-шлюзом (казахстанский провайдер).
  throw new Error("SMS_PROVIDER=sms: реальный шлюз ещё не подключён (Q-030)");
}
