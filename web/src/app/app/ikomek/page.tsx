import { requireMember } from "@/lib/auth/residentPage";
import { getOccupantBuilding } from "@/lib/comms/service";
import { listIKomekComplaints } from "@/lib/ikomek/service";
import { getTranslation } from "@/lib/i18n/server";
import { IKomekForm } from "../_components/IKomekForm";
import { PageBody, PageHeader } from "../_components/PageHeader";

export const dynamic = "force-dynamic";

export default async function IKomekPage() {
  const { t } = await getTranslation();
  const { auth, osiId } = await requireMember();
  const occ = await getOccupantBuilding(osiId, auth.user.id);
  const complaints = await listIKomekComplaints(osiId, {
    authorUserId: auth.user.id,
  });

  return (
    <>
      <PageHeader
        title={t("title_ikomek")}
        subtitle={t("subtitle_ikomek")}
      />
      <PageBody wide>
        {!occ || !occ.apartment ? (
          <p className="text-sm text-muted-foreground">
            {t("label_apartment_not_linked")}
          </p>
        ) : (
          <IKomekForm
            buildingAddress={occ.apartment.building.address}
            apartmentNumber={occ.apartment.number}
            initialComplaints={complaints.map((c) => ({
              ...c,
              createdAt: c.createdAt.toISOString(),
            }))}
          />
        )}
      </PageBody>
    </>
  );
}
