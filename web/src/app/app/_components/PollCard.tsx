"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { postJson } from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PollView } from "@/lib/polls/service";

// Карточка опроса: до голоса — варианты-кнопки; после — результаты с процентами.
// Lite-опрос: не юридический, мгновенный подсчёт (features.md блок C).
export function PollCard({
  poll,
  showResults = false,
}: {
  poll: PollView;
  showResults?: boolean; // председатель видит результаты без голосования
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const voted = poll.myOptionId !== null || showResults;

  async function cast(optionId: string) {
    setBusy(true);
    try {
      await postJson("/api/polls/vote", { optionId });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-2xl shadow-sm" data-testid="poll-card">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <strong className="text-[15px] font-bold">{poll.question}</strong>
          {poll.closed ? (
            <Badge variant="outline" className="shrink-0 rounded-full">
              Завершён
            </Badge>
          ) : poll.myOptionId !== null ? (
            <Badge className="shrink-0 rounded-full border-none bg-success-soft text-success">
              Вы проголосовали
            </Badge>
          ) : showResults ? null : (
            <Badge className="shrink-0 rounded-full border-none bg-destructive-soft text-destructive">
              Нужен ваш голос
            </Badge>
          )}
        </div>

        <ul className="m-0 mt-3 grid list-none gap-2 p-0">
          {poll.options.map((o) => {
            const pct = poll.totalVotes > 0 ? Math.round((o.votes / poll.totalVotes) * 100) : 0;
            const mine = o.id === poll.myOptionId;
            return (
              <li key={o.id}>
                {voted || poll.closed ? (
                  <div
                    className={`relative overflow-hidden rounded-xl border px-3 py-2 text-sm ${
                      mine ? "border-primary" : "border-border"
                    }`}
                    data-testid={mine ? "poll-my-option" : undefined}
                  >
                    <div
                      aria-hidden
                      className="absolute inset-y-0 left-0 bg-primary/15"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex justify-between gap-2">
                      <span className="flex items-center gap-1">
                        {o.label} {mine && <Check aria-hidden size={13} className="text-primary" />}
                      </span>
                      <span className="text-muted-foreground" data-testid="poll-pct">
                        {pct}% ({o.votes})
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => cast(o.id)}
                    data-testid="poll-option"
                    className="w-full cursor-pointer rounded-xl border border-border bg-transparent px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary hover:bg-accent"
                  >
                    {o.label}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="m-0 mt-2 text-xs text-muted-foreground">
          Голосов: {poll.totalVotes} · неформальный опрос
        </p>
      </CardContent>
    </Card>
  );
}
