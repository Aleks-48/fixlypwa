"use client";
import type { RequestCategory } from "@prisma/client";

import { Card,CardContent } from "@/components/ui/card";
import { requestCategoryLabels,requestStatusLabels } from "@/lib/comms/labels";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { CategoryTile } from "./categoryIcons";
import { MarketplacePanel,type ListingView,type OfferView } from "./MarketplacePanel";
import { MasterSelect } from "./MasterSelect";
import { RateMasterCard } from "./RateMasterCard";
import { RequestMessageForm } from "./RequestMessageForm";
import { RequestStatusControls } from "./RequestStatusControls";
import { StatusTimeline } from "./StatusTimeline";

type Message = { id: string; authorUserId: string; text: string; audioUrl?: string | null; createdAt: Date };
type Req = {
  id: string;
  category: RequestCategory;
  text: string;
  status: string;
  authorUserId: string;
  createdAt: Date;
  messages: Message[];
  photoUrls?: string[];
  // Назначенный мастер (опционально)
  masterId?: string | null;
  masterName?: string | null;
  // Уже оставлен ли отзыв по заявке (чтобы не показывать повторно)
  hasReview?: boolean;
};

// Тон бейджа статуса (макет: Принята — красный, В работе — янтарный, Решена — зелёный).
const STATUS_TONE: Record<string, string> = {
  RECEIVED: "bg-destructive-soft text-destructive",
  IN_PROGRESS: "bg-warning-soft text-warning",
  RESOLVED: "bg-success-soft text-success",
};

// Карточка заявки с тредом. canChangeStatus → председателю показываем контролы статуса,
// иначе — бейдж + таймлайн. Автор реплики определяется сравнением с authorUserId заявки.
export function RequestCard({
  request,
  canChangeStatus,
  marketplace,
  currentUserId,
}: {
  request: Req;
  canChangeStatus: boolean;
  // Только на странице «Заявки дома» (председатель) — публикация мастерам (marketplace.md).
  marketplace?: { listing: ListingView | null; offers: OfferView[] };
  // userId текущего пользователя — для RateMasterCard (резидент оценивает только свои заявки)
  currentUserId?: string;
}) {
  const { t } = useTranslation();

  // Показываем RateMasterCard: только жителю, только после RESOLVED, только если назначен мастер и нет отзыва
  const showRateCard =
    !canChangeStatus &&
    request.status === "RESOLVED" &&
    !!request.masterId &&
    !!request.masterName &&
    !request.hasReview &&
    currentUserId === request.authorUserId;

  return (
    <Card className="rounded-2xl shadow-sm" data-testid="request-card">
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <CategoryTile category={request.category} />
            <div className="min-w-0">
              <p className="m-0 truncate text-sm font-bold">{request.text}</p>
              <p className="m-0 text-xs text-muted-foreground">
                {requestCategoryLabels[request.category] ?? request.category} · подана{" "}
                {request.createdAt.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
              </p>
              {/* Назначенный мастер — показываем и жителю */}
              {request.masterName && (
                <p className="m-0 mt-0.5 text-xs font-medium text-primary">
                  🔧 {request.masterName}
                </p>
              )}
            </div>
          </div>
          {canChangeStatus ? (
            <RequestStatusControls id={request.id} status={request.status} />
          ) : (
            <span
              data-testid="request-status"
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                STATUS_TONE[request.status] ?? "bg-secondary text-muted-foreground"
              }`}
            >
              {requestStatusLabels[request.status]}
            </span>
          )}
        </div>

        {/* MasterSelect — только председателю */}
        {canChangeStatus && (
          <div className="mt-3">
            <MasterSelect
              requestId={request.id}
              currentMasterId={request.masterId}
              category={request.category}
            />
          </div>
        )}

        {!canChangeStatus && (
          <div className="mt-3">
            <StatusTimeline status={request.status} />
          </div>
        )}

        {request.photoUrls && request.photoUrls.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {request.photoUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt="Фото заявки"
                className="size-16 rounded-lg border border-border object-cover"
              />
            ))}
          </div>
        )}

        {request.messages.length > 0 && (
          <ul className="m-0 mt-3 grid list-none gap-1.5 p-0">
            {request.messages.map((m) => (
              <li key={m.id} className="border-l-2 border-border pl-2.5 text-sm">
                <span className="text-xs text-muted-foreground">
                  {m.authorUserId === request.authorUserId ? t("role_resident") : t("role_chairman")}
                </span>
                {/* Текст — скрываем если это дефолтная подпись к голосовому */}
                {m.text && m.text !== "🎤 Голосовое сообщение" && (
                  <div>{m.text}</div>
                )}
                {/* Голосовое сообщение */}
                {m.audioUrl && (
                  <audio
                    src={m.audioUrl}
                    controls
                    className="mt-1 h-8 w-full max-w-xs rounded-lg"
                    aria-label="Голосовое сообщение"
                  />
                )}
                {/* Только emoji-подпись если нет текста, но есть аудио */}
                {m.audioUrl && (!m.text || m.text === "🎤 Голосовое сообщение") && !m.audioUrl && (
                  <div className="text-xs text-muted-foreground">🎤 Голосовое сообщение</div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3">
          <RequestMessageForm requestId={request.id} />
        </div>

        {/* RateMasterCard — жителю после закрытия заявки с назначенным мастером */}
        {showRateCard && (
          <div className="mt-4">
            <RateMasterCard
              requestId={request.id}
              masterId={request.masterId!}
              masterName={request.masterName!}
            />
          </div>
        )}

        {marketplace && (
          <MarketplacePanel
            requestId={request.id}
            defaultTitle={`${requestCategoryLabels[request.category] ?? request.category}: ${request.text}`.slice(0, 160)}
            defaultDescription={request.text}
            defaultPhotoUrls={request.photoUrls ?? []}
            listing={marketplace.listing}
            offers={marketplace.offers}
          />
        )}
      </CardContent>
    </Card>
  );
}
