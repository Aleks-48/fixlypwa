import { requireMember } from "@/lib/auth/residentPage";
import { getOccupantBuilding } from "@/lib/comms/service";
import { listDocuments } from "@/lib/documents/service";
import { DocumentList } from "../_components/DocumentList";
import { PageBody, PageHeader } from "../_components/PageHeader";

export const dynamic = "force-dynamic";

// Отдельная страница «Библиотека документов» (Житель).
export default async function ResidentDocumentsPage() {
  const { auth, osiId } = await requireMember();
  const occ = await getOccupantBuilding(osiId, auth.user.id);
  const buildingId = occ?.apartment?.buildingId;

  const documents = buildingId
    ? await listDocuments(osiId, buildingId, { isPublicOnly: true })
    : [];

  return (
    <>
      <PageHeader
        title="Библиотека документов"
        subtitle="Официальные документы, протоколы собраний и уставные акты дома"
      />
      <PageBody>
        {!occ ? (
          <p className="text-sm text-muted-foreground">
            Ваша квартира ещё не привязана — обратитесь к председателю.
          </p>
        ) : (
          <DocumentList documents={documents} isChairman={false} />
        )}
      </PageBody>
    </>
  );
}
