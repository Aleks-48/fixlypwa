"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// Плавающая кнопка + шторка чата с AI-ассистентом (docs/specs/ai-assistant.md §10). Читает
// SSE вручную через fetch+ReadableStream (не EventSource — тому нужен GET без тела; POST с
// сообщением требует ручного разбора, тот же принцип, что стриминг событий во Flutter-клиенте).
type ChatMsg = { role: "user" | "assistant"; text: string };

const CONSENT_KEY = "assistant_consent_v1";

const CHIPS: Record<"resident" | "chairman", string[]> = {
  resident: ["Мой долг", "Мои заявки", "Объявления дома"],
  chairman: ["Финансовая сводка", "Должники", "Открытые заявки"],
};

export function AssistantChat({ role }: { role: "resident" | "chairman" }) {
  const [open, setOpen] = useState(false);
  const [consented, setConsented] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConsented(localStorage.getItem(CONSENT_KEY) === "1");
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function acceptConsent() {
    localStorage.setItem(CONSENT_KEY, "1");
    setConsented(true);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError(null);
    setMessages((m) => [...m, { role: "user", text: trimmed }, { role: "assistant", text: "" }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversationId: conversationIdRef.current }),
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? "Не удалось связаться с ассистентом");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const chunk = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const eventLine = chunk.split("\n").find((l) => l.startsWith("event: "));
          const dataLine = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!eventLine || !dataLine) continue;
          const event = eventLine.slice("event: ".length);
          const data = JSON.parse(dataLine.slice("data: ".length)) as {
            text?: string;
            conversationId?: string;
            message?: string;
          };
          if (event === "text" && data.text) {
            setMessages((m) => {
              const next = [...m];
              const last = next[next.length - 1];
              if (last?.role === "assistant")
                next[next.length - 1] = { ...last, text: last.text + data.text };
              return next;
            });
          } else if (event === "done" && data.conversationId) {
            conversationIdRef.current = data.conversationId;
          } else if (event === "error") {
            setError(data.message ?? "Ошибка ассистента");
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ассистент временно недоступен");
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="AI-ассистент"
        className="fixed right-5 bottom-20 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:bottom-6"
      >
        <Bot aria-hidden size={24} />
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[92%] max-w-md flex-col gap-0 bg-card p-0">
        <SheetHeader className="gap-1 border-b border-border p-4">
          <SheetTitle className="flex items-center gap-2 text-base font-bold">
            <Bot aria-hidden size={18} /> AI-ассистент
          </SheetTitle>
          <p className="m-0 text-xs text-muted-foreground">
            Ответы генерирует ИИ и они могут содержать ошибки — это не юридическая консультация.
          </p>
        </SheetHeader>

        {!consented ? (
          <div className="flex flex-1 flex-col justify-center gap-4 p-5 text-sm">
            <p className="m-0">
              Чтобы ответить на вопрос, ассистент может отправлять обезличенные данные (без ФИО,
              телефона, email — они заменяются перед отправкой) внешнему AI-сервису. Продолжая, вы
              соглашаетесь с этим.
            </p>
            <button
              onClick={acceptConsent}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Понятно, продолжить
            </button>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {CHIPS[role].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => send(chip)}
                      className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {m.text || (sending && i === messages.length - 1 ? "…" : "")}
                </div>
              ))}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="flex items-center gap-2 border-t border-border p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Спросите что-нибудь…"
                disabled={sending}
                className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Отправить"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send aria-hidden size={17} />
              </button>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
