"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";

export function WithdrawOfferButton({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function withdraw() {
    setBusy(true);
    try {
      await postJson(`/api/master/offers/${offerId}/withdraw`, {});
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={withdraw}
      disabled={busy}
      data-testid="offer-withdraw"
      className="h-7 rounded-full text-xs text-muted-foreground"
    >
      Отозвать
    </Button>
  );
}
