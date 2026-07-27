import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { getShellContext } from "@/lib/auth/shell";
import { AppShell } from "./_components/AppShell";
import { AppSidebar } from "./_components/AppSidebar";
import { MobileTabBar } from "./_components/MobileTabBar";

// Общий каркас кабинета (ui-redesign.md §2): role-aware сайдбар (lg+) + мобильный таб-бар.
// Права на данные проверяет КАЖДАЯ страница (requireMember/activeChairmanOsi) — layout
// отвечает только за хром; данные шелла — через getShellContext (React cache, 1 раз на запрос).
export default async function AppLayout({ children }: { children: ReactNode }) {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");

  const shell = await getShellContext();
  // Нет ОСИ (онбординг нового пользователя) — без сайдбара и таб-бара.
  if (!shell) return <>{children}</>;

  return (
    <>
      <AppShell
        sidebar={
          <AppSidebar
            role={shell.role}
            brandSubtitle={shell.brandSubtitle}
            userName={shell.userName}
            userInitials={shell.initials}
            osiOptions={shell.osiOptions}
            activeOsiId={shell.activeOsiId}
            buildings={shell.buildings}
          />
        }
      >
        {children}
      </AppShell>
      <MobileTabBar role={shell.role} buildingId={shell.buildings[0]?.id} />
    </>
  );
}
