import { requireMember } from "@/lib/auth/residentPage";
import { getOccupantBuilding } from "@/lib/comms/service";
import { listPolls } from "@/lib/polls/service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PollCard } from "../_components/PollCard";
import { PageBody, PageHeader } from "../_components/PageHeader";

export const dynamic = "force-dynamic";

// «Голосования» жителя (ui-redesign.md §3): активные/завершённые опросы дома.
// Данные — реальные lite-опросы (features.md блок C); юридические голосования — Тир 2.
export default async function ResidentPollsPage() {
  const { auth, osiId } = await requireMember();
  const occ = await getOccupantBuilding(osiId, auth.user.id);
  const polls = occ?.apartment
    ? await listPolls(osiId, occ.apartment.buildingId, auth.user.id)
    : [];
  const open = polls.filter((p) => !p.closed);
  const closed = polls.filter((p) => p.closed);
  const waiting = open.filter((p) => p.myOptionId === null).length;

  return (
    <>
      <PageHeader
        title="Голосования"
        subtitle={waiting > 0 ? `${waiting} ждут вашего голоса` : "Опросы вашего дома"}
      />
      <PageBody>
        {!occ ? (
          <p className="text-sm text-muted-foreground">
            Ваша квартира ещё не привязана — обратитесь к председателю.
          </p>
        ) : (
          <Tabs defaultValue="open">
            <TabsList className="mb-4">
              <TabsTrigger value="open">Активные · {open.length}</TabsTrigger>
              <TabsTrigger value="closed">Завершённые · {closed.length}</TabsTrigger>
            </TabsList>
            <TabsContent value="open">
              {open.length === 0 ? (
                <p className="text-sm text-muted-foreground">Активных опросов нет.</p>
              ) : (
                <div className="grid gap-4">
                  {open.map((p) => (
                    <PollCard key={p.id} poll={p} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="closed">
              {closed.length === 0 ? (
                <p className="text-sm text-muted-foreground">Завершённых опросов нет.</p>
              ) : (
                <div className="grid gap-4">
                  {closed.map((p) => (
                    <PollCard key={p.id} poll={p} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </PageBody>
    </>
  );
}
