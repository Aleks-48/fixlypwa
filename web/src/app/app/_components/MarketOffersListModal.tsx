"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog,DialogContent,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import type { OfferWithMaster } from "@/lib/market/service";
import { CheckCircle2,Loader2,Phone,UserCheck } from "lucide-react";
import { useEffect,useState } from "react";

interface MarketOffersListModalProps {
  listingId: string;
  isOpen: boolean;
  onClose: () => void;
  onOfferAccepted?: () => void;
}

export function MarketOffersListModal({
  listingId,
  isOpen,
  onClose,
  onOfferAccepted,
}: MarketOffersListModalProps) {
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<OfferWithMaster[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/market/listings/${listingId}/offers`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить отклики");
      setOffers(data);
    } catch (caughtError) {
const err = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && listingId) {
      fetchOffers();
    }
  }, [isOpen, listingId]);

  const handleAccept = async (offerId: string) => {
    setAcceptingId(offerId);
    try {
      const res = await fetch(`/api/market/offers/${offerId}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка при принятии отклика");

      await fetchOffers();
      onOfferAccepted?.();
    } catch (caughtError) {
const err = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

      alert(err.message);
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <DialogTitle className="text-base font-bold">
              Отклики мастеров на заявку
            </DialogTitle>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs">Загрузка откликов...</span>
          </div>
        ) : error ? (
          <p className="text-xs text-destructive p-3">{error}</p>
        ) : offers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Откликов от мастеров пока нет.
          </p>
        ) : (
          <div className="space-y-3 pt-2 max-h-[60vh] overflow-y-auto pr-1">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                  offer.status === "ACCEPTED"
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="size-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      {offer.master.fullName[0]}
                    </div>
                    <div>
                      <h4 className="m-0 font-bold text-sm flex items-center gap-1">
                        {offer.master.fullName}
                        <CheckCircle2 size={14} className="text-primary" />
                      </h4>
                      <p className="m-0 text-[11px] text-muted-foreground">
                        {offer.master.city}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {offer.price && (
                      <span className="font-bold text-sm text-primary block">
                        {Number(offer.price).toLocaleString("ru-RU")} ₸
                      </span>
                    )}
                    <Badge
                      variant={offer.status === "ACCEPTED" ? "default" : "secondary"}
                      className={`text-[10px] ${
                        offer.status === "ACCEPTED" ? "bg-emerald-600 text-white" : ""
                      }`}
                    >
                      {offer.status === "ACCEPTED" ? "Принят" : "Откликнулся"}
                    </Badge>
                  </div>
                </div>

                <p className="text-xs text-foreground bg-muted/30 p-2.5 rounded-lg whitespace-pre-wrap">
                  {offer.message}
                </p>

                {offer.status === "ACCEPTED" && offer.master.phone && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 block">
                        Телефон мастера:
                      </span>
                      <span className="font-bold text-sm">{offer.master.phone}</span>
                    </div>
                    <a
                      href={`tel:${offer.master.phone}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700"
                    >
                      <Phone size={13} /> Звонок
                    </a>
                  </div>
                )}

                {offer.status !== "ACCEPTED" && (
                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(offer.id)}
                      disabled={acceptingId === offer.id}
                      className="rounded-xl text-xs gap-1"
                    >
                      {acceptingId === offer.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Принять отклик
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
