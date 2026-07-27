import { requireMember } from "@/lib/auth/residentPage";
import { getOccupantBuilding, listRequests } from "@/lib/comms/service";
import { Card, CardContent } from "@/components/ui/card";
import { RequestForm } from "../_components/RequestForm";
import { RequestCard } from "../_components/RequestCard";
import { PageBody, PageHeader } from "../_components/PageHeader";

export const dynamic = "force-dynamic";

// Вкладка «Заявки» жителя: подать + мои заявки со статусом и тредом (features.md блок B).
// ?category=OTHER — предвыбор из «Написать председателю» (заметки п.8).
export default async function ResidentRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
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
        title="Мои заявки"
        subtitle={`${inWork} в работе · ${requests.length - inWork} закрыто`}
      />
      <PageBody wide>
        {!occ ? (
          <p className="text-sm text-muted-foreground">
            Ваша квартира ещё не привязана — обратитесь к председателю.
          </p>
        ) : (
          <section className="grid items-start gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="pt-6">
                <h2 className="m-0 mb-4 text-base font-bold">Новая заявка</h2>
                <RequestForm defaultCategory={category} />
              </CardContent>
            </Card>
            <div className="grid gap-3">
              <h2 className="m-0 text-base font-semibold">Мои заявки</h2>
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">Заявок пока нет.</p>
              ) : (
                <ul className="m-0 grid list-none gap-3 p-0">
                  {requests.map((r) => (
                    <li key={r.id}>
                      <RequestCard request={r} canChangeStatus={false} />
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
