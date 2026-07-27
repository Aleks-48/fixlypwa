import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireSuperadminPage } from "@/lib/auth/adminPage";
import { LogoutButton } from "../app/LogoutButton";
import { ThemeToggle } from "../app/_components/ThemeToggle";

export const dynamic = "force-dynamic";

// Шелл админки платформы (ADR-0008, admin-panel.md). САМОСТОЯТЕЛЬНЫЙ — не AppShell/AppSidebar
// (те типизированы под chairman|resident). Desktop-first: пользуемся только мы.
// Гейт дублируется в каждой page (client-навигация рендерит page без layout) — здесь он
// закрывает первый заход и даёт auth для шапки (getCurrentAuth за React cache — 1 запрос).
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const auth = await requireSuperadminPage();

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-5 pb-16 pt-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck aria-hidden size={20} />
          </span>
          <div>
            <p className="m-0 text-base font-extrabold leading-tight">Дом · Админка</p>
            <p className="m-0 text-xs text-muted-foreground" data-testid="me">
              {auth.user.email ?? auth.user.phone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <nav className="mb-6 flex flex-wrap gap-1.5">
        <Link
          href="/admin"
          className="rounded-full border border-border px-3.5 py-1.5 text-sm font-semibold hover:bg-secondary"
        >
          Дашборд
        </Link>
        <Link
          href="/admin/masters"
          data-testid="admin-nav-masters"
          className="rounded-full border border-border px-3.5 py-1.5 text-sm font-semibold hover:bg-secondary"
        >
          Мастера
        </Link>
        <Link
          href="/admin/osi"
          data-testid="admin-nav-osi"
          className="rounded-full border border-border px-3.5 py-1.5 text-sm font-semibold hover:bg-secondary"
        >
          ОСИ
        </Link>
        <Link
          href="/admin/users"
          data-testid="admin-nav-users"
          className="rounded-full border border-border px-3.5 py-1.5 text-sm font-semibold hover:bg-secondary"
        >
          Пользователи
        </Link>
        <Link
          href="/admin/buildings"
          data-testid="admin-nav-buildings"
          className="rounded-full border border-border px-3.5 py-1.5 text-sm font-semibold hover:bg-secondary"
        >
          Дома/Квартиры
        </Link>
        <Link
          href="/admin/requests"
          data-testid="admin-nav-requests"
          className="rounded-full border border-border px-3.5 py-1.5 text-sm font-semibold hover:bg-secondary"
        >
          Заявки
        </Link>
        <Link
          href="/admin/announcements"
          data-testid="admin-nav-announcements"
          className="rounded-full border border-border px-3.5 py-1.5 text-sm font-semibold hover:bg-secondary"
        >
          Объявления
        </Link>
      </nav>

      {children}
    </main>
  );
}
