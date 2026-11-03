import { getCurrentAuth } from "@/lib/auth/session";
import { getShellContext } from "@/lib/auth/shell";
import { getUnreadCount } from "@/lib/notifications/service";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { MobileMenu } from "./MobileMenu";
import { NotificationBell } from "./NotificationBell";


import { GlobalSearch } from "./GlobalSearch";

// Шапка страницы по макету: 76px на lg+ (title+subtitle слева; actions, поиск,
// колокольчик справа), компактная на мобиле + кнопка-аватар меню-шторки (<lg).
// Server component: контекст шелла и unread берёт сам (React cache — один запрос на рендер).
export async function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  const [auth, shell] = await Promise.all([getCurrentAuth(), getShellContext()]);
  const unread =
    auth && shell ? await getUnreadCount(shell.activeOsiId, auth.user.id) : 0;

  return (
    <header className="border-b border-border bg-card">
      <div className="flex min-h-16 items-center justify-between gap-3 px-5 py-3 lg:h-[76px] lg:px-7 lg:py-0">
        <div className="min-w-0">
          {back && (
            <Link
              href={back.href}
              className="mb-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground no-underline"
            >
              <ArrowLeft aria-hidden size={12} /> {back.label}
            </Link>
          )}
          <h1 className="m-0 truncate text-lg font-extrabold tracking-tight lg:text-xl">{title}</h1>
          {subtitle && <p className="m-0 truncate text-[13px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="hidden md:block">
            <GlobalSearch />
          </div>
          {actions}
          {shell && <NotificationBell initialUnread={unread} />}
          {shell && (
            <MobileMenu
              role={shell.role}
              brandSubtitle={shell.brandSubtitle}
              userName={shell.userName}
              userInitials={shell.initials}
              osiOptions={shell.osiOptions}
              activeOsiId={shell.activeOsiId}
              buildings={shell.buildings}
            />
          )}
        </div>
      </div>
    </header>
  );
}

// Контентная область под шапкой: паддинги по макету, отступ под мобильный таб-бар.
export function PageBody({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`${wide ? "max-w-6xl" : "max-w-3xl"} px-5 pb-24 pt-5 lg:px-7 lg:pb-10 lg:pt-7`}>
      {children}
    </div>
  );
}
