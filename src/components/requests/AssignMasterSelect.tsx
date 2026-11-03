"use client";

import { useState } from "react";
import { RequestCategory } from "@prisma/client";
import { UserCheck } from "lucide-react";
import { assignMasterToRequest } from "@/app/actions/masters";

export interface MasterOption {
  id: string;
  fullName: string;
  specialties: RequestCategory[];
  experienceYears: number;
  avgRating: number;
}

interface AssignMasterSelectProps {
  requestId: string;
  category: RequestCategory;
  masters: MasterOption[];
  currentMasterId?: string | null;
}

export function AssignMasterSelect({
  requestId,
  category,
  masters,
  currentMasterId,
}: AssignMasterSelectProps) {
  const [selectedId, setSelectedId] = useState(currentMasterId || "");
  const [loading, setLoading] = useState(false);

  // Сортировка: сначала мастера, чья специализация совпадает с категорией заявки
  const sortedMasters = [...masters].sort((a, b) => {
    const aMatch = a.specialties.includes(category);
    const bMatch = b.specialties.includes(category);
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const masterId = e.target.value;
    setSelectedId(masterId);
    if (!masterId) return;

    setLoading(true);
    try {
      await assignMasterToRequest(requestId, masterId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full max-w-xs">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
        Назначить исполнителя
      </label>
      <select
        value={selectedId}
        onChange={handleChange}
        disabled={loading}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 cursor-pointer"
      >
        <option value="">-- Выберите мастера --</option>

        <optgroup label="🟢 Подходят по профилю">
          {sortedMasters
            .filter((m) => m.specialties.includes(category))
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName} • ★ {m.avgRating.toFixed(1)} ({m.experienceYears} г.)
              </option>
            ))}
        </optgroup>

        <optgroup label="⚪ Другие мастера">
          {sortedMasters
            .filter((m) => !m.specialties.includes(category))
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
        </optgroup>
      </select>
    </div>
  );
}