import { requestCategoryLabels, requestStatusLabels } from "@/lib/comms/labels";
import { Card, CardContent } from "@/components/ui/card";
import { RequestStatusControls } from "./RequestStatusControls";
import { RequestMessageForm } from "./RequestMessageForm";
import { CategoryTile } from "./categoryIcons";
import { StatusTimeline } from "./StatusTimeline";
import { MarketplacePanel, type ListingView, type OfferView } from "./MarketplacePanel";

type Message = { id: string; authorUserId: string; text: string; createdAt: Date };
type Req = {
  id: string;
  category: string;
  text: string;
  status: string;
  authorUserId: string;
  createdAt: Date;
  messages: Message[];
  photoUrls?: string[];
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
}: {
  request: Req;
  canChangeStatus: boolean;
  // Только на странице «Заявки дома» (председатель) — публикация мастерам (marketplace.md).
  marketplace?: { listing: ListingView | null; offers: OfferView[] };
}) {
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
                  {m.authorUserId === request.authorUserId ? "Житель" : "Председатель"}
                </span>
                <div>{m.text}</div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3">
          <RequestMessageForm requestId={request.id} />
        </div>

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
