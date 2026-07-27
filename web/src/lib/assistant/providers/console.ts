import type { LlmProvider, ProviderChatInput, ProviderDelta } from "../types";

// Dev-заглушка (тот же паттерн, что SMS_PROVIDER=console/EMAIL_PROVIDER=console): реального
// вызова наружу не делает, отвечает детерминированной фразой. Используется в тестах и локально
// без ключа, чтобы не жечь бесплатный лимит Groq на каждый прогон.
export class ConsoleProvider implements LlmProvider {
  readonly name = "console";

  async *chat(input: ProviderChatInput): AsyncGenerator<ProviderDelta> {
    const last = [...input.messages].reverse().find((m) => m.role === "user");
    const text = `[assistant:console] получил вопрос: ${last?.role === "user" ? last.content : ""}`;
    console.info(text);
    yield { type: "text", text };
    yield { type: "turn_end", toolCalls: [], finishReason: "stop" };
  }
}
