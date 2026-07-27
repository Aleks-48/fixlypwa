import { notFound, redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { getBuilding } from "@/lib/onboarding/service";
import { listPolls } from "@/lib/polls/service";
import { Card, CardContent } from "@/components/ui/card";
import { PollForm } from "../../../_components/PollForm";
import { PollCard } from "../../../_components/PollCard";
import { PageBody, PageHeader } from "../../../_components/PageHeader";

export const dynamic = "force-dynamic";

// Опросы дома (председатель): создание + живые результаты (Тир 1 lite).
export default async function BuildingPollsPage({
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

  const polls = await listPolls(osiId, buildingId, auth.user.id);

  const open = polls.filter((p) => !p.closed);

  return (
    <>
      <PageHeader
        title="Голосования"
        subtitle={`${open.length} активных · ${polls.length - open.length} завершённых`}
        back={{ href: `/app/buildings/${buildingId}`, label: building.address }}
      />
      <PageBody wide>
        <section className="grid items-start gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <h2 className="m-0 mb-4 text-base font-bold">Создать голосование</h2>
              <PollForm buildingId={buildingId} />
            </CardContent>
          </Card>
          {polls.length === 0 ? (
            <p className="text-sm text-muted-foreground">Опросов пока нет.</p>
          ) : (
            <div className="grid gap-5">
              {open.length > 0 && (
                <div className="grid gap-3">
                  <h2 className="m-0 text-base font-semibold">Активные</h2>
                  {open.map((p) => (
                    <PollCard key={p.id} poll={p} showResults />
                  ))}
                </div>
              )}
              {polls.length > open.length && (
                <div className="grid gap-3">
                  <h2 className="m-0 text-base font-semibold">Завершённые</h2>
                  {polls
                    .filter((p) => p.closed)
                    .map((p) => (
                      <PollCard key={p.id} poll={p} showResults />
                    ))}
                </div>
              )}
            </div>
          )}
        </section>
      </PageBody>
    </>
  );
}
