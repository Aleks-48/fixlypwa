import { requireMember } from "@/lib/auth/residentPage";
import { getOccupantBuilding, listRequests } from "@/lib/comms/service";
import { getTranslation } from "@/lib/i18n/server";
import { Card, CardContent } from "@/components/ui/card";
import { RequestForm } from "../_components/RequestForm";
import { RequestCard } from "../_components/RequestCard";
import { PageBody, PageHeader } from "../_components/PageHeader";

export const dynamic = "force-dynamic";

export default async function ResidentRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { t } = await getTranslation();
  const { category } = await searchParams;
  const { auth, osiId } = await requireMember();
  const occ = await getOccupantBuilding(osiId, auth.user.id);
  const requests = occ
    ? await listRequests(osiId, { authorUserId: auth.user.id })
    : [];
  const inWork = requests.filter((r) => r.status !== "RESOLVED").length;

  return (
    <>
      <PageHeader
        title={t("nav_requests")}
        subtitle={`${inWork} ${t("status_in_progress").toLowerCase()} · ${requests.length - inWork} ${t("status_resolved").toLowerCase()}`}
      />
      <PageBody wide>
        {!occ ? (
          <p className="text-sm text-muted-foreground">
            {t("label_apartment_not_linked")}
          </p>
        ) : (
          <section className="grid items-start gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6">
                <h2 className="m-0 mb-4 text-base font-bold">{t("label_new_request")}</h2>
                <RequestForm defaultCategory={category} />
              </CardContent>
            </Card>
            <div className="grid gap-3">
              <h2 className="m-0 text-base font-semibold">{t("nav_requests")}</h2>
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("label_no_requests")}</p>
              ) : (
                <ul className="m-0 grid list-none gap-3 p-0">
                  {requests.map((r) => (
                    <li key={r.id}>
                      <RequestCard
                        request={r}
                        canChangeStatus={false}
                        currentUserId={auth.user.id}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </PageBody>
    </>
  );
}
