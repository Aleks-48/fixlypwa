import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Wrench } from "lucide-react";
import { getCurrentAuth } from "@/lib/auth/session";
import { getMasterByUserId } from "@/lib/master/service";
import { activeChairmanOsi, activeMemberOsi } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

// CABINET-001: query actual memberships; choosing a destination grants no new role.
export default async function CabinetPage() {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");
  const master = await getMasterByUserId(auth.user.id);
  if (!master) redirect("/app");
  if (!activeMemberOsi(auth)) redirect("/master");
  const chairman = !!activeChairmanOsi(auth);
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-5 py-12">
      <p className="mb-2 text-sm font-semibold text-primary">Fixly</p>
      <h1 className="text-3xl font-bold">Выберите кабинет</h1>
      <p className="mt-3 text-muted-foreground">У вашего аккаунта несколько ролей. Между кабинетами можно переключаться без повторного входа.</p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <Link href="/app" className="rounded-2xl border border-border bg-card p-6 text-foreground no-underline hover:border-primary">
          <Building2 aria-hidden className="mb-4 text-primary" />
          <h2 className="text-lg font-bold">{chairman ? "Кабинет председателя" : "Кабинет жителя"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{chairman ? "Управление домом, финансы и обращения жителей." : "Мой дом, начисления, документы и заявки."}</p>
        </Link>
        <Link href="/master" className="rounded-2xl border border-border bg-card p-6 text-foreground no-underline hover:border-primary">
          <Wrench aria-hidden className="mb-4 text-primary" />
          <h2 className="text-lg font-bold">Кабинет мастера</h2>
          <p className="mt-2 text-sm text-muted-foreground">Заказы, отклики, профиль и портфолио.</p>
        </Link>
      </div>
    </main>
  );
}
