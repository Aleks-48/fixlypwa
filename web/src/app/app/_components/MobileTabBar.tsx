"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutDashboard, Vote, Wallet } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

// Нижний таб-бар (<lg) по макету, role-aware (ui-redesign.md §3).
export function MobileTabBar({
  role,
  buildingId,
}: {
  role: "chairman" | "resident";
  buildingId?: string;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const base = buildingId ? `/app/buildings/${buildingId}` : null;

  const tabs =
    role === "resident"
      ? ([
          { href: "/app", labelKey: "nav_dashboard", label: "Главная", icon: LayoutDashboard, testid: "tab-home" },
          { href: "/app/polls", labelKey: "nav_polls", label: "Голоса", icon: Vote, testid: "tab-polls" },
          { href: "/app/requests", labelKey: "nav_requests", label: "Заявки", icon: ClipboardList, testid: "tab-requests" },
          { href: "/app/payments", labelKey: "nav_payments", label: "Финансы", icon: Wallet, testid: "tab-payments" },
        ] as const)
      : ([
          { href: "/app", labelKey: "nav_dashboard", label: "Главная", icon: LayoutDashboard, testid: "tab-home" },
          { href: base ? `${base}/polls` : "/app", labelKey: "nav_polls", label: "Голоса", icon: Vote, testid: "tab-polls" },
          {
            href: base ? `${base}/requests` : "/app",
            labelKey: "nav_requests_chairman",
            label: "Заявки",
            icon: ClipboardList,
            testid: "tab-requests",
          },
          {
            href: base ? `${base}/finance` : "/app",
            labelKey: "nav_payments",
            label: "Финансы",
            icon: Wallet,
            testid: "tab-finance",
          },
        ] as const);

  return (
    <nav
      aria-label={t("nav_sections_aria")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-xl">
        {tabs.map(({ href, labelKey, label, icon: Icon, testid }) => {
          const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
          return (
            <Link
              key={testid}
              href={href}
              data-testid={testid}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] no-underline transition-colors ${
                active ? "font-semibold text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon aria-hidden size={19} />
              {t(labelKey) || label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
