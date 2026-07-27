import { notFound, redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { getBuilding } from "@/lib/onboarding/service";
import { listInfoItems } from "@/lib/comms/service";
import { Card, CardContent } from "@/components/ui/card";
import { InfoForm } from "../../../_components/InfoForm";
import { InfoList } from "../../../_components/InfoList";
import { PageBody, PageHeader } from "../../../_components/PageHeader";

export const dynamic = "force-dynamic";

// Инфо-раздел дома (председатель): вывоз мусора, аварийные контакты, реквизиты (features.md блок B).
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

  return (
    <>
      <PageHeader
        title="Инфо-раздел"
        subtitle="Контакты, вывоз мусора, реквизиты — видно жителям"
        back={{ href: `/app/buildings/${buildingId}`, label: building.address }}
      />
      <PageBody wide>
        <section className="grid items-start gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <InfoForm buildingId={buildingId} />
            </CardContent>
          </Card>
          <InfoList items={items} />
        </section>
      </PageBody>
    </>
  );
}
