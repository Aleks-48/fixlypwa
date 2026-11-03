"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { KokshetauHotlines } from "@/app/app/_components/KokshetauHotlines";
import { GarbageComplaintForm } from "@/app/app/_components/GarbageComplaintForm";
import { CITIES_DATA, type CityData } from "@/lib/complaints/constants";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export function ComplaintsClient() {
  const { t } = useTranslation();
  const [selectedCityId, setSelectedCityId] = useState("kokshetau");

  const fallbackCity = CITIES_DATA["kokshetau"]!;
  const currentCity: CityData = CITIES_DATA[selectedCityId] ?? fallbackCity;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Селектор выбора города */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <MapPin className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <label className="text-xs font-medium text-muted-foreground block">
            {t("label_select_city")}
          </label>
          <select
            value={selectedCityId}
            onChange={(e) => setSelectedCityId(e.target.value)}
            className="w-full bg-transparent font-semibold text-sm focus:outline-none cursor-pointer text-foreground"
          >
            {Object.values(CITIES_DATA).map((city) => (
              <option
                key={city.id}
                value={city.id}
                className="bg-card text-card-foreground dark:bg-zinc-900 dark:text-zinc-100"
              >
                {city.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Горячие линии выбранного города */}
      <KokshetauHotlines city={currentCity} />

      {/* Форма жалобы */}
      <GarbageComplaintForm city={currentCity} />
    </div>
  );
}