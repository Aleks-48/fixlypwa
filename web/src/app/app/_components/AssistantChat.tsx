"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTranslation } from "@/lib/i18n/LanguageContext";

type ChatMsg = { role: "user" | "assistant"; text: string };

const CONSENT_KEY = "assistant_consent_v1";

export function AssistantChat({ role }: { role: "resident" | "chairman" }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [consented, setConsented] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  const CHIPS: Record<"resident" | "chairman", string[]> = {
    resident: [t("chip_my_debt"), t("chip_my_requests"), t("chip_announcements")],
    chairman: [t("chip_fin_summary"), t("chip_debtors"), t("chip_open_requests")],
  };

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
        throw new Error(body?.error?.message ?? t("error_assistant_failed"));
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
            setError(data.message ?? t("error_assistant_failed"));
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_assistant_unavailable"));
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={t("nav_assistant")}
        className="fixed right-5 bottom-20 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:bottom-6"
      >
        <Bot aria-hidden size={24} />
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[92%] max-w-md flex-col gap-0 bg-card p-0">
          <SheetHeader className="gap-1 border-b border-border p-4">
          <SheetTitle className="flex items-center justify-between text-base font-bold">
            <span className="flex items-center gap-2">
              <Bot aria-hidden size={18} /> {t("nav_assistant")}
            </span>
            <a
              href="https://t.me/fixlyosibot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold color-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-blue-600"
            >
              <span>🛟</span> {t("support_title")}
            </a>
          </SheetTitle>
          <p className="m-0 text-xs text-muted-foreground">
            {t("ai_disclaimer")}
          </p>
        </SheetHeader>

        {!consented ? (
          <div className="flex flex-1 flex-col justify-center gap-4 p-5 text-sm">
            <p className="m-0">
              {t("ai_consent_notice")}
            </p>
            <button
              onClick={acceptConsent}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {t("btn_got_it")}
            </button>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-3 text-center text-xs text-muted-foreground">
                  <p className="m-0">{t("ai_ask_anything")}</p>
                  <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                    {CHIPS[role].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => send(chip)}
                        className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border border-border bg-card/60 p-3 text-left">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1.5">
                      <span>🛟</span> Нужна живая помощь?
                    </div>
                    <div className="flex gap-2">
                      <a
                        href="https://t.me/fixlyosibot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Telegram
                      </a>
                      <a
                        href="https://wa.me/77055966486"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {m.text || (sending && i === messages.length - 1 ? "…" : "")}
                  </div>
                </div>
              ))}
              {error && (
                <p className="m-0 text-center text-xs text-destructive">{error}</p>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-border p-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("placeholder_ai_input")}
                disabled={sending}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send aria-hidden size={16} />
              </button>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
