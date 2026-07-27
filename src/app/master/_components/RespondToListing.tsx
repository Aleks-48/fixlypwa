"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

// Отклик мастера на заказ (REQ-065) — сообщение + необязательная ориентировочная цена.
export function RespondToListing({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await postJson(`/api/master/listings/${listingId}/offers`, {
        message,
        price: price ? Number(price) : undefined,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" data-testid="respond-to-listing" className="h-8 rounded-full text-xs">
          Откликнуться
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Отклик на заказ</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3.5">
          <div className="grid gap-1.5">
            <Label htmlFor="offer-message">Сообщение</Label>
            <Textarea
              id="offer-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={3}
              placeholder="Могу подъехать сегодня после 18:00…"
              data-testid="offer-message"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="offer-price">Ориентировочная цена, ₸ (необязательно)</Label>
            <Input
              id="offer-price"
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              data-testid="offer-price"
              className="h-11 rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} data-testid="offer-submit">
              {busy ? "Отправляем…" : "Отправить отклик"}
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
}
