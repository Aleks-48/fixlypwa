"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Settings } from "lucide-react";
import { LogoutButton } from "../LogoutButton";
import { ThemeToggle } from "./ThemeToggle";
import { OsiSwitcher } from "./OsiSwitcher";
import { BuildingSwitcher } from "./BuildingSwitcher";
import { buildNavItems, isNavActive } from "./navItems";

export type SidebarProps = {
  role: "chairman" | "resident";
  brandSubtitle: string;
  userName: string;
  userInitials: string;
  osiOptions: { id: string; name: string }[];
  activeOsiId: string;
  buildings: { id: string; address: string }[];
};

export function AppSidebar({
  role,
  brandSubtitle,
  userName,
  userInitials,
  osiOptions,
  activeOsiId,
  buildings = [],
}: SidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Вычисление пути и ссылок навигации
  const currentPath = pathname ?? "";
  const buildingFromPath = currentPath.match(/^\/app\/buildings\/([^/]+)/)?.[1];
  const defaultBuildingId = buildings?.[0]?.id;
  const activeBuildingId = buildingFromPath ?? defaultBuildingId;
  const items = buildNavItems(role, activeBuildingId);

  return (
    <div className="flex h-full flex-col p-4">
      {/* Шапка сайдбара */}
      <div className="px-2 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 aria-hidden size={20} />
          </span>
          <div className="min-w-0">
            <p className="m-0 text-base font-extrabold leading-tight">Дом</p>
            <p className="m-0 truncate text-xs text-muted-foreground">{brandSubtitle}</p>
          </div>
        </div>

        {/* Переключатели отрисовываются после монтирования для исключения расхождений */}
        {mounted && osiOptions.length > 1 && (
          <div className="mt-2">
            <OsiSwitcher options={osiOptions} activeOsiId={activeOsiId} />
          </div>
        )}
        {mounted && role === "chairman" && <BuildingSwitcher buildings={buildings} />}
      </div>

      {/* Навигационное меню */}
      <nav aria-label="Разделы кабинета" className="flex flex-1 flex-col gap-1">
        {!mounted ? (
          // 🛡️ Заглушка (скелетон) со сбережением высоты на секунду гидратации.
          // Исключает Hydration Error и предотвращает скачок/схлопывание интерфейса.
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-11 w-full animate-pulse rounded-xl bg-muted/40"
              aria-hidden
            />
          ))
        ) : (
          <>
            {items.map(({ href, label, icon: Icon, secondary }) => {
              const active = isNavActive(href, currentPath);

              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] no-underline transition-colors ${
                    active
                      ? "bg-accent font-semibold text-accent-foreground"
                      : `font-medium text-muted-foreground hover:bg-muted ${secondary ? "text-sm" : ""}`
                  }`}
                >
                  <Icon aria-hidden size={19} />
                  {label}
                </Link>
              );
            })}

            {role === "chairman" && (
              <span
                aria-disabled
                title="Раздел в разработке"
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-medium text-muted-foreground/50"
              >
                <Settings aria-hidden size={19} />
                Настройки
                <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">
                  скоро
                </span>
              </span>
            )}
          </>
        )}
      </nav>

      {/* Подвал с карточкой пользователя */}
      <div className="mt-auto grid gap-2">
        <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-primary-foreground ${
              role === "chairman" ? "bg-primary" : "bg-success"
            }`}
          >
            {userInitials}
          </span>
          <div className="min-w-0">
            <p className="m-0 truncate text-sm font-semibold">{userName}</p>
            <p className="m-0 text-xs text-muted-foreground">
              {role === "chairman" ? "Председатель" : "Житель"}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-1">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}