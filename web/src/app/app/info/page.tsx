import { requireMember } from "@/lib/auth/residentPage";
import { getOccupantBuilding, listInfoItems } from "@/lib/comms/service";
import { listDocuments } from "@/lib/documents/service";
import { getTranslation } from "@/lib/i18n/server";
import { InfoList } from "../_components/InfoList";
import { DocumentList } from "../_components/DocumentList";
import { PageBody, PageHeader } from "../_components/PageHeader";

export const dynamic = "force-dynamic";

export default async function ResidentInfoPage() {
  const { t } = await getTranslation();
  const { auth, osiId } = await requireMember();
  const occ = await getOccupantBuilding(osiId, auth.user.id);
  const buildingId = occ?.apartment?.buildingId;

  const items = buildingId ? await listInfoItems(osiId, buildingId) : [];
  const documents = buildingId
    ? await listDocuments(osiId, buildingId, { isPublicOnly: true })
    : [];

  return (
    <>
      <PageHeader title={t("nav_info")} subtitle={t("subtitle_info")} />
      <PageBody>
        {!occ ? (
          <p className="text-sm text-muted-foreground">
            {t("label_apartment_not_linked")}
          </p>
        ) : (
          <div className="grid gap-8">
            <section className="grid gap-3">
              <h3 className="m-0 text-lg font-bold">{t("title_documents")}</h3>
              <DocumentList documents={documents} isChairman={false} />
            </section>

            <hr className="border-border" />

            <section className="grid gap-3">
              <h3 className="m-0 text-lg font-bold">{t("title_chairman_info")}</h3>
              <InfoList items={items} />
            </section>
          </div>
        )}
      </PageBody>
    </>
  );
}
