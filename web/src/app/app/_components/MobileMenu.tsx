"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LogoutButton } from "../LogoutButton";
import { ThemeToggle } from "./ThemeToggle";
import { OsiSwitcher } from "./OsiSwitcher";
import { BuildingSwitcher } from "./BuildingSwitcher";
import { buildNavItems, isNavActive } from "./navItems";
import { FeatureCatalogSoonList } from "./FeatureCatalogSoonList";

// Мобильное меню-шторка (<lg): полная навигация + профиль + тема + выход + переключатели
// ОСИ/дома. Закрывает дыру мобильной версии: сайдбар на телефоне скрыт, а в таб-баре
// только 4 главных пункта. Триггер — кнопка-аватар в шапке (PageHeader).
export function MobileMenu({
  role,
  brandSubtitle,
  userName,
  userInitials,
  osiOptions,
  activeOsiId,
  buildings,
}: {
  role: "chairman" | "resident";
  brandSubtitle: string;
  userName: string;
  userInitials: string;
  osiOptions: { id: string; name: string }[];
  activeOsiId: string;
  buildings: { id: string; address: string }[];
}) {
  const pathname = usePathname();
  const buildingFromPath = pathname.match(/^\/app\/buildings\/([^/]+)/)?.[1];
  const items = buildNavItems(role, buildingFromPath ?? buildings[0]?.id);

  return (
    <Sheet>
      <SheetTrigger
        aria-label="Меню"
        data-testid="mobile-menu"
        className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-foreground lg:hidden"
      >
        <Menu aria-hidden size={19} />
      </SheetTrigger>
      <SheetContent side="right" className="w-[84%] max-w-xs bg-card">
        <SheetHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-primary-foreground ${
                role === "chairman" ? "bg-primary" : "bg-success"
              }`}
            >
              {userInitials}
            </span>
            <div className="min-w-0">
              <SheetTitle className="truncate text-[15px] font-bold">{userName}</SheetTitle>
              <p className="m-0 truncate text-xs text-muted-foreground">
                {role === "chairman" ? "Председатель" : "Житель"} · {brandSubtitle}
              </p>
            </div>
          </div>
          {(osiOptions.length > 1 || (role === "chairman" && buildings.length > 1)) && (
            <div className="mt-3 grid gap-2">
              {osiOptions.length > 1 && (
                <OsiSwitcher options={osiOptions} activeOsiId={activeOsiId} />
              )}
              {role === "chairman" && <BuildingSwitcher buildings={buildings} />}
            </div>
          )}
        </SheetHeader>

        <nav aria-label="Все разделы" className="grid gap-1 overflow-y-auto px-3">
          {items.map(({ href, label, icon: Icon, secondary }) => {
            const active = isNavActive(href, pathname);
            return (
              <SheetClose asChild key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] no-underline transition-colors ${
                    active
                      ? "bg-accent font-semibold text-accent-foreground"
                      : `font-medium text-muted-foreground ${secondary ? "text-sm" : ""}`
                  }`}
                >
                  <Icon aria-hidden size={19} />
                  {label}
                </Link>
              </SheetClose>
            );
          })}
          <FeatureCatalogSoonList />
        </nav>

        <div className="mt-auto flex items-center justify-between border-t border-border p-4">
          <span className="text-sm text-muted-foreground">Тема и выход</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
