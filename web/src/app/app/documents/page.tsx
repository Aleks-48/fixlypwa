import { requireMember } from "@/lib/auth/residentPage";
import { getOccupantBuilding } from "@/lib/comms/service";
import { listDocumentsWithReadStatus } from "@/lib/documents/service";
import { getTranslation } from "@/lib/i18n/server";
import { DocumentList } from "../_components/DocumentList";
import { PageBody, PageHeader } from "../_components/PageHeader";

export const dynamic = "force-dynamic";

export default async function ResidentDocumentsPage() {
  const { t } = await getTranslation();
  const { auth, osiId } = await requireMember();
  const occ = await getOccupantBuilding(osiId, auth.user.id);
  const buildingId = occ?.apartment?.buildingId;

  const documents = buildingId
    ? await listDocumentsWithReadStatus(osiId, buildingId, auth.user.id, { isPublicOnly: true })
    : [];

  return (
    <>
      <PageHeader
        title={t("title_documents")}
        subtitle={t("subtitle_documents")}
      />
      <PageBody>
        {!occ ? (
          <p className="text-sm text-muted-foreground">
            {t("label_apartment_not_linked")}
          </p>
        ) : (
          <DocumentList documents={documents} isChairman={false} />
        )}
      </PageBody>
    </>
  );
}
