"use client";

import { Button } from "@/components/ui/button";
import { Loader2,Mic,Send,Square,Trash2 } from "lucide-react";
import { useEffect,useRef,useState } from "react";

type State = "idle" | "recording" | "recorded" | "uploading";

interface VoiceRecorderProps {
  onAudioReady: (audioUrl: string, durationSec: number) => void;
  onCancel?: () => void;
}

export function VoiceRecorder({ onAudioReady, onCancel }: VoiceRecorderProps) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);        // секунд записано
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null); // blob-URL для превью

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobEvent["data"][]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setState("recorded");
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(100); // 100ms chunks
      mediaRef.current = recorder;
      startTimeRef.current = Date.now();
      setElapsed(0);
      setState("recording");

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);
    } catch {
      setError("Нет доступа к микрофону. Разрешите в настройках браузера.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRef.current?.stop();
  };

  const discardRecording = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setElapsed(0);
    setState("idle");
    onCancel?.();
  };

  const uploadAndSend = async () => {
    if (!audioBlob) return;
    setState("uploading");
    setError(null);

    try {
      const formData = new FormData();
      const ext = audioBlob.type.includes("webm") ? ".webm"
        : audioBlob.type.includes("ogg") ? ".ogg" : ".m4a";
      formData.append("file", audioBlob, `voice${ext}`);

      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка загрузки");

      const url: string = data.urls?.[0];
      if (!url) throw new Error("Сервер не вернул URL");

      onAudioReady(url, elapsed);
      discardRecording();
    } catch (caughtError) {
const err = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

      const msg = err.message;
      setError(msg);
      setState("recorded");
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-2">
      {/* Превью плеер после остановки */}
      {audioUrl && state !== "recording" && (
        <audio
          src={audioUrl}
          controls
          className="w-full h-9 rounded-lg"
          style={{ accentColor: "hsl(var(--primary))" }}
        />
      )}

      <div className="flex items-center gap-2">
        {state === "idle" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={startRecording}
            className="gap-1.5 rounded-xl text-xs border-primary/40 text-primary hover:bg-primary/10"
          >
            <Mic className="size-4" />
            Запись
          </Button>
        )}

        {state === "recording" && (
          <>
            {/* Пульсирующий индикатор */}
            <span className="flex size-2.5 shrink-0">
              <span className="absolute inline-flex size-2.5 animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
            </span>
            <span className="text-xs font-mono text-destructive font-bold tabular-nums">
              {fmt(elapsed)}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={stopRecording}
              className="gap-1.5 rounded-xl text-xs bg-destructive hover:bg-destructive/90"
            >
              <Square className="size-3.5 fill-current" />
              Стоп
            </Button>
          </>
        )}

        {state === "recorded" && (
          <>
            <span className="text-xs text-muted-foreground tabular-nums">{fmt(elapsed)}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={discardRecording}
              className="gap-1 rounded-xl text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={uploadAndSend}
              className="gap-1.5 rounded-xl text-xs"
            >
              <Send className="size-3.5" />
              Отправить голос
            </Button>
          </>
        )}

        {state === "uploading" && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Загрузка…
          </span>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
