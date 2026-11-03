"use client";

import { MessageSquare, Phone, Send, Star } from "lucide-react";

interface MasterInfo {
  id: string;
  fullName: string;
  phone: string;
  whatsapp?: string | null;
  telegram?: string | null;
  experienceYears: number;
  photoUrl?: string | null;
  avgRating: number;
}

export function AssignedMasterCard({ master }: { master: MasterInfo }) {
  const waClean = master.whatsapp?.replace(/[^0-9]/g, "");
  const waLink = waClean ? `https://wa.me/${waClean}` : null;
  const tgClean = master.telegram?.replace("@", "");
  const tgLink = tgClean ? `https://t.me/${tgClean}` : null;

  return (
    <div className="w-full rounded-2xl border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10 p-4 shadow-sm">
      <div className="flex items-start gap-3.5">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
          {master.photoUrl ? (
            <img src={master.photoUrl} alt={master.fullName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-bold text-emerald-600 bg-emerald-500/10">
              {master.fullName[0]}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="m-0 font-bold text-sm text-foreground truncate">{master.fullName}</h4>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
              <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
              {master.avgRating.toFixed(1)}
            </span>
          </div>

          <p className="m-0 mt-0.5 text-xs text-muted-foreground">
            Стаж {master.experienceYears} г. • Назначенный мастер
          </p>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            )}

            {tgLink && (
              <a
                href={tgLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-600 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                Telegram
              </a>
            )}

            <a
              href={`tel:${master.phone}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              Позвонить
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}