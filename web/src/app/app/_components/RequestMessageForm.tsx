"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postJson } from "@/lib/apiClient";
import { Mic,MicOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { VoiceRecorder } from "./VoiceRecorder";

// Сообщение в тред заявки (features.md блок B — тред). REQ-131: аудио-вложения.
export function RequestMessageForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [pendingAudio, setPendingAudio] = useState<{ url: string; durationSec: number } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson(`/api/requests/${requestId}/messages`, {
        text: text || (pendingAudio ? "🎤 Голосовое сообщение" : ""),
        audioUrl: pendingAudio?.url ?? null,
      });
      setText("");
      setPendingAudio(null);
      setShowVoice(false);
      router.refresh();
    } catch (caughtError) {
const err = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

      const msg = err.message;
      setError(msg || "Ошибка отправки");
    } finally {
      setLoading(false);
    }
  }

  // Вызывается из VoiceRecorder после загрузки аудио на сервер
  const handleAudioReady = (url: string, durationSec: number) => {
    setPendingAudio({ url, durationSec });
    setShowVoice(false);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      {/* Ожидающее аудио-вложение */}
      {pendingAudio && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5">
          <span className="text-xs text-primary">🎤 Голосовое</span>
          <audio src={pendingAudio.url} controls className="h-7 flex-1" />
          <button
            type="button"
            onClick={() => setPendingAudio(null)}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            ✕
          </button>
        </div>
      )}

      {/* Панель записи голоса */}
      {showVoice && !pendingAudio && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <VoiceRecorder
            onAudioReady={handleAudioReady}
            onCancel={() => setShowVoice(false)}
          />
        </div>
      )}

      {/* Строка ввода текста + кнопки */}
      <div className="flex flex-wrap gap-2">
        <Input
          aria-label="Сообщение"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required={!pendingAudio}
          placeholder={pendingAudio ? "Добавить текст к голосовому…" : "Написать в тред…"}
          data-testid="msg-text"
          className="flex-1 basis-[160px]"
        />

        {/* Кнопка переключения записи голоса */}
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => setShowVoice((v) => !v)}
          className={`h-10 w-10 rounded-xl shrink-0 ${
            showVoice
              ? "border-destructive/50 text-destructive bg-destructive/5"
              : "border-primary/40 text-primary hover:bg-primary/10"
          }`}
          title={showVoice ? "Скрыть запись" : "Голосовое сообщение"}
          data-testid="voice-toggle"
        >
          {showVoice ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </Button>

        <Button
          type="submit"
          disabled={loading || (!text.trim() && !pendingAudio)}
          data-testid="msg-submit"
          className="w-auto rounded-xl"
        >
          {loading ? "…" : "Отправить"}
        </Button>
      </div>

      {error && (
        <p role="alert" data-testid="error" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
