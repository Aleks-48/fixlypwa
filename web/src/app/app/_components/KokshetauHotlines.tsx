"use client";

import { Phone, MessageCircle, AlertCircle } from "lucide-react";
import { type CityData, type HotlineContact } from "../../../lib/complaints/constants";

export function KokshetauHotlines({ city }: { city: CityData }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
        <AlertCircle className="h-4 w-4" />
        Горячие линии ({city.name}) — Вывоз мусора и ТБО
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {city.hotlines.map((item: HotlineContact) => (
          <div
            key={item.id}
            className={`flex flex-col justify-between rounded-xl border p-3.5 shadow-sm transition-colors ${
              item.isPrimary
                ? "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20"
                : "border-border bg-card"
            }`}
          >
            <div>
              <div className="font-semibold text-sm">{item.title}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <a
                href={`tel:${item.phone}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                <Phone className="h-3.5 w-3.5" />
                {item.phone}
              </a>

              {item.whatsapp && (
                <a
                  href={`https://wa.me/${item.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-emerald-700"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp 109
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}