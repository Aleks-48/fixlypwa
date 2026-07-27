import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import type {
  ChatMessage,
  LlmProvider,
  ProviderChatInput,
  ProviderDelta,
  ToolCall,
} from "../types";

// Резервный провайдер (docs/specs/ai-assistant.md §4.2) — Messages API + tool_use, готов к
// включению через LLM_PROVIDER=claude, если качество Groq не устроит. Не MVP-дефолт: держим
// эквивалентным по интерфейсу GroqProvider, чтобы переключение было конфигурацией, не рефакторингом.
export class ClaudeProvider implements LlmProvider {
  readonly name = "claude";
  private client: Anthropic;

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error("LLM_PROVIDER=claude: ANTHROPIC_API_KEY обязателен");
    }
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  async *chat(input: ProviderChatInput): AsyncGenerator<ProviderDelta> {
    const messages = toClaudeMessages(input.messages);
    const tools = input.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));

    let stream: ReturnType<Anthropic["messages"]["stream"]>;
    try {
      stream = this.client.messages.stream({
        model: env.ANTHROPIC_MODEL,
        max_tokens: 2048,
        system: input.systemPrompt,
        tools: tools.length > 0 ? tools : undefined,
        messages,
      });
    } catch (err) {
      yield toErrorDelta(err);
      return;
    }

    // tool_use-блоки приходят как content_block_start (пустой input) + серия
    // input_json_delta-кусочков partial_json — склеиваем в строку, парсим один раз в конце.
    const toolCallsAcc = new Map<number, { id: string; name: string; args: string }>();

    try {
      for await (const event of stream) {
        if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
          toolCallsAcc.set(event.index, {
            id: event.content_block.id,
            name: event.content_block.name,
            args: "",
          });
        } else if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            yield { type: "text", text: event.delta.text };
          } else if (event.delta.type === "input_json_delta") {
            const acc = toolCallsAcc.get(event.index);
            if (acc) acc.args += event.delta.partial_json;
          }
        }
      }
    } catch (err) {
      yield toErrorDelta(err);
      return;
    }

    const finalMessage = await stream.finalMessage().catch(() => null);
    const finishReason: "stop" | "tool_calls" | "length" =
      finalMessage?.stop_reason === "tool_use"
        ? "tool_calls"
        : finalMessage?.stop_reason === "max_tokens"
          ? "length"
          : "stop";

    const toolCalls: ToolCall[] = [...toolCallsAcc.values()]
      .filter((tc) => tc.name)
      .map((tc) => ({ id: tc.id, name: tc.name, argumentsJson: tc.args || "{}" }));

    yield { type: "turn_end", toolCalls, finishReason };
  }
}

function toClaudeMessages(messages: ChatMessage[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      const content: Anthropic.ContentBlockParam[] = [];
      if (m.content) content.push({ type: "text", text: m.content });
      for (const tc of m.toolCalls ?? []) {
        content.push({
          type: "tool_use",
          id: tc.id,
          name: tc.name,
          input: JSON.parse(tc.argumentsJson || "{}"),
        });
      }
      out.push({ role: "assistant", content });
    } else if (m.role === "tool") {
      out.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: m.toolCallId, content: m.content }],
      });
    }
  }
  return out;
}

function toErrorDelta(err: unknown): ProviderDelta {
  if (err instanceof Anthropic.RateLimitError) {
    return { type: "error", code: "RATE_LIMITED", message: "Claude: превышен лимит запросов" };
  }
  if (err instanceof Anthropic.APIConnectionError || err instanceof Anthropic.InternalServerError) {
    return {
      type: "error",
      code: "PROVIDER_UNAVAILABLE",
      message: "Claude: сервис временно недоступен",
    };
  }
  console.error("[assistant/claude] неожиданная ошибка:", err);
  return { type: "error", code: "UNKNOWN", message: "Не удалось получить ответ ассистента" };
}
