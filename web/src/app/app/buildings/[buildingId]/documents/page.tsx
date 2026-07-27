import { notFound, redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { getBuilding } from "@/lib/onboarding/service";
import { listDocuments } from "@/lib/documents/service";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentForm } from "../../../_components/DocumentForm";
import { DocumentList } from "../../../_components/DocumentList";
import { PageBody, PageHeader } from "../../../_components/PageHeader";

export const dynamic = "force-dynamic";

// Отдельная страница «Библиотека документов» дома (Председатель).
export default async function ChairmanDocumentsPage({
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

  const documents = await listDocuments(osiId, buildingId);

  return (
    <>
      <PageHeader
        title="Библиотека документов"
        subtitle="Нормативные акты, протоколы, договоры и документы дома"
        back={{ href: `/app/buildings/${buildingId}`, label: building.address }}
      />
      <PageBody wide>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <DocumentForm buildingId={buildingId} />
            </CardContent>
          </Card>
          <DocumentList documents={documents} isChairman />
        </div>
      </PageBody>
    </>
  );
}
