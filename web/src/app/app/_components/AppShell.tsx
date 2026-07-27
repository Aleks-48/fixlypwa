import type { ReactNode } from "react";

// Каркас кабинета (ui-redesign.md §2): фиксированный сайдбар 264px на lg+,
// контент со скроллом; мобильный таб-бар рендерится в layout рядом с шеллом.
export function AppShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-border bg-card lg:flex">
        {sidebar}
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
