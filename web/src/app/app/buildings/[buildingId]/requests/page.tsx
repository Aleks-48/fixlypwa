import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { getBuilding } from "@/lib/onboarding/service";
import { listRequests } from "@/lib/comms/service";
import { getListingsByRequestIds, listOffersWithMasters } from "@/lib/market/service";
import { RequestCard } from "../../../_components/RequestCard";
import { PageBody, PageHeader } from "../../../_components/PageHeader";

export const dynamic = "force-dynamic";

// Заявки дома (председатель): фильтр-пиллы по статусу (макет) + смена статуса + тред.
// Фильтр — серверный, через ?status= (пиллы-ссылки): не требует клиентизации RequestCard.
const FILTERS = [
  { key: "", label: "Все", tone: "bg-primary text-primary-foreground" },
  { key: "RECEIVED", label: "Новые", tone: "bg-destructive-soft text-destructive" },
  { key: "IN_PROGRESS", label: "В работе", tone: "bg-warning-soft text-warning" },
  { key: "RESOLVED", label: "Решённые", tone: "bg-success-soft text-success" },
] as const;

export default async function BuildingRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ buildingId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");
  const osiId = activeChairmanOsi(auth);
  if (!osiId) redirect("/app");

  const { buildingId } = await params;
  const building = await getBuilding(osiId, buildingId);
  if (!building) notFound();

  const { status } = await searchParams;
  const requests = await listRequests(osiId, { buildingId });
  const shown = status ? requests.filter((r) => r.status === status) : requests;

  // Маркетплейс (marketplace.md M4): листинги пачкой (1 запрос), офферы — по каждому листингу.
  const listings = await getListingsByRequestIds(
    osiId,
    shown.map((r) => r.id),
  );
  const listingByRequestId = new Map(listings.map((l) => [l.requestId, l]));
  const offersByListingId = new Map(
    await Promise.all(
      listings.map(async (l) => [l.id, await listOffersWithMasters(osiId, l.id)] as const),
    ),
  );

  const count = (key: string) =>
    key ? requests.filter((r) => r.status === key).length : requests.length;
  const newCount = count("RECEIVED");
  const inWork = count("IN_PROGRESS");

  return (
    <>
      <PageHeader
        title="Заявки жителей"
        subtitle={`${newCount} новых · ${inWork} в работе · ${requests.length - newCount - inWork} закрыто`}
        back={{ href: `/app/buildings/${buildingId}`, label: building.address }}
      />
      <PageBody>
        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = (status ?? "") === f.key;
            return (
              <Link
                key={f.key}
                href={f.key ? `?status=${f.key}` : `/app/buildings/${buildingId}/requests`}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold no-underline transition-opacity ${
                  active ? f.tone : "bg-secondary text-muted-foreground hover:opacity-80"
                }`}
              >
                {f.label} · {count(f.key)}
              </Link>
            );
          })}
        </div>
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">Заявок пока нет.</p>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0">
            {shown.map((r) => {
              const listing = listingByRequestId.get(r.id) ?? null;
              return (
                <li key={r.id}>
                  <RequestCard
                    request={r}
                    canChangeStatus
                    marketplace={{
                      listing: listing
                        ? {
                            id: listing.id,
                            status: listing.status,
                            title: listing.title,
                            description: listing.description,
                            photoUrls: listing.photoUrls,
                          }
                        : null,
                      offers: listing ? (offersByListingId.get(listing.id) ?? []) : [],
                    }}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </PageBody>
    </>
  );
}
