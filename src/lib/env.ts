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

  // Транспорт OTP: 'console' — dev-заглушка (код в лог), 'sms' — реальный шлюз (Q-030).
  SMS_PROVIDER: z.enum(["console", "sms"]).default("console"),

  // Web Push (срез 7, REQ-102). Все опциональны: без ключей push отключён, in-app центр работает.
  // Генерация: npx web-push generate-vapid-keys
  WEB_PUSH_EMAIL: z.string().optional(),
  WEB_PUSH_PRIVATE_KEY: z.string().optional(),
  NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY: z.string().optional(),
  // Явное эхо OTP-кода в API-ответе/UI (dev/e2e-удобство). ВЫКЛЮЧЕНО по умолчанию:
  // иначе прод с console-провайдером отдавал бы код запросившему → захват любого аккаунта
  // (security-review 2026-07-02). В проде держать 0; код виден в логе сервера (sendSms).
  OTP_DEV_ECHO: z.enum(["0", "1"]).default("0"),
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
