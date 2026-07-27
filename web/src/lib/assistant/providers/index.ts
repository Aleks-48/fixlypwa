import { env } from "@/lib/env";
import type { LlmProvider } from "../types";
import { ConsoleProvider } from "./console";
import { GroqProvider } from "./groq";
import { ClaudeProvider } from "./claude";

// Выбор провайдера по LLM_PROVIDER (docs/specs/ai-assistant.md §3/§4) — тот же паттерн, что
// SMS_PROVIDER/EMAIL_PROVIDER/TELEGRAM_PROVIDER: конфигурация, не код. 'console' — dev-заглушка
// (не жжёт лимит), 'groq' — MVP-дефолт (бесплатный тариф), 'claude' — резерв на случай проблем
// с качеством/лимитами Groq (см. §4.2).
let cached: LlmProvider | null = null;

export function getLlmProvider(): LlmProvider {
  if (cached) return cached;
  switch (env.LLM_PROVIDER) {
    case "console":
      cached = new ConsoleProvider();
      break;
    case "groq":
      cached = new GroqProvider();
      break;
    case "claude":
      cached = new ClaudeProvider();
      break;
  }
  return cached;
}

// Фича включена, только если у выбранного провайдера есть нужный ключ (graceful-off, как
// Web Push/FCM) — иначе UI не должен даже показывать кнопку ассистента.
export function isAssistantEnabled(): boolean {
  if (env.LLM_PROVIDER === "console") return true;
  if (env.LLM_PROVIDER === "groq") return Boolean(env.GROQ_API_KEY);
  if (env.LLM_PROVIDER === "claude") return Boolean(env.ANTHROPIC_API_KEY);
  return false;
}
