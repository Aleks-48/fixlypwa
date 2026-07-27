import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Home as HomeIcon,
  ListTodo,
  Megaphone,
  Vote,
  Wallet,
} from "lucide-react";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi, activeMemberOsi } from "@/lib/auth/guards";
import { listBuildings } from "@/lib/onboarding/service";
import {
  listAnnouncements,
  listRequests,
  listInfoItems,
  getOccupantBuilding,
} from "@/lib/comms/service";
import { requestStatusLabels } from "@/lib/comms/labels";
import { listPolls } from "@/lib/polls/service";
import { residentBalances } from "@/lib/finance/service";
import { markRead } from "@/lib/notifications/service";
import { forTenant } from "@/lib/db/tenant";
import { maskPhone } from "@/lib/phone";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateOsiForm } from "./_components/CreateOsiForm";
import { AddBuildingForm } from "./_components/AddBuildingForm";
import { MarkReadButton } from "./_components/MarkReadButton";
import { RequestCard } from "./_components/RequestCard";
import { PollCard } from "./_components/PollCard";
import { PageBody, PageHeader } from "./_components/PageHeader";
import { StatCard } from "./_components/StatCard";
import { PayOnlineButton } from "./_components/PayOnlineButton";
import { CategoryTile } from "./_components/categoryIcons";
import { ContactChairman } from "./_components/ContactChairman";

export const dynamic = "force-dynamic";

