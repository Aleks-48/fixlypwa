import { requireMember } from "@/lib/auth/residentPage";
import { getOccupantBuilding } from "@/lib/comms/service";
import { listPolls } from "@/lib/polls/service";
import { getTranslation } from "@/lib/i18n/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PollCard } from "../_components/PollCard";
import { PageBody, PageHeader } from "../_components/PageHeader";

export const dynamic = "force-dynamic";

export default async function ResidentPollsPage() {
  const { t } = await getTranslation();
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
        title={t("nav_polls")}
        subtitle={waiting > 0 ? `${waiting} ${t("label_waiting_your_vote")}` : t("label_building_polls")}
      />
      <PageBody>
        {!occ ? (
          <p className="text-sm text-muted-foreground">
            {t("label_apartment_not_linked")}
          </p>
        ) : (
          <Tabs defaultValue="open">
            <TabsList className="mb-4">
              <TabsTrigger value="open">{t("active_polls")} · {open.length}</TabsTrigger>
              <TabsTrigger value="closed">{t("label_closed_polls")} · {closed.length}</TabsTrigger>
            </TabsList>
            <TabsContent value="open">
              {open.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("label_no_active_polls")}</p>
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
                <p className="text-sm text-muted-foreground">{t("label_no_closed_polls")}</p>
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
