import { notFound, redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { getBuilding } from "@/lib/onboarding/service";
import { listInfoItems } from "@/lib/comms/service";
import { listDocuments } from "@/lib/documents/service";
import { Card, CardContent } from "@/components/ui/card";
import { InfoForm } from "../../../_components/InfoForm";
import { InfoList } from "../../../_components/InfoList";
import { DocumentForm } from "../../../_components/DocumentForm";
import { DocumentList } from "../../../_components/DocumentList";
import { PageBody, PageHeader } from "../../../_components/PageHeader";

export const dynamic = "force-dynamic";

// Инфо-раздел дома и Библиотека документов (председатель).
export default async function BuildingInfoPage({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}) {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");
  const osiId = activeChairmanOsi(auth);
  if (!osiId) redirect("/app");

  const { buildingId } = await params;
  const building = await getBuilding(osiId, buildingId);
  if (!building) notFound();

  const items = await listInfoItems(osiId, buildingId);
  const documents = await listDocuments(osiId, buildingId);

  return (
    <>
      <PageHeader
        title="Инфо-раздел и Документы"
        subtitle="Контакты, реквизиты, нормативные и отчетные документы"
        back={{ href: `/app/buildings/${buildingId}`, label: building.address }}
      />
      <PageBody wide>
        <div className="grid gap-8">
          {/* Секция 1: Библиотека документов */}
          <section className="grid gap-4">
            <h2 className="text-xl font-bold">Библиотека документов</h2>
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="pt-6">
                  <DocumentForm buildingId={buildingId} />
                </CardContent>
              </Card>
              <DocumentList documents={documents} isChairman />
            </div>
          </section>

          <hr className="border-border" />

          {/* Секция 2: Контакты и инфо-блок */}
          <section className="grid gap-4">
            <h2 className="text-xl font-bold">Полезная информация и контакты</h2>
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="pt-6">
                  <InfoForm buildingId={buildingId} />
                </CardContent>
              </Card>
              <InfoList items={items} />
            </div>
          </section>
        </div>
      </PageBody>
    </>
  );
}
