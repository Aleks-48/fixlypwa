import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { listApprovedMasters } from "@/lib/masters/service";
import { PageBody, PageHeader } from "../_components/PageHeader";
import { MasterCatalogView } from "../_components/MasterCatalogView";

export const dynamic = "force-dynamic";

// Страница "Карта и портфолио мастеров" (/app/masters)
export default async function MastersPage() {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");

  const masters = await listApprovedMasters("Кокшетау");

  return (
    <>
      <PageHeader
        title="Карта и портфолио мастеров"
        subtitle="Проверенные специалисты города с примерами выполненных работ"
      />
      <PageBody wide>
        <MasterCatalogView initialMasters={masters} />
      </PageBody>
    </>
  );
}
