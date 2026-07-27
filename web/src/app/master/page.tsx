import { Building2, Clock3, MapPin, ShieldAlert, ShieldX } from "lucide-react";
import { requireMasterUser } from "@/lib/auth/masterPage";
import { requestCategoryLabels } from "@/lib/comms/labels";
import { listCityListings, listMyOffers } from "@/lib/market/service";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogoutButton } from "../app/LogoutButton";
import { ThemeToggle } from "../app/_components/ThemeToggle";
import { CategoryTile } from "../app/_components/categoryIcons";
import { MasterOnboardingForm } from "./_components/MasterOnboardingForm";
import { RespondToListing } from "./_components/RespondToListing";
import { WithdrawOfferButton } from "./_components/WithdrawOfferButton";

export const dynamic = "force-dynamic";

const OFFER_STATUS_LABELS: Record<string, string> = {
  OFFERED: "Отклик отправлен",
  ACCEPTED: "Отклик принят",
  DECLINED: "Выбрали другого мастера",
  WITHDRAWN: "Отозван",
};

// Область мастера (ADR-0009, marketplace.md). Самостоятельный shell — НЕ AppShell/AppSidebar
// (те типизированы под роли chairman|resident и несут ОСИ-специфичную навигацию). Экран сам
// ветвит по статусу анкеты: нет анкеты → онбординг; PENDING/REJECTED/BLOCKED → сообщение;
// APPROVED → лента заказов города (REQ-064) + мои отклики (REQ-065).
export default async function MasterPage() {
  const { auth, master } = await requireMasterUser();

  const [listings, myOffers] =
    master?.status === "APPROVED"
      ? await Promise.all([
          listCityListings(master.id, master.city),
          listMyOffers(master.id, master.city),
        ])
      : [[], []];
  const myOfferByListingId = new Map(myOffers.map((o) => [o.listingId, o]));

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 pb-16 pt-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 aria-hidden size={20} />
          </span>
          <div>
            <p className="m-0 text-base font-extrabold leading-tight">Дом · Мастер</p>
            <p className="m-0 text-xs text-muted-foreground" data-testid="me">
              {auth.user.email ?? auth.user.phone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      {!master && (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="pt-6">
            <h1 className="m-0 mb-1 text-xl font-bold">Анкета мастера</h1>
            <p className="mb-5 mt-0 text-sm text-muted-foreground">
              Укажите город и категории работ — после одобрения увидите заказы жителей рядом с
              вами.
            </p>
            <MasterOnboardingForm />
          </CardContent>
        </Card>
      )}

      {master?.status === "PENDING" && (
        <Card className="rounded-2xl shadow-sm" data-testid="master-status-pending">
          <CardContent className="flex items-start gap-3.5 pt-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
              <Clock3 aria-hidden size={20} />
            </span>
            <div>
              <strong className="text-[15px] font-bold">Анкета на проверке</strong>
              <p className="m-0 mt-1 text-sm text-muted-foreground">
                {master.fullName} · {master.city} ·{" "}
                {master.categories.map((c) => requestCategoryLabels[c] ?? c).join(", ")}
              </p>
              <p className="m-0 mt-2 text-sm text-muted-foreground">
                Мы проверим анкету и откроем доступ к заказам вашего города.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {master?.status === "REJECTED" && (
        <Card className="rounded-2xl shadow-sm" data-testid="master-status-rejected">
          <CardContent className="flex items-start gap-3.5 pt-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-destructive-soft text-destructive">
              <ShieldAlert aria-hidden size={20} />
            </span>
            <div>
              <strong className="text-[15px] font-bold">Анкета отклонена</strong>
              <p className="m-0 mt-1 text-sm text-muted-foreground">
                Свяжитесь с поддержкой, чтобы уточнить причину.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {master?.status === "BLOCKED" && (
        <Card className="rounded-2xl shadow-sm" data-testid="master-status-blocked">
          <CardContent className="flex items-start gap-3.5 pt-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-destructive-soft text-destructive">
              <ShieldX aria-hidden size={20} />
            </span>
            <div>
              <strong className="text-[15px] font-bold">Аккаунт заблокирован</strong>
              <p className="m-0 mt-1 text-sm text-muted-foreground">Свяжитесь с поддержкой.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {master?.status === "APPROVED" && (
        <div data-testid="master-status-approved">
          <p className="m-0 mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin aria-hidden size={15} />
            {master.city} · {master.categories.map((c) => requestCategoryLabels[c] ?? c).join(", ")}
          </p>

          <Tabs defaultValue="feed">
            <TabsList className="mb-4">
              <TabsTrigger value="feed" data-testid="master-tab-feed">
                Заказы · {listings.length}
              </TabsTrigger>
              <TabsTrigger value="offers" data-testid="master-tab-offers">
                Мои отклики · {myOffers.length}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feed">
              {listings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Пока нет заказов в вашем городе — загляните позже.
                </p>
              ) : (
                <ul className="m-0 grid list-none gap-3 p-0">
                  {listings.map((l) => {
                    const mine = myOfferByListingId.get(l.id);
                    return (
                      <li key={l.id} data-testid="listing-card">
                        <Card className="rounded-2xl shadow-sm">
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                              <CategoryTile category={l.category} />
                              <div className="min-w-0 flex-1">
                                <strong className="text-[15px] font-bold">{l.title}</strong>
                                <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                                  {l.buildingLabel} · {requestCategoryLabels[l.category] ?? l.category}
                                </p>
                              </div>
                            </div>
                            <p className="m-0 mb-3 mt-2.5 text-sm text-muted-foreground">
                              {l.description}
                            </p>
                            {l.photoUrls.length > 0 && (
                              <div className="mb-3 flex flex-wrap gap-2">
                                {l.photoUrls.map((url) => (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    key={url}
                                    src={url}
                                    alt="Фото заказа"
                                    className="size-16 rounded-lg border border-border object-cover"
                                  />
                                ))}
                              </div>
                            )}
                            {mine ? (
                              <span
                                data-testid="my-listing-offer-status"
                                className="text-xs font-semibold text-muted-foreground"
                              >
                                {OFFER_STATUS_LABELS[mine.status] ?? mine.status}
                              </span>
                            ) : (
                              <RespondToListing listingId={l.id} />
                            )}
                          </CardContent>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="offers">
              {myOffers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Вы пока не откликались на заказы.</p>
              ) : (
                <ul className="m-0 grid list-none gap-3 p-0">
                  {myOffers.map((o) => (
                    <li key={o.id} data-testid="my-offer-row">
                      <Card className="rounded-2xl shadow-sm">
                        <CardContent className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5">
                          <div className="min-w-0">
                            <p className="m-0 truncate text-sm font-semibold">
                              {o.listing?.title ?? "Заказ закрыт"}
                            </p>
                            <p className="m-0 text-xs text-muted-foreground" data-testid="my-offer-status">
                              {OFFER_STATUS_LABELS[o.status] ?? o.status}
                            </p>
                          </div>
                          {o.status === "OFFERED" && <WithdrawOfferButton offerId={o.id} />}
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </main>
  );
}
