"use client";

import { Landmark } from "lucide-react";

// Список фич в разработке
// Если список станет пустым (length === 0), блок полностью скроется
const soonItems: { label: string }[] = [
  // { label: "Импорт банковской выписки" }, <-- УДАЛИТЕ ИЛИ ЗАКОММЕНТИРУЙТЕ ЭТУ СТРОКУ
];

export function FeatureCatalogSoonList() {
  if (soonItems.length === 0) {
    return null; // Не рендерим блок "Скоро", если нет нереализованных фич
  }

  return (
    <div className="mt-2 space-y-1 border-t border-border/40 pt-2">
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between px-3.5 py-1 text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground">
          <span>Скоро ({soonItems.length})</span>
          <span className="text-[10px] transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="mt-1 space-y-0.5">
          {soonItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs text-muted-foreground/50 opacity-60"
            >
              <Landmark className="size-4" />
              <span className="truncate">{item.label}</span>
              <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                скоро
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}