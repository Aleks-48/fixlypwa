import { notFound, redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { getBuilding } from "@/lib/onboarding/service";
import { listAnnouncements } from "@/lib/comms/service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnnouncementForm } from "../../../_components/AnnouncementForm";
import { PageBody, PageHeader } from "../../../_components/PageHeader";
import { getTranslation } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// Объявления дома (председатель): публикация + список со счётчиком прочтений (features.md блок B).
export default async function BuildingAnnouncementsPage({
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

  const announcements = await listAnnouncements(osiId, buildingId, auth.user.id);

  return (
    <>
      <PageHeader
        title={t("title_chairman_announcements")}
        subtitle={t("subtitle_announcements")}
        back={{ href: `/app/buildings/${buildingId}`, label: building.address }}
      />
      <PageBody wide>
        <section className="grid items-start gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <h2 className="m-0 mb-4 text-base font-bold">Новое объявление</h2>
              <AnnouncementForm buildingId={buildingId} />
            </CardContent>
          </Card>

          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Объявлений пока нет.</p>
          ) : (
            <ul className="m-0 grid list-none gap-3 p-0">
              {announcements.map((a) => (
                <li key={a.id} data-testid="ann-row">
                  <Card className="rounded-2xl shadow-sm">
                    <CardContent className="pt-6">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-sm font-semibold">{a.title}</strong>
                        <Badge variant="secondary" className="rounded-full" data-testid="ann-readcount">
                          Прочитали: {a.readCount}
                        </Badge>
                      </div>
                      <p className="m-0 mt-1.5 text-sm">{a.body}</p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageBody>
    </>
  );
}
