import { Badge } from "@/components/ui/badge";
import { Card,CardContent } from "@/components/ui/card";
import { activeChairmanOsi,activeMemberOsi } from "@/lib/auth/guards";
import { getCurrentAuth } from "@/lib/auth/session";
import {
getOccupantBuilding,
listAnnouncements,
listInfoItems,
listRequests,
} from "@/lib/comms/service";
import { forTenant } from "@/lib/db/tenant";
import { getMasterByUserId } from "@/lib/master/service";
import { residentBalances } from "@/lib/finance/service";
import { markRead } from "@/lib/notifications/service";
import { listBuildings } from "@/lib/onboarding/service";
import { maskPhone } from "@/lib/phone";
import { listPolls } from "@/lib/polls/service";
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
import Link from "next/link";
import { redirect } from "next/navigation";
import { AddBuildingForm } from "./_components/AddBuildingForm";
import { CategoryTile } from "./_components/categoryIcons";
import { ContactChairman } from "./_components/ContactChairman";
import { CreateOsiForm } from "./_components/CreateOsiForm";
import { EmergencyBoard } from "./_components/EmergencyBoard";
import { JoinOsiCard } from "./_components/JoinOsiCard";
import { JoinRequestsPanel } from "./_components/JoinRequestsPanel";
import { MarkReadButton } from "./_components/MarkReadButton";
import { PageBody,PageHeader } from "./_components/PageHeader";
import { PayOnlineButton } from "./_components/PayOnlineButton";
import { PollCard } from "./_components/PollCard";
import { RequestCard } from "./_components/RequestCard";
import { StatCard } from "./_components/StatCard";
import { LogoutButton } from "./LogoutButton";

import { getTranslation,localeForLanguage } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AppHome({
  searchParams,
}: {
  searchParams: Promise<{ n?: string; welcome?: string }>;
}) {
  const { t } = await getTranslation();
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");

  const chairmanOsi = activeChairmanOsi(auth);
  const memberOsi = chairmanOsi ? null : activeMemberOsi(auth);
  const activeOsi = chairmanOsi ?? memberOsi;

  // TECH-012: masters without OSI membership have their own cabinet.
  if (!activeOsi && (await getMasterByUserId(auth.user.id))) redirect("/master");

  const { n, welcome } = await searchParams;
  if (activeOsi && n) {
    await markRead(activeOsi, auth.user.id, n).catch(() => {});
  }
  const residentFirst = welcome === "resident";

  return (
    <>
      <PageHeader
        title={t("nav_dashboard")}
        subtitle={
          <span data-testid="me">{auth.user.email ?? maskPhone(auth.user.phone)}</span>
        }
        actions={!activeOsi ? <LogoutButton /> : undefined}
      />
      <PageBody wide={Boolean(chairmanOsi)}>
        {chairmanOsi ? (
          <ChairmanDashboard osiId={chairmanOsi} />
        ) : memberOsi ? (
          <ResidentView osiId={memberOsi} userId={auth.user.id} />
        ) : (
          <section className="grid max-w-xl gap-4">
            {residentFirst ? (
              <>
                <JoinOsiCard />
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
                    {t("label_are_you_chairman")}
                  </summary>
                  <Card className="mt-3 rounded-2xl shadow-sm">
                    <CardContent className="pt-6">
                      <CreateOsiForm />
                    </CardContent>
                  </Card>
                </details>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  {t("label_no_osi_notice")}
                </p>
                <Card className="rounded-2xl shadow-sm">
                  <CardContent className="pt-6">
                    <CreateOsiForm />
                  </CardContent>
                </Card>
                <JoinOsiCard />
              </>
            )}
          </section>
        )}
      </PageBody>
    </>
  );
}

