"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Megaphone, Phone } from "lucide-react";
import { postJson } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type OfferView = {
  id: string;
  message: string;
  price: string | null;
  status: string;
  master: { fullName: string; city: string; phone: string | null };
};

export type ListingView = {
  id: string;
  status: "PUBLISHED" | "TAKEN" | "CLOSED";
  title: string;
  description: string;
  photoUrls: string[];
};

// Публикация заявки мастерам + управление откликами (REQ-063..066, marketplace.md). Рендерится
// в RequestCard ТОЛЬКО председателю (canChangeStatus) — видимость данных не меняет, это чисто
// UI-слой поверх приватного сервиса market/service.ts.
export function MarketplacePanel({
  requestId,
  defaultTitle,
  defaultDescription,
  defaultPhotoUrls,
  listing,
  offers,
}: {
  requestId: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultPhotoUrls: string[];
  listing: ListingView | null;
  offers: OfferView[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(listing?.title ?? defaultTitle);
  const [description, setDescription] = useState(listing?.description ?? defaultDescription);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>(
    listing?.photoUrls ?? defaultPhotoUrls,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function togglePhoto(url: string) {
    setSelectedPhotos((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]));
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await postJson("/api/market/listings", {
        requestId,
        title,
        description,
        photoUrls: selectedPhotos,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    if (!listing) return;
    setBusy(true);
    try {
      await postJson(`/api/market/listings/${listing.id}/unpublish`, {});
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function accept(offerId: string) {
    setBusy(true);
    try {
      await postJson(`/api/market/offers/${offerId}/accept`, {});
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const publishDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="publish-to-market"
          className="h-8 gap-1.5 rounded-full text-xs"
        >
          <Megaphone aria-hidden size={13} />
          Опубликовать мастерам
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Публикация мастерам</DialogTitle>
        </DialogHeader>
        <form onSubmit={publish} className="grid gap-3.5">
          <p className="m-0 text-xs text-muted-foreground">
            Проверенные мастера вашего города увидят это описание и фото. Точная квартира и
            контакт жителя откроются только тому мастеру, чей отклик вы примете.
          </p>
          <div className="grid gap-1.5">
            <Label htmlFor="mkt-title">Заголовок для мастеров</Label>
            <Input
              id="mkt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              data-testid="market-title"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mkt-desc">Описание</Label>
            <Textarea
              id="mkt-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              data-testid="market-description"
            />
          </div>
          {defaultPhotoUrls.length > 0 && (
            <div className="grid gap-1.5">
              <Label>Фото (нажмите, чтобы включить/исключить)</Label>
              <div className="flex flex-wrap gap-2">
                {defaultPhotoUrls.map((url, i) => {
                  const active = selectedPhotos.includes(url);
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => togglePhoto(url)}
                      data-testid={`market-photo-${i}`}
                      className={`relative size-16 overflow-hidden rounded-lg border-2 ${
                        active ? "border-primary" : "border-border opacity-50"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="size-full object-cover" />
                      {active && (
                        <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check aria-hidden size={10} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={busy} data-testid="market-publish-submit">
              {busy ? "Публикуем…" : "Опубликовать"}
            </Button>
          </DialogFooter>
          {error && (
            <p role="alert" className="m-0 text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );

  if (!listing || listing.status === "CLOSED") {
    return <div className="mt-3">{publishDialog}</div>;
  }

  if (listing.status === "PUBLISHED") {
    return (
      <div className="mt-3 rounded-xl border border-border bg-secondary/60 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span
            data-testid="market-status-published"
            className="flex items-center gap-1.5 text-xs font-bold text-primary"
          >
            <Megaphone aria-hidden size={13} />
            Опубликовано мастерам
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={unpublish}
            disabled={busy}
            data-testid="market-unpublish"
            className="h-7 rounded-full text-xs text-muted-foreground"
          >
            Снять с публикации
          </Button>
        </div>
        {offers.length === 0 ? (
          <p className="m-0 text-xs text-muted-foreground">Пока нет откликов.</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {offers.map((o) => (
              <li
                key={o.id}
                data-testid="offer-row"
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="m-0 text-sm font-semibold">
                    {o.master.fullName} · {o.master.city}
                    {o.price && <span className="text-muted-foreground"> · ₸ {o.price}</span>}
                  </p>
                  <p className="m-0 text-xs text-muted-foreground">{o.message}</p>
                </div>
                {o.status === "OFFERED" ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => accept(o.id)}
                    disabled={busy}
                    data-testid="offer-accept"
                    className="h-7 shrink-0 rounded-full text-xs"
                  >
                    Принять
                  </Button>
                ) : (
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                    Отклонён
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // TAKEN — показываем принятого мастера с контактом.
  const accepted = offers.find((o) => o.status === "ACCEPTED");
  return (
    <div className="mt-3 rounded-xl border border-success/30 bg-success-soft p-3" data-testid="market-status-taken">
      <p className="m-0 flex items-center gap-1.5 text-xs font-bold text-success">
        <CheckCircle2 aria-hidden size={13} />
        Мастер найден
      </p>
      {accepted && (
        <p className="m-0 mt-1 flex items-center gap-1.5 text-sm">
          <span className="font-semibold">{accepted.master.fullName}</span>
          {accepted.master.phone && (
            <a href={`tel:${accepted.master.phone}`} className="flex items-center gap-1 text-primary no-underline">
              <Phone aria-hidden size={12} />
              {accepted.master.phone}
            </a>
          )}
        </p>
      )}
    </div>
  );
}
