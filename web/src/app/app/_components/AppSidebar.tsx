"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "../LogoutButton";
import { BuildingSwitcher } from "./BuildingSwitcher";
import { FeatureCatalogSoonList } from "./FeatureCatalogSoonList";
import { buildNavItems,isNavActive } from "./navItems";
import { OsiSwitcher } from "./OsiSwitcher";
import { ThemeToggle } from "./ThemeToggle";

export type SidebarProps = {
  role: "chairman" | "resident";
  brandSubtitle: string;
  userName: string;
  userInitials: string;
  osiOptions: { id: string; name: string }[];
  activeOsiId: string;
  buildings: { id: string; address: string }[]; // председатель; у жителя пусто
};

// Сайдбар кабинета по макету (ui-redesign.md §2–3): брендблок, навигация (общий список с
// мобильным меню — navItems.ts), user-card внизу. Права проверяются на сервере в страницах.
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "./LanguageToggle";

export function AppSidebar({
  role,
  brandSubtitle,
  userName,
  userInitials,
  osiOptions,
  activeOsiId,
  buildings,
}: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();

  // Активный дом председателя: из пути, иначе первый (для ссылок разделов).
  const buildingFromPath = pathname.match(/^\/app\/buildings\/([^/]+)/)?.[1];
  const items = buildNavItems(role, buildingFromPath ?? buildings[0]?.id);

  return (
    <div className="flex h-full flex-col p-4">
      <div className="px-2 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Building2 aria-hidden size={20} />
            </span>
            <div className="min-w-0">
              <p className="m-0 text-base font-extrabold leading-tight">Fixly</p>
              <p className="m-0 truncate text-xs text-muted-foreground">{brandSubtitle}</p>
            </div>
          </div>
        </div>
        {osiOptions.length > 1 && (
          <div className="mt-2">
            <OsiSwitcher options={osiOptions} activeOsiId={activeOsiId} />
          </div>
        )}
        {role === "chairman" && <BuildingSwitcher buildings={buildings} />}
      </div>

      <nav aria-label={t("nav_sections_aria")} className="flex flex-col gap-1">
        {items.map(({ href, labelKey, label, icon: Icon, secondary }) => {
          const active = isNavActive(href, pathname);
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
              {t(labelKey) || label}
            </Link>
          );
        })}

        <FeatureCatalogSoonList />
      </nav>

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
              {role === "chairman" ? t("role_chairman") : t("role_resident")}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between px-1 pt-1">
          <LanguageToggle />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
