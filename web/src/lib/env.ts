import { z } from "zod";

// Валидация окружения (NFR-053). ВАЖНО: валидируем ЛЕНИВО — при первом обращении в рантайме,
// а не на импорте модуля. Иначе `next build` (сбор данных страниц импортирует route-модули) падал
// бы без DATABASE_URL, т.к. .env не попадает в Docker-сборку (секреты не бейкаем).
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL обязателен"),
  DIRECT_URL: z.string().min(1).optional(),

  // Auth / сессии (ADR-0005).
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),
  // Оконные лимиты OTP (NFR-054). Дефолты — прод-секьюрные; поднимаются только в тестах
  // (playwright/CI), т.к. все e2e-запросы идут с одного IP.
  OTP_MAX_PER_PHONE_HOUR: z.coerce.number().int().positive().default(5),
  OTP_MAX_PER_IP_HOUR: z.coerce.number().int().positive().default(20),

  // Транспорт OTP: 'console' — dev-заглушка (код в лог), 'mobizon' — реальный шлюз
  // (Q-030 решён 2026-07-18: Mobizon.kz, общая подпись — юрлицо/альфа-имя не нужны).
  SMS_PROVIDER: z.enum(["console", "mobizon"]).default("console"),
  MOBIZON_API_KEY: z.string().optional(),

  // Telegram-канал OTP для телефона (REQ-009, telegram-otp.md) — временная замена SMS-шлюза
  // до оформления ИП/юрлица. 'sms' — существующее поведение (дефолт, обратная совместимость);
  // 'telegram' — телефон маршрутизируется через бота (нужна привязка TelegramLink).
  PHONE_OTP_CHANNEL: z.enum(["sms", "telegram"]).default("sms"),
  // 'console' — dev-заглушка (в лог); 'bot' — реальный Bot API (нужен TELEGRAM_BOT_TOKEN).
  TELEGRAM_PROVIDER: z.enum(["console", "bot"]).default("console"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(), // без @, для deep-link t.me/<username>
  // Публичная копия — для постоянной ссылки на бота в UI (login/register), не только реактивно
  // на шаге needsTelegramLink. Не секрет, username бота публичен по своей природе.
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(), // сверяется с X-Telegram-Bot-Api-Secret-Token

  // Почтовый транспорт OTP (auth-email.md §6, REQ-006): 'console' — dev-заглушка (код в лог),
  // 'smtp' — реальная отправка через nodemailer (SMTP_* обязательны при 'smtp').
  EMAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(), // например: "Fixly <no-reply@fixly.kz>"

  // Web Push (срез 7, REQ-102). Все опциональны: без ключей push отключён, in-app центр работает.
  // Генерация: npx web-push generate-vapid-keys
  WEB_PUSH_EMAIL: z.string().optional(),
  WEB_PUSH_PRIVATE_KEY: z.string().optional(),
  NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY: z.string().optional(),

  // FCM для мобильного клиента (ADR-0012 §5, REQ-127..130) — параллельный канал к Web Push,
  // тот же graceful-off паттерн: без ключей сервисного аккаунта FCM отключён, Web Push и
  // in-app центр работают как раньше. FIREBASE_PRIVATE_KEY хранит \n как литерал в .env —
  // заменяется на реальный перевод строки при чтении (см. fcm.ts).
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  // Явное эхо OTP-кода в API-ответе/UI (dev/e2e-удобство). ВЫКЛЮЧЕНО по умолчанию:
  // иначе прод с console-провайдером отдавал бы код запросившему → захват любого аккаунта
  // (security-review 2026-07-02). В проде держать 0; код виден в логе сервера (sendSms).
  OTP_DEV_ECHO: z.enum(["0", "1"]).default("0"),
  OTP_TEST_PHONES: z.string().default(""),
  OTP_TEST_ECHO_UNTIL: z.string().default(""),

  // AI-ассистент (срез 30, docs/specs/ai-assistant.md). Провайдер за интерфейсом LlmProvider —
  // тот же паттерн, что SMS_PROVIDER/EMAIL_PROVIDER: 'console' — dev-заглушка (без реального
  // вызова), 'groq' — MVP-дефолт (бесплатный тариф, §4.1), 'claude' — резерв (§4.2). Смена
  // провайдера НЕ снимает вопрос трансграничной передачи данных (Q-061/§6.3 спеки) — он
  // одинаково открыт для любого варианта.
  LLM_PROVIDER: z.enum(["console", "groq", "claude"]).default("console"),
  GROQ_API_KEY: z.string().optional(),
  // Актуальный список моделей меняется у Groq чаще, чем этот файл — дефолт можно переопределить
  // без деплоя кода. llama-3.3-70b-versatile — сильнее в tool use среди бесплатных на 2026-07.
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-4-8"),
  // Лимиты сообщений ассистента (REQ-160) — защита от злоупотребления бесплатным/платным API.
  ASSISTANT_MAX_MESSAGES_PER_DAY_USER: z.coerce.number().int().positive().default(30),
  ASSISTANT_MAX_MESSAGES_PER_DAY_OSI: z.coerce.number().int().positive().default(300),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

function load(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Не печатаем значения (могут содержать секреты) — только имена невалидных полей.
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Некорректное окружение: ${fields}`);
  }
  cached = parsed.data;
  return cached;
}

// Прокси: обращение env.X триггерит валидацию в рантайме (при первом доступе), не на импорте.
export const env = new Proxy({} as Env, {
  get: (_t, prop: string) => load()[prop as keyof Env],
});
