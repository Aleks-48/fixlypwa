import Link from "next/link";
import { Home, Wrench, FileText, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/app/app/_components/ThemeToggle";

// Лендинг (срез 11, дизайн-система shadcn). Ценность: удобство — меньше нагрузки на
// председателя, меньше головной боли жителей (vision.md, features.md §0). Осознанно
// дружелюбнее и проще Управдома (competitors.md: «много беготни» — главная жалоба).
const FEATURES: [typeof Home, string][] = [
  [Home, "Объявления с отметками о прочтении"],
  [Wrench, "Заявки со статусом и перепиской"],
  [FileText, "Автоотчёт по официальной форме"],
  [Vote, "Юридически значимые голосования и кворум"],
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-xl px-5 pb-16 pt-12">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <p className="m-0 text-sm font-semibold tracking-wide text-primary">ОСИ · Кокшетау</p>
          <ThemeToggle />
        </div>
        <h1 className="m-0 mt-2 text-3xl font-bold leading-tight text-balance">
          Управление домом без беготни
        </h1>
        <p className="mt-3 text-muted-foreground">
          Объявления, заявки, юридические голосования, начисления и отчёты — в одном приложении. Меньше звонков
          председателю, прозрачно для жителей.
        </p>
      </header>

      <nav aria-label="Основные действия" className="grid gap-3">
        <Button asChild size="lg" className="h-13 rounded-2xl text-base">
          <Link href="/app" data-testid="cta-login">
            Войти в кабинет
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-13 rounded-2xl text-base">
          <Link href="/app" data-testid="cta-register">
            Демо-доступ / Регистрация
          </Link>
        </Button>
      </nav>

      <section className="mt-10 grid gap-3">
        {FEATURES.map(([Icon, text]) => (
          <div
            key={text}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Icon aria-hidden size={18} />
            </span>
            <span className="text-sm">{text}</span>
          </div>
        ))}
      </section>

      <footer className="mt-10 text-sm text-muted-foreground">
        <p>Данные хранятся на территории Казахстана.</p>
      </footer>
    </main>
  );
}