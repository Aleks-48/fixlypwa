import { CheckCircle2, Flag, Wrench } from "lucide-react";
import { requestStatusLabels, requestStatusOrder } from "@/lib/comms/labels";

const STEP_ICONS = [CheckCircle2, Wrench, Flag] as const;

// Мини-таймлайн статуса заявки (макет: Принята → Мастер назначен → Закрыта;
// у нас статусы RECEIVED → IN_PROGRESS → RESOLVED — подписи из labels.ts, не переименовывать).
export function StatusTimeline({ status }: { status: string }) {
  const current = requestStatusOrder.indexOf(status as (typeof requestStatusOrder)[number]);

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {requestStatusOrder.map((step, i) => {
        const Icon = STEP_ICONS[i]!;
        const reached = i <= current;
        return (
          <span key={step} className="contents">
            {i > 0 && (
              <span
                aria-hidden
                className={`h-0.5 flex-1 rounded-full ${i <= current ? "bg-success" : "bg-border"}`}
              />
            )}
            <span
              className={`flex items-center gap-1 ${
                reached ? (i === current ? "font-semibold text-primary" : "text-success") : ""
              }`}
            >
              <Icon aria-hidden size={14} />
              {requestStatusLabels[step]}
            </span>
          </span>
        );
      })}
    </div>
  );
}
