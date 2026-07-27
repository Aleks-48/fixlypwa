import Groq from "groq-sdk";
import { env } from "@/lib/env";
import type {
  ChatMessage,
  LlmProvider,
  ProviderChatInput,
  ProviderDelta,
  ToolCall,
} from "../types";

// Groq — OpenAI-совместимый протокол (chat.completions, tools/tool_calls). MVP-провайдер по
// умолчанию (docs/specs/ai-assistant.md §4.1) — бесплатный тариф, открытые модели.
export class GroqProvider implements LlmProvider {
  readonly name = "groq";
  private client: Groq;

  constructor() {
    if (!env.GROQ_API_KEY) {
      throw new Error("LLM_PROVIDER=groq: GROQ_API_KEY обязателен");
    }
    this.client = new Groq({ apiKey: env.GROQ_API_KEY });
  }

  async *chat(input: ProviderChatInput): AsyncGenerator<ProviderDelta> {
    const messages = toGroqMessages(input.systemPrompt, input.messages);
    const tools = input.tools.map((t) => ({
      type: "function" as const,
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));

    let stream: Awaited<ReturnType<Groq["chat"]["completions"]["create"]>>;
    try {
      stream = await this.client.chat.completions.create(
        {
          model: env.GROQ_MODEL,
          messages,
          tools: tools.length > 0 ? tools : undefined,
          stream: true,
        },
        { signal: input.signal },
      );
    } catch (err) {
      yield toErrorDelta(err);
      return;
    }

    // Аккумулятор частичных tool_calls по index — стандартный паттерн OpenAI-совместимого
    // стриминга: имя/аргументы функции приходят по кусочкам в разных чанках, склеиваем строкой.
    const toolCallsAcc = new Map<number, { id: string; name: string; args: string }>();
    let finishReason: "stop" | "tool_calls" | "length" = "stop";

    try {
      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) continue;
        const delta = choice.delta;
        if (delta?.content) {
          yield { type: "text", text: delta.content };
        }
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const acc = toolCallsAcc.get(tc.index) ?? { id: "", name: "", args: "" };
            if (tc.id) acc.id = tc.id;
            if (tc.function?.name) acc.name += tc.function.name;
            if (tc.function?.arguments) acc.args += tc.function.arguments;
            toolCallsAcc.set(tc.index, acc);
          }
        }
        if (choice.finish_reason === "tool_calls") finishReason = "tool_calls";
        else if (choice.finish_reason === "length") finishReason = "length";
        else if (choice.finish_reason === "stop") finishReason = "stop";
      }
    } catch (err) {
      yield toErrorDelta(err);
      return;
    }

    const toolCalls: ToolCall[] = [...toolCallsAcc.values()]
      .filter((tc) => tc.name)
      .map((tc) => ({ id: tc.id, name: tc.name, argumentsJson: tc.args || "{}" }));

    yield { type: "turn_end", toolCalls, finishReason };
  }
}

function toGroqMessages(
  systemPrompt: string,
  messages: ChatMessage[],
): Groq.Chat.ChatCompletionMessageParam[] {
  const out: Groq.Chat.ChatCompletionMessageParam[] = [{ role: "system", content: systemPrompt }];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      out.push({
        role: "assistant",
        content: m.content,
        ...(m.toolCalls && m.toolCalls.length > 0
          ? {
              tool_calls: m.toolCalls.map((tc) => ({
                id: tc.id,
                type: "function" as const,
                function: { name: tc.name, arguments: tc.argumentsJson },
              })),
            }
          : {}),
      });
    } else if (m.role === "tool") {
      out.push({ role: "tool", tool_call_id: m.toolCallId, content: m.content });
    }
  }
  return out;
}

function toErrorDelta(err: unknown): ProviderDelta {
  const status = (err as { status?: number } | null)?.status;
  if (status === 429) {
    return {
      type: "error",
      code: "RATE_LIMITED",
      message: "Groq: превышен лимит бесплатного тарифа, попробуйте позже",
    };
  }
  if (typeof status === "number" && status >= 500) {
    return {
      type: "error",
      code: "PROVIDER_UNAVAILABLE",
      message: "Groq: сервис временно недоступен",
    };
  }
  console.error("[assistant/groq] неожиданная ошибка:", err);
  return { type: "error", code: "UNKNOWN", message: "Не удалось получить ответ ассистента" };
}
