// Провайдер-агностичные типы диалога с AI-ассистентом (docs/specs/ai-assistant.md §3).
// Реализации провайдеров (Groq/Claude, src/lib/assistant/providers/*) переводят их в свой
// протокол — весь остальной код (tools, service, route) работает только с этими типами и не
// знает, какой SDK используется. Смена LLM_PROVIDER не требует правок за пределами providers/.

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; content: string };

export type ToolCall = {
  id: string;
  name: string;
  /** Сырые аргументы как JSON-строка (как их отдаёт модель) — вызывающий код сам парсит/валидирует. */
  argumentsJson: string;
};

export type ToolDef = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

// Один элемент потока ответа модели за один "ход". "turn_end" завершает ход: если toolCalls
// не пуст — вызывающий код (service.ts) исполняет инструменты и запускает провайдера заново с
// результатами; если пуст — text-дельты, отправленные до этого turn_end, и есть финальный ответ.
export type ProviderDelta =
  | { type: "text"; text: string }
  | { type: "turn_end"; toolCalls: ToolCall[]; finishReason: "stop" | "tool_calls" | "length" }
  | { type: "error"; code: "RATE_LIMITED" | "PROVIDER_UNAVAILABLE" | "UNKNOWN"; message: string };

export type ProviderChatInput = {
  systemPrompt: string;
  messages: ChatMessage[];
  tools: ToolDef[];
  signal?: AbortSignal;
};

export interface LlmProvider {
  readonly name: string;
  chat(input: ProviderChatInput): AsyncGenerator<ProviderDelta>;
}
