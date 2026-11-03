"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

interface AcceptOfferButtonProps {
  offerId: string;
}

export function AcceptOfferButton({ offerId }: AcceptOfferButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAccept = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market/offers/${offerId}/accept`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error?.message || "Не удалось принять отклик");
        return;
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Произошла ошибка при отправке запроса");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleAccept}
      disabled={loading}
      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Check className="w-3.5 h-3.5" />
      )}
      <span>{loading ? "Принятие..." : "Принять"}</span>
    </button>
  );
}