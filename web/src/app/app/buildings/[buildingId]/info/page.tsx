import { notFound, redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { getBuilding } from "@/lib/onboarding/service";
import { listInfoItems } from "@/lib/comms/service";
import { Card, CardContent } from "@/components/ui/card";
import { InfoForm } from "../../../_components/InfoForm";
import { InfoList } from "../../../_components/InfoList";
import { PageBody, PageHeader } from "../../../_components/PageHeader";
import { getTranslation } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// Инфо-раздел дома (председатель).
export default async function BuildingInfoPage({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}) {
  const { t } = await getTranslation();
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
        title={t("title_chairman_info")}
        subtitle={t("subtitle_info")}
        back={{ href: `/app/buildings/${buildingId}`, label: building.address }}
      />
      <PageBody wide>
        <section className="grid gap-4">
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6">
                <InfoForm buildingId={buildingId} />
              </CardContent>
            </Card>
            <InfoList items={items} />
          </div>
        </section>
      </PageBody>
    </>
  );
}