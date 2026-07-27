import { requireMember } from "@/lib/auth/residentPage";
import { getOccupantBuilding, listInfoItems } from "@/lib/comms/service";
import { listDocuments } from "@/lib/documents/service";
import { InfoList } from "../_components/InfoList";
import { DocumentList } from "../_components/DocumentList";
import { PageBody, PageHeader } from "../_components/PageHeader";

export const dynamic = "force-dynamic";

// Вкладка «Полезное» жителя: Библиотека публичных документов + контакты, вывоз мусора, реквизиты.
export default async function ResidentInfoPage() {
  const { auth, osiId } = await requireMember();
  const occ = await getOccupantBuilding(osiId, auth.user.id);
  const buildingId = occ?.apartment?.buildingId;

  const items = buildingId ? await listInfoItems(osiId, buildingId) : [];
  const documents = buildingId
    ? await listDocuments(osiId, buildingId, { isPublicOnly: true })
    : [];

  return (
    <>
      <PageHeader title="Полезное" subtitle="Документы дома, контакты, вывоз мусора, реквизиты" />
      <PageBody>
        {!occ ? (
          <p className="text-sm text-muted-foreground">
            Ваша квартира ещё не привязана — обратитесь к председателю.
          </p>
        ) : (
          <div className="grid gap-8">
            <section className="grid gap-3">
              <h3 className="m-0 text-lg font-bold">Документы дома</h3>
              <DocumentList documents={documents} isChairman={false} />
            </section>

            <hr className="border-border" />

            <section className="grid gap-3">
              <h3 className="m-0 text-lg font-bold">Полезная информация и контакты</h3>
              <InfoList items={items} />
            </section>
          </div>
        )}
      </PageBody>
    </>
  );
}
