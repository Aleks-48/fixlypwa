import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { listApprovedMasters } from "@/lib/masters/service";
import { getTranslation } from "@/lib/i18n/server";
import { PageBody, PageHeader } from "../_components/PageHeader";
import { MasterCatalogView } from "../_components/MasterCatalogView";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { AddMasterDialog } from "../_components/AddMasterDialog";

export const dynamic = "force-dynamic";

export default async function MastersPage() {
  const { t } = await getTranslation();
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");

  const isChairman = Boolean(activeChairmanOsi(auth));
  const masters = await listApprovedMasters("Кокшетау");

  return (
    <>
      <PageHeader
        title={t("title_masters")}
        subtitle={t("subtitle_masters")}
        actions={isChairman ? <AddMasterDialog /> : undefined}
      />
      <PageBody wide>
        <MasterCatalogView initialMasters={masters} />
      </PageBody>
    </>
  );
}
