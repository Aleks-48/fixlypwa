import Link from "next/link";

export function CabinetNavigation({ current, homeLabel }: {
  current: "home" | "master";
  homeLabel: string;
}) {
  return (
    <nav aria-label="Выбор кабинета" className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2">
      {([
        { key: "home", href: "/app", label: homeLabel },
        { key: "master", href: "/master", label: "Кабинет мастера" },
      ] as const).map(item => (
        <Link key={item.key} href={item.href} aria-current={current === item.key ? "page" : undefined}
          className={`rounded-xl px-4 py-2 text-sm font-semibold no-underline ${current === item.key ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
