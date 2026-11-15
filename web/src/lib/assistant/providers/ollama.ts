import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { createInterface } from "node:readline";
import { env } from "@/lib/env";
import type { LlmProvider, ProviderChatInput, ProviderDelta, ToolCall } from "../types";

export class OllamaProvider implements LlmProvider {
  readonly name = "ollama";
  async *chat(input: ProviderChatInput): AsyncGenerator<ProviderDelta> {
    const names = new Map<string,string>();
    const messages = input.messages.map(m => {
      if (m.role === "assistant" && m.toolCalls) {
        return {role:m.role,content:m.content ?? "",tool_calls:m.toolCalls.map(c => {
          names.set(c.id,c.name);
          return {function:{name:c.name,arguments:JSON.parse(c.argumentsJson)}};
        })};
      }
      if (m.role === "tool") return {role:"tool", content:m.content, tool_name:names.get(m.toolCallId)};
      return {role:m.role,content:m.content ?? ""};
    });
    const timeout = AbortSignal.timeout(120000);
    const res = await fetch(env.OLLAMA_URL + "/api/chat", {
      method:"POST", headers:{"Content-Type":"application/json"},
      signal:input.signal ? AbortSignal.any([timeout,input.signal]) : timeout,
      body:JSON.stringify({model:env.OLLAMA_MODEL, stream:true,
        messages:[{role:"system",content:input.systemPrompt},...messages],
        tools:input.tools.map(t=>({type:"function",function:t}))})
    });
    if (!res.ok || !res.body) throw new Error("Ollama unavailable");
    const stream = Readable.from(res.body as unknown as AsyncIterable<Uint8Array>);
    const lines = createInterface({input:stream,crlfDelay:Infinity});
    const toolCalls: ToolCall[] = [];
    try {
      for await (const line of lines) {
        if (!line.trim()) continue;
        const chunk = JSON.parse(line);
        if (chunk.error) throw new Error("Ollama generation failed");
        if (chunk.message?.content) yield {type:"text",text:chunk.message.content};
        for (const call of chunk.message?.tool_calls ?? []) toolCalls.push({id:randomUUID(),
          name:call.function.name,argumentsJson:JSON.stringify(call.function.arguments ?? {})});
        if (chunk.done) {
          yield {type:"turn_end",toolCalls,finishReason:toolCalls.length ? "tool_calls" : "stop"};
          return;
        }
      }
      throw new Error("Incomplete model response");
    } finally { lines.close(); stream.destroy(); }
  }
}