async function ChairmanDashboard({ osiId }: { osiId: string }) {
  const { t, language } = await getTranslation();
  const locale = localeForLanguage(language);
  const statusLabels = {
    RECEIVED: t("request_status_received"),
    IN_PROGRESS: t("status_in_progress"),
    RESOLVED: t("request_status_resolved"),
  } as const;
  const buildings = await listBuildings(osiId);
  const now = new Date();
  const [{ newRequests, apartments, activePolls, recentRequests }, joinRequests] =
    await Promise.all([
      forTenant(osiId, async (tx) => ({
        newRequests: await tx.request.count({ where: { status: "RECEIVED" } }),
        apartments: await tx.apartment.count(),
        activePolls: await tx.poll.findMany({
          where: { OR: [{ deadline: null }, { deadline: { gt: now } }] },
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { options: { include: { _count: { select: { votes: true } } } } },
        }),
        recentRequests: await tx.request.findMany({
          orderBy: { createdAt: "desc" },
          take: 4,
          include: { apartment: { select: { number: true } } },
        }),
      })),
      forTenant(osiId, async (tx) =>
        (tx).osiJoinRequest?.findMany({
          where: { osiId, status: "PENDING" },
          include: {
            user: {
              select: {
                email: true,
                phone: true,
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        }) ?? [],
      ),
    ]);

  return (
    <section className="grid gap-6">
      <JoinRequestsPanel requests={joinRequests} />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
        <StatCard
          icon={ClipboardList}
          tile="bg-warning-soft text-warning"
          label={t("label_new_requests_stat")}
          value={newRequests}
          valueClassName={newRequests > 0 ? "text-destructive" : ""}
          testid="stat-new-requests"
        />
        <StatCard
          icon={Vote}
          tile="bg-accent text-accent-foreground"
          label={t("active_polls")}
          value={activePolls.length}
        />
        {buildings[0] ? (
          <Link href={`/app/buildings/${buildings[0].id}/polls`} className="no-underline">
            <StatCard
              icon={Vote}
              tile="bg-primary/10 text-primary"
              label={t("nav_polls")}
              value={activePolls.length}
            />
          </Link>
        ) : (
          <StatCard icon={Building2} tile="bg-success-soft text-success" label={t("label_buildings")} value={buildings.length} />
        )}
        <StatCard
          icon={HomeIcon}
          tile="bg-secondary text-muted-foreground"
          label={t("label_apartments")}
          value={apartments}
        />
      </div>

      {(activePolls.length > 0 || recentRequests.length > 0) && (
        <div className="grid items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
          {activePolls.length > 0 && (
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6">
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="m-0 text-base font-bold">{t("active_polls")}</h2>
                  {buildings[0] && (
                    <Link
                      href={`/app/buildings/${buildings[0].id}/polls`}
                      className="text-sm font-semibold text-primary no-underline"
                    >
                      {t("label_all_link")}
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
                          <span className="font-semibold">{p.question}</span>
                          {p.deadline && (
                            <span className="shrink-0 text-muted-foreground">
                              {t("label_until")}{" "}
                              {p.deadline.toLocaleDateString(locale, { day: "numeric", month: "long" })}
                            </span>
                          )}
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="m-0 mt-1 text-xs text-muted-foreground">
                          {votes} {t("label_votes_from_apartments")} {apartments}
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
                  <h2 className="m-0 text-base font-bold">{t("label_recent_requests")}</h2>
                  {buildings[0] && (
                    <Link
                      href={`/app/buildings/${buildings[0].id}/requests`}
                      className="text-sm font-semibold text-primary no-underline"
                    >
                      {t("label_all_link")}
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
                          {r.apartment ? `${t("label_apt_prefix")} ${r.apartment.number} · ` : ""}
                          {r.createdAt.toLocaleDateString(locale, { day: "numeric", month: "long" })}
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
                        {statusLabels[r.status as keyof typeof statusLabels] ?? r.status}
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
        <h2 className="m-0 text-base font-semibold">
          {t("label_buildings")} ({buildings.length})
        </h2>
        {buildings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("label_no_buildings_yet")}</p>
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
        <h2 className="m-0 text-base font-semibold">{t("label_add_building")}</h2>
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
  const { t, language } = await getTranslation();
  const occ = await getOccupantBuilding(osiId, userId);
  if (!occ?.apartment) {
    return (
      <p className="text-sm text-muted-foreground">{t("label_apartment_not_linked")}</p>
    );
  }

  // Обзор жителя по макету: стат-карточки → оплата → опросы → новости → заявки.
  const [announcements, requests, polls, balances, infoItems] = await Promise.all([
    listAnnouncements(osiId, occ.apartment.buildingId, userId),
    listRequests(osiId, { authorUserId: userId }),
    listPolls(osiId, occ.apartment.buildingId, userId),
    residentBalances(osiId, userId),
    listInfoItems(osiId, occ.apartment.buildingId),
  ]);
  const emergencyContacts = infoItems
    .filter((i) => i.type === "EMERGENCY_CONTACTS")
    .map((i) => ({
      title: i.title,
      phone: i.content,
      type: "emergency" as const,
    }));
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
      {emergencyContacts.length > 0 && (
        <EmergencyBoard
          osiName={occ.apartment.building.address}
          buildingAddress={occ.apartment.building.address}
          contacts={emergencyContacts}
        />
      )}

      <div className="grid grid-cols-3 gap-2.5 lg:gap-4">
        <StatCard
          icon={Wallet}
          tile={totalDebt > 0 ? "bg-destructive-soft text-destructive" : "bg-success-soft text-success"}
          label={t("label_to_pay")}
          value={`₸ ${totalDebt.toLocaleString("ru-RU")}`}
        />
        <Link href="/app/polls" className="no-underline">
          <StatCard
            icon={Vote}
            tile={
              openPolls.filter((p) => p.myOptionId === null).length > 0 
                ? "bg-destructive-soft text-destructive" 
                : openPolls.length > 0 
                  ? "bg-accent text-accent-foreground" 
                  : "bg-muted text-muted-foreground"
            }
            label={t("nav_polls")}
            value={
              openPolls.filter((p) => p.myOptionId === null).length > 0
                ? (language === "kk" ? "Дауыс керек!" : language === "en" ? "Vote needed!" : "Нужен голос!")
                : openPolls.length > 0
                  ? (language === "kk" ? "Белсенді" : language === "en" ? "Active" : "Активно")
                  : (language === "kk" ? "Аяқталған" : language === "en" ? "Finished" : "Завершено")
            }
          />
        </Link>
        <Link href="/app/requests" className="no-underline">
          <StatCard
            icon={ClipboardList}
            tile="bg-warning-soft text-warning"
            label={t("label_requests_in_work")}
            value={requestsInWork}
          />
        </Link>
      </div>

      {balances && (
        <Card
          className="rounded-2xl border-none bg-primary text-primary-foreground shadow-sm"
          data-testid="resident-balance"
        >
          <CardContent className="pt-6">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <p className="m-0 text-sm opacity-85">{t("label_to_pay")}</p>
                <p className="m-0 mt-0.5 text-3xl font-extrabold tracking-tight">
                  ₸ {totalDebt.toLocaleString("ru-RU")}
                </p>
              </div>
              <Badge
                variant="secondary"
                className="shrink-0 rounded-full bg-white/15 text-primary-foreground"
                data-testid="resident-debt"
              >
                {totalDebt > 0
                  ? `${t("label_debt_prefix")} ${totalDebt.toLocaleString("ru-RU")} ₸`
                  : t("label_no_debt")}
              </Badge>
            </div>
            <p className="mb-4 mt-1.5 text-[13px] opacity-85">
              {t("charge_maintenance")}: {balances.MAINTENANCE.debt} ₸ · {t("charge_targeted")}:{" "}
              {balances.TARGETED.debt} ₸ · {t("charge_cap_repair")}: {balances.CAPITAL_REPAIR.debt} ₸
            </p>
            <div className="grid gap-2 sm:max-w-xs">
              {totalDebt > 0 && <PayOnlineButton amount={totalDebt} hero />}
              <Link
                href="/app/payments"
                className="text-center text-sm font-semibold text-primary-foreground/90 underline-offset-2"
              >
                {t("label_all_charges")}
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 flex items-center gap-1.5 text-base font-bold">
            <ListTodo aria-hidden size={16} className="text-muted-foreground" />{" "}
            {openPolls.length > 0 ? t("label_requires_your_vote") : (language === "kk" ? "Үй дауыс берулері" : language === "en" ? "Building Polls" : "Голосования дома")}
          </h2>
          <Link href="/app/polls" className="text-sm font-semibold text-primary no-underline">
            {openPolls.length > 0 ? t("label_all_link") : (language === "kk" ? "Мұрағат және есептер" : language === "en" ? "Archive & Reports" : "Архив и отчёты")}
          </Link>
        </div>

        {openPolls.length > 0 ? (
          openPolls.map((p) => (
            <PollCard key={p.id} poll={p} />
          ))
        ) : (
          <Card className="rounded-2xl border border-border/80 bg-card/60 shadow-sm p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <p className="m-0 text-xs font-bold text-foreground">
                    {language === "kk" ? "Қазіргі уақытта белсенді дауыс берулер жоқ" : language === "en" ? "No active polls right now" : "Активных голосований нет"}
                  </p>
                  <p className="m-0 text-[11px] text-muted-foreground">
                    {language === "kk" ? "Барлық жиналыстар аяқталды. Нәтижелер мен есептерді мұрағаттан көруге болады." : language === "en" ? "All meetings closed. You can review results and reports in the archive." : "Все собрания завершены. Итоги и отчетность сохранены в архиве."}
                  </p>
                </div>
              </div>
              <Link 
                href="/app/polls" 
                className="shrink-0 text-xs font-bold text-primary hover:underline"
              >
                {language === "kk" ? "Нәтижелер →" : language === "en" ? "View Archive →" : "Итоги →"}
              </Link>
            </div>
          </Card>
        )}
      </div>

      <div className="grid gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 flex items-center gap-1.5 text-base font-bold">
            <HomeIcon aria-hidden size={16} className="text-muted-foreground" /> {t("label_building_news")}
          </h2>
          <Link href="/app/news" className="text-sm font-semibold text-primary no-underline">
            {t("label_all_link")}
          </Link>
        </div>
        {recentAnnouncements.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("label_no_announcements")}</p>
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
            <h2 className="m-0 text-base font-bold">{t("label_my_requests")}</h2>
            <Link href="/app/requests" className="text-sm font-semibold text-primary no-underline">
              {t("label_all_link")}
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
