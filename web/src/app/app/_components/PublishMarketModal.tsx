"use client";

import { Button } from "@/components/ui/button";
import { Dialog,DialogContent,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2,Loader2,Store } from "lucide-react";
import { useState } from "react";

interface PublishMarketModalProps {
  requestId: string;
  initialTitle: string;
  initialDescription: string;
  initialPhotoUrls: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PublishMarketModal({
  requestId,
  initialTitle,
  initialDescription,
  initialPhotoUrls,
  isOpen,
  onClose,
  onSuccess,
}: PublishMarketModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Заполните заголовок и описание");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/market/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          title,
          description,
          photoUrls: initialPhotoUrls,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось опубликовать заявку");

      onSuccess();
      onClose();
    } catch (caughtError) {
const err = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <DialogTitle className="text-base font-bold">
              Опубликовать на витрине мастеров
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handlePublish} className="space-y-4 pt-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Заголовок заказа (без ПДн)
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-border bg-background p-2.5 text-sm outline-none focus:border-primary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Ремонт смесителя в подвале"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Описание работ для мастеров
            </label>
            <textarea
              className="w-full rounded-xl border border-border bg-background p-2.5 text-sm outline-none focus:border-primary"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Укажите объём работ..."
            />
          </div>

          {initialPhotoUrls.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Прикреплённые фото ({initialPhotoUrls.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {initialPhotoUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt="Фото заявки"
                    className="size-12 rounded-lg border border-border object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Защита персональных данных
            </p>
            <p className="m-0">
              Мастера города увидят только улицу и описание проблемы. Номер квартиры и контакты раскроются только после принятия вами отклика.
            </p>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Отмена
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl gap-1.5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
              Опубликовать
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
