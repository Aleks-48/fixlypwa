"use client";

import { useState, useEffect, useCallback } from "react";
import type { RequestCategory } from "@prisma/client";

interface MasterOption {
  id: string;
  fullName: string;
  shortName: string;
  categories: RequestCategory[];
  rating: number;
  reviewsCount: number;
  phone: string | null;
}

interface MasterSelectProps {
  requestId: string;
  currentMasterId?: string | null;
  category?: RequestCategory;
  onAssigned?: (masterId: string | null) => void;
}

export function MasterSelect({
  requestId,
  currentMasterId,
  category,
  onAssigned,
}: MasterSelectProps) {
  const [masters, setMasters] = useState<MasterOption[]>([]);
  const [selected, setSelected] = useState<string | null>(
    currentMasterId ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadMasters = useCallback(async () => {
    setLoading(true);
    try {
      const params = category ? `?category=${category}` : "";
      const res = await fetch(`/api/masters${params}`);
      if (res.ok) {
        const data = await res.json();
        setMasters(data);
      }
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  const handleChange = async (masterId: string | null) => {
    setSelected(masterId);
    setSaving(true);
    try {
      await fetch("/api/masters/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, masterId }),
      });
      onAssigned?.(masterId);
    } finally {
      setSaving(false);
    }
  };

  const currentMaster = masters.find((m) => m.id === selected);

  return (
    <div className="master-select">
      <label className="master-select__label">
        {saving ? "Сохранение..." : "Мастер"}
      </label>
      <select
        className="master-select__dropdown"
        value={selected ?? ""}
        onChange={(e) => handleChange(e.target.value || null)}
        disabled={loading || saving}
      >
        <option value="">— не назначен —</option>
        {masters.map((m) => (
          <option key={m.id} value={m.id}>
            {m.shortName}
            {m.categories[0] ? ` • ${categoryLabel(m.categories[0])}` : ""}
            {m.reviewsCount > 0
              ? ` • ★ ${m.rating.toFixed(1)} (${m.reviewsCount})`
              : ""}
          </option>
        ))}
      </select>

      {/* Быстрые контакты назначенного мастера */}
      {currentMaster?.phone && (
        <div className="master-select__contacts">
          <a
            href={`tel:${currentMaster.phone}`}
            className="master-select__contact-link"
            title="Позвонить"
          >
            📞 {currentMaster.phone}
          </a>
          <a
            href={`https://wa.me/${currentMaster.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="master-select__contact-link"
            title="WhatsApp"
          >
            WhatsApp
          </a>
          <a
            href={`https://t.me/+${currentMaster.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="master-select__contact-link"
            title="Telegram"
          >
            Telegram
          </a>
        </div>
      )}
    </div>
  );
}

function categoryLabel(cat: RequestCategory): string {
  const MAP: Record<RequestCategory, string> = {
    PLUMBING: "Сантехник",
    ELEVATOR: "Лифт",
    CLEANING: "Уборка",
    ELECTRICITY: "Электрик",
    OTHER: "Прочее",
  };
  return MAP[cat] ?? cat;
}
