import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { listCityListings, listMyOffers } from "@/lib/market/service";
import { getTranslation } from "@/lib/i18n/server";
import { MasterFeedView } from "./_components/MasterFeedView";
import { PageBody, PageHeader } from "../_components/PageHeader";


export const dynamic = "force-dynamic";

export default async function MasterFeedPage() {
  const { t } = await getTranslation();
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");

  // Получаем профиль мастера для текущего пользователя
  const master = await prisma.master.findUnique({
    where: { userId: auth.user.id },
  });

  if (!master) {
    return (
      <>
        <PageHeader
          title={t("title_master_cabinet")}
          subtitle={t("subtitle_master_feed")}
        />
        <PageBody>
          <div className="rounded-2xl border border-dashed p-8 text-center bg-card/40">
            <h3 className="m-0 text-base font-bold">{t("label_not_master_yet")}</h3>
            <p className="m-0 mt-1 text-xs text-muted-foreground">
              {t("label_not_master_desc")}
            </p>
          </div>
        </PageBody>
      </>
    );
  }

  if (master.status !== "APPROVED") {
    return (
      <>
        <PageHeader
          title={t("title_master_cabinet")}
          subtitle={t("subtitle_master_feed")}
        />
        <PageBody>
          <div className="rounded-2xl border border-warning/30 bg-warning/5 p-8 text-center">
            <h3 className="m-0 text-base font-bold text-warning">{t("label_master_pending_title")}</h3>
            <p className="m-0 mt-1 text-xs text-muted-foreground">
              {t("label_master_pending_desc")}
            </p>
          </div>
        </PageBody>
      </>
    );
  }

  const listings = await listCityListings(master.id, master.city);
  const myOffers = await listMyOffers(master.id, master.city);

  return (
    <>
      <PageHeader
        title={`${t("label_master_feed_title")} · ${master.city}`}
        subtitle={`${t("label_master_logged_as")} ${master.fullName}`}
      />
      <PageBody wide>
        <MasterFeedView
          masterId={master.id}
          initialFullName={master.fullName}
          city={master.city}
          listings={listings}
          myOffers={myOffers.map(offer => ({ ...offer, price: offer.price?.toNumber() ?? null }))}
        />
      </PageBody>
    </>
  );
}
