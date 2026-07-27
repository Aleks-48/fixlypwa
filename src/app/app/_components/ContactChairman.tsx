import Link from "next/link";
import { MessageSquarePlus, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// «Связаться с председателем» (заметки п.8): обращение = обычная заявка категории «Другое»
// (тред уже есть — новых таблиц не нужно) + контакты из инфо-раздела (CHAIRMAN_CONTACTS).
export function ContactChairman({
  contacts,
}: {
  contacts: { title: string; content: string }[];
}) {
  return (
    <Card className="rounded-2xl shadow-sm" data-testid="contact-chairman">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <MessageSquarePlus aria-hidden size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <strong className="text-sm font-bold">Связаться с председателем</strong>
            {contacts.length > 0 ? (
              <ul className="m-0 mt-1 grid list-none gap-0.5 p-0 text-sm text-muted-foreground">
                {contacts.map((c) => (
                  <li key={c.title} className="flex items-center gap-1.5">
                    <Phone aria-hidden size={13} className="shrink-0" />
                    {c.title}: {c.content}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 mt-1 text-sm text-muted-foreground">
                Вопрос или проблема — напишите, председатель ответит в треде заявки.
              </p>
            )}
          </div>
        </div>
        <Button asChild variant="outline" className="mt-3 h-10 w-full rounded-xl font-semibold">
          <Link href="/app/requests?category=OTHER" data-testid="write-chairman">
            Написать председателю
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
