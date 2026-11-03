"use client";

import { useState, useEffect } from "react";
import { Camera, Send, MessageCircle } from "lucide-react";
import {
  GARBAGE_ISSUE_TYPES,
  type GarbageIssueType,
  type CityData,
} from "../../../lib/complaints/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function GarbageComplaintForm({ city }: { city: CityData }) {
  const [address, setAddress] = useState(city.name);
  const [issueType, setIssueType] = useState(GARBAGE_ISSUE_TYPES[0]?.id || "OVERFLOW");
  const [comment, setComment] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);

  useEffect(() => {
    setAddress(city.name);
  }, [city]);

  const handleSendToIkomek = () => {
    const issueLabel =
      GARBAGE_ISSUE_TYPES.find((i: GarbageIssueType) => i.id === issueType)?.label || "";
    const text = `Здравствуйте! Просьба зафиксировать нарушение и наложить штраф на компанию по вывозу мусора.\n\nГород / Адрес: ${address}\nПроблема: ${issueLabel}\nКомментарий: ${comment || "Нет"}`;

    const url = `https://wa.me/${city.ikomekWhatsapp}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm text-card-foreground"
    >
      <h3 className="font-semibold text-base">Сообщить о невывозе мусора</h3>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Адрес контейнерной площадки
        </label>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Улица, дом..."
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Характер нарушения
        </label>
        <select
          value={issueType}
          onChange={(e) => setIssueType(e.target.value)}
          className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          {GARBAGE_ISSUE_TYPES.map((t: GarbageIssueType) => (
            <option
              key={t.id}
              value={t.id}
              className="bg-card text-card-foreground dark:bg-zinc-900 dark:text-zinc-100"
            >
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Комментарий
        </label>
        <Input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Например: баки стоят полные 3 дня..."
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Прикрепить фото контейнеров
        </label>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input px-3 py-2 text-xs hover:bg-muted">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <span>{photoName || "Загрузить фото"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setPhotoName(e.target.files?.[0]?.name || null)}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          type="button"
          onClick={handleSendToIkomek}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs"
        >
          <MessageCircle className="h-4 w-4" />
          Отправить в iKomek 109 (WhatsApp)
        </Button>

        <Button type="submit" variant="secondary" className="gap-2 text-xs">
          <Send className="h-4 w-4" />
          Заявка в ОСИ
        </Button>
      </div>
    </form>
  );
}