export default async function AppHome({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");

  const chairmanOsi = activeChairmanOsi(auth);
  const memberOsi = chairmanOsi ? null : activeMemberOsi(auth);
  const activeOsi = chairmanOsi ?? memberOsi;

  const { n } = await searchParams;
  if (activeOsi && n) {
    await markRead(activeOsi, auth.user.id, n).catch(() => {});
  }

  return (
    <>
      <PageHeader
        title="Главная"
        subtitle={
          <span data-testid="me">{auth.user.email ?? maskPhone(auth.user.phone)}</span>
        }
      />
      <PageBody wide={Boolean(chairmanOsi)}>
        {chairmanOsi ? (
          <ChairmanDashboard osiId={chairmanOsi} />
        ) : memberOsi ? (
          <ResidentView osiId={memberOsi} userId={auth.user.id} />
        ) : (
          <section className="grid max-w-xl gap-4">
            <p className="text-muted-foreground">
              У вас пока нет ОСИ. Создайте её — вы станете председателем и сможете завести дом,
              квартиры и жителей.
            </p>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6">
                <CreateOsiForm />
              </CardContent>
            </Card>
          </section>
        )}
      </PageBody>
    </>
  );
}

async function ChairmanDashboard({ osiId }: { osiId: string }) {
  const buildings = await listBuildings(osiId);
  const { newRequests, apartments, activePolls, recentRequests } = await forTenant(
    osiId,
    async (tx) => ({
      newRequests: await tx.request.count({ where: { status: "RECEIVED" } }),
      apartments: await tx.apartment.count(),
      activePolls: await tx.poll.findMany({
        where: { isClosed: false },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { options: { include: { _count: { select: { votes: true } } } } },
      }),
      recentRequests: await tx.request.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { apartment: { select: { number: true } } },
      }),
    }),
  );

  return (
    <section className="grid gap-6">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
        <StatCard
          icon={ClipboardList}
          tile="bg-warning-soft text-warning"
          label="Новые заявки"
          value={newRequests}
          valueClassName={newRequests > 0 ? "text-destructive" : ""}
          testid="stat-new-requests"
        />
        <StatCard
          icon={Vote}
          tile="bg-accent text-accent-foreground"
          label="Активные голосования"
          value={activePolls.length}
        />
        <StatCard icon={Building2} tile="bg-success-soft text-success" label="Дома" value={buildings.length} />
        <StatCard
          icon={HomeIcon}
          tile="bg-secondary text-muted-foreground"
          label="Квартиры"
          value={apartments}
        />
      </div>

      {(activePolls.length > 0 || recentRequests.length > 0) && (
        <div className="grid items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
          {activePolls.length > 0 && (
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6">
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="m-0 text-base font-bold">Активные голосования</h2>
                  {buildings[0] && (
                    <Link
                      href={`/app/buildings/${buildings[0].id}/polls`}
                      className="text-sm font-semibold text-primary no-underline"
                    >
                      Все
                    </Link>
                  )}
                </div>
                <div className="grid gap-4">
                  {activePolls.map((p) => {
                    const votes = p.options.reduce((s, o) => s + o._count.votes, 0);
                    const pct = apartments > 0 ? Math.min(100, Math.round((votes / apartments) * 100)) : 0;
                    return (
                      <div key={p.id}>
                        <div className="mb-1.5 flex justify-between gap-2 text-sm">
                          <span className="font-semibold">{p.title}</span>
                          {p.endDate && (
                            <span className="shrink-0 text-muted-foreground">
                              до {new Date(p.endDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                            </span>
                          )}
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="m-0 mt-1 text-xs text-muted-foreground">
                          {votes} голосов из {apartments} квартир
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          {recentRequests.length > 0 && (
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6">
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="m-0 text-base font-bold">Последние заявки</h2>
                  {buildings[0] && (
                    <Link
                      href={`/app/buildings/${buildings[0].id}/requests`}
                      className="text-sm font-semibold text-primary no-underline"
                    >
                      Все
                    </Link>
                  )}
                </div>
                <ul className="m-0 grid list-none gap-3.5 p-0">
                  {recentRequests.map((r) => (
                    <li key={r.id} className="flex items-center gap-3">
                      <CategoryTile category={r.category} />
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-sm font-semibold">{r.text}</p>
                        <p className="m-0 text-xs text-muted-foreground">
                          {r.apartment ? `кв. ${r.apartment.number} · ` : ""}
                          {r.createdAt.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          r.status === "RECEIVED"
                            ? "bg-destructive-soft text-destructive"
                            : r.status === "IN_PROGRESS"
                              ? "bg-warning-soft text-warning"
                              : "bg-success-soft text-success"
                        }`}
                      >
                        {requestStatusLabels[r.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-3">
        <h2 className="m-0 text-base font-semibold">Дома ({buildings.length})</h2>
        {buildings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Домов пока нет. Добавьте первый дом ниже.</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {buildings.map((b) => (
              <li key={b.id}>
                <Link href={`/app/buildings/${b.id}`} data-testid="building-link">
                  <Card className="rounded-2xl border-border/70 shadow-sm transition-colors hover:bg-muted/40">
                    <CardContent className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <span className="flex items-center gap-2.5 text-sm font-medium">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                          <Building2 aria-hidden size={15} />
                        </span>
                        {b.address}
                      </span>
                      <ArrowRight aria-hidden size={16} className="shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-3">
        <h2 className="m-0 text-base font-semibold">Добавить дом</h2>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="pt-6">
            <AddBuildingForm />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

async function ResidentView({ osiId, userId }: { osiId: string; userId: string }) {
  const occ = await getOccupantBuilding(osiId, userId);
  if (!occ?.apartment) {
    return (
      <p className="text-sm text-muted-foreground">
        Ваша квартира ещё не привязана. Обратитесь к председателю ОСИ.
      </p>
    );
  }

  const [announcements, requests, polls, balances, infoItems] = await Promise.all([
    listAnnouncements(osiId, occ.apartment.buildingId, userId),
    listRequests(osiId, { authorUserId: userId }),
    listPolls(osiId, occ.apartment.buildingId, userId),
    residentBalances(osiId, userId),
    listInfoItems(osiId, occ.apartment.buildingId),
  ]);
  const chairContacts = infoItems
    .filter((i) => i.type === "CHAIRMAN_CONTACTS")
    .map((i) => ({ title: i.title, content: i.content }));
  const recentRequests = requests.slice(0, 3);
  const recentAnnouncements = announcements.slice(0, 3);
  const openPolls = polls.filter((p) => !p.closed);
  const requestsInWork = requests.filter((r) => r.status !== "RESOLVED").length;
  const totalDebt = balances
    ? balances.MAINTENANCE.debt + balances.TARGETED.debt + balances.CAPITAL_REPAIR.debt
    : 0;

  return (
    <section className="grid gap-6">
      <div className="grid grid-cols-3 gap-2.5 lg:gap-4">
        <StatCard
          icon={Wallet}
          tile={totalDebt > 0 ? "bg-destructive-soft text-destructive" : "bg-success-soft text-success"}
          label="К оплате"
          value={`₸ ${totalDebt.toLocaleString("ru-RU")}`}
        />
        <StatCard
          icon={Vote}
          tile="bg-accent text-accent-foreground"
          label="Ждут голоса"
          value={openPolls.filter((p) => p.myOptionId === null).length}
        />
        <StatCard
          icon={ClipboardList}
          tile="bg-warning-soft text-warning"
          label="Заявки в работе"
          value={requestsInWork}
        />
      </div>

      {balances && (
        <Card
          className="rounded-2xl border-none bg-primary text-primary-foreground shadow-sm"
          data-testid="resident-balance"
        >
          <CardContent className="pt-6">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <p className="m-0 text-sm opacity-85">К оплате</p>
                <p className="m-0 mt-0.5 text-3xl font-extrabold tracking-tight">
                  ₸ {totalDebt.toLocaleString("ru-RU")}
                </p>
              </div>
              <Badge
                variant="secondary"
                className="shrink-0 rounded-full bg-white/15 text-primary-foreground"
                data-testid="resident-debt"
              >
                {totalDebt > 0 ? `долг ${totalDebt.toLocaleString("ru-RU")} ₸` : "долгов нет"}
              </Badge>
            </div>
            <p className="mb-4 mt-1.5 text-[13px] opacity-85">
              Содержание: {balances.MAINTENANCE.debt} ₸ · Целевые: {balances.TARGETED.debt} ₸ ·
              Кап.ремонт: {balances.CAPITAL_REPAIR.debt} ₸
            </p>
            <div className="grid gap-2 sm:max-w-xs">
              {totalDebt > 0 && <PayOnlineButton amount={totalDebt} hero />}
              <Link
                href="/app/payments"
                className="text-center text-sm font-semibold text-primary-foreground/90 underline-offset-2"
              >
                Все начисления и история →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {openPolls.length > 0 && (
        <div className="grid gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="m-0 flex items-center gap-1.5 text-base font-bold">
              <ListTodo aria-hidden size={16} className="text-muted-foreground" /> Требует вашего
              голоса
            </h2>
            <Link href="/app/polls" className="text-sm font-semibold text-primary no-underline">
              Все
            </Link>
          </div>
          {openPolls.map((p) => (
            <PollCard key={p.id} poll={p} />
          ))}
        </div>
      )}

      <div className="grid gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 flex items-center gap-1.5 text-base font-bold">
            <HomeIcon aria-hidden size={16} className="text-muted-foreground" /> Новости дома
          </h2>
          <Link href="/app/news" className="text-sm font-semibold text-primary no-underline">
            Все
          </Link>
        </div>
        {recentAnnouncements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Объявлений пока нет.</p>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0">
            {recentAnnouncements.map((a) => (
              <li key={a.id} data-testid="ann-row">
                <Card className="rounded-2xl shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                        <Megaphone aria-hidden size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong className="text-sm font-bold">{a.title}</strong>
                        <p className="mb-3 mt-1 text-sm text-muted-foreground">{a.body}</p>
                        <MarkReadButton id={a.id} read={a.readByViewer} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      {recentRequests.length > 0 && (
        <div className="grid gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="m-0 text-base font-bold">Мои заявки</h2>
            <Link href="/app/requests" className="text-sm font-semibold text-primary no-underline">
              Все
            </Link>
          </div>
          <ul className="m-0 grid list-none gap-3 p-0">
            {recentRequests.map((r) => (
              <li key={r.id}>
                <RequestCard request={r} canChangeStatus={false} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <ContactChairman contacts={chairContacts} />
    </section>
  );
}