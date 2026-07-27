import { requireMember } from "@/lib/auth/residentPage";
import { getOccupantBuilding, listInfoItems } from "@/lib/comms/service";
import { InfoList } from "../_components/InfoList";
import { PageBody, PageHeader } from "../_components/PageHeader";

export const dynamic = "force-dynamic";

// Вкладка «Инфо» жителя: вывоз мусора, аварийные, реквизиты. Отчёты дома переехали
// в «Финансы» → вкладка «Отчёты» (заметки п.6/7).
export default async function ResidentInfoPage() {
  const { auth, osiId } = await requireMember();
  const occ = await getOccupantBuilding(osiId, auth.user.id);
  const items = occ?.apartment ? await listInfoItems(osiId, occ.apartment.buildingId) : [];

  return (
    <>
      <PageHeader title="Полезное" subtitle="Контакты, вывоз мусора, реквизиты" />
      <PageBody>
        {!occ ? (
          <p className="text-sm text-muted-foreground">
            Ваша квартира ещё не привязана — обратитесь к председателю.
          </p>
        ) : (
          <InfoList items={items} />
        )}
      </PageBody>
    </>
  );
}
