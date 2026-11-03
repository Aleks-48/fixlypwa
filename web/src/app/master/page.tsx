import { Card,CardContent } from "@/components/ui/card";
import { CabinetNavigation } from "@/components/CabinetNavigation";
import { activeMemberOsi, activeChairmanOsi } from "@/lib/auth/guards";
import { requireMasterUser } from "@/lib/auth/masterPage";
import { requestCategoryLabels } from "@/lib/comms/labels";
import { listCityListings,listMyOffers } from "@/lib/market/service";
import { Clock3,ShieldAlert,ShieldX } from "lucide-react";
import { LogoutButton } from "../app/LogoutButton";
import { ThemeToggle } from "../app/_components/ThemeToggle";
import { MasterOnboardingForm } from "./_components/MasterOnboardingForm";

import { MasterFeedView } from "../app/master/_components/MasterFeedView";

import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { getServerLanguage } from "@/lib/i18n/server";
import { LanguageToggle } from "../app/_components/LanguageToggle";

export const dynamic = "force-dynamic";

const _OFFER_STATUS_LABELS: Record<string, string> = {
  OFFERED: "Отклик отправлен",
  ACCEPTED: "Отклик принят",
  DECLINED: "Выбрали другого мастера",
  WITHDRAWN: "Отозван",
};

export default async function MasterPage() {
  const { auth, master } = await requireMasterUser();
  const serverLang = await getServerLanguage();

  const [listings, myOffers] =
    master?.status === "APPROVED"
      ? await Promise.all([
          listCityListings(master.id, master.city),
          listMyOffers(master.id, master.city),
        ])
      : [[], []];

  return (
    <LanguageProvider initialLanguage={serverLang}>
      <main className="mx-auto min-h-dvh max-w-5xl px-4 sm:px-6 pb-16 pt-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black">
              Fixly
            </span>
            <div>
              <p className="m-0 text-base font-extrabold leading-tight">Дом · Мастер</p>
              <p className="m-0 text-xs text-muted-foreground" data-testid="me">
                {auth.user.email ?? auth.user.phone}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>
        {activeMemberOsi(auth) && <div className="mb-6"><CabinetNavigation current="master" homeLabel={activeChairmanOsi(auth) ? "Кабинет председателя" : "Кабинет жителя"} /></div>}

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
          <MasterFeedView
            masterId={master.id}
            city={master.city}
            listings={listings}
            myOffers={myOffers.map(offer => ({ ...offer, price: offer.price?.toNumber() ?? null }))}
            initialFullName={master.fullName}
          />
        </div>
      )}
      </main>
    </LanguageProvider>
  );
}
