import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Ссылка «назад» — единый паттерн навигации внутри вложенных экранов дома/кабинета.
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground no-underline"
    >
      <ArrowLeft aria-hidden size={14} /> {label}
    </Link>
  );
}
