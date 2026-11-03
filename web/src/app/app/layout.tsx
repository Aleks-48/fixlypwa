import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { getShellContext } from "@/lib/auth/shell";
import { isAssistantEnabled } from "@/lib/assistant/providers";
import { AppShell } from "./_components/AppShell";
import { AppSidebar } from "./_components/AppSidebar";
import { MobileTabBar } from "./_components/MobileTabBar";
import { AssistantChat } from "./_components/AssistantChat";
import { getMasterByUserId } from "@/lib/master/service";
import { CabinetNavigation } from "@/components/CabinetNavigation";

import { PwaInstallPrompt } from "./_components/PwaInstallPrompt";

// Общий каркас кабинета (ui-redesign.md §2): role-aware сайдбар (lg+) + мобильный таб-бар.
// Права на данные проверяет КАЖДАЯ страница (requireMember/activeChairmanOsi) — layout
// отвечает только за хром; данные шелла — через getShellContext (React cache, 1 раз на запрос).
export default async function AppLayout({ children }: { children: ReactNode }) {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");

  const shell = await getShellContext();
  // Нет ОСИ (онбординг нового пользователя) — без сайдбара и таб-бара.
  if (!shell) return <>{children}</>;
  const master = await getMasterByUserId(auth.user.id);

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
        {master && <div className="px-4 pt-4 sm:px-6"><CabinetNavigation current="home" homeLabel={shell.role === "chairman" ? "Кабинет председателя" : "Кабинет жителя"} /></div>}
        {children}
      </AppShell>
      <MobileTabBar role={shell.role} buildingId={shell.buildings[0]?.id} />
      <PwaInstallPrompt />
      {isAssistantEnabled() && <AssistantChat role={shell.role} />}
    </>
  );
}
