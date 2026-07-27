import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Megaphone, Wrench, Wallet, FileText, ListTodo, Info } from "lucide-react";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { getBuilding, listApartmentsWithOccupants } from "@/lib/onboarding/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AddApartmentForm } from "../../_components/AddApartmentForm";
import { AddResidentForm } from "../../_components/AddResidentForm";
import { PageBody, PageHeader } from "../../_components/PageHeader";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "announcements", label: "Объявления", icon: Megaphone, testid: "nav-announcements" },
  { href: "requests", label: "Заявки", icon: Wrench, testid: "nav-requests" },
  { href: "finance", label: "Финансы", icon: Wallet, testid: "nav-finance" },
  { href: "reports", label: "Отчёты", icon: FileText, testid: "nav-reports" },
  { href: "polls", label: "Опросы", icon: ListTodo, testid: "nav-polls" },
  { href: "info", label: "Инфо", icon: Info, testid: "nav-info" },
] as const;

// Управление домом: квартиры + привязка жителей (REQ-011/013). Данные читаются через forTenant
// (RLS): чужой дом вернёт null → 404.
export default async function BuildingPage({
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

  const apartments = await listApartmentsWithOccupants(osiId, buildingId);

  return (
    <>
      <PageHeader
        title={building.address}
        subtitle={`${apartments.length} квартир`}
        back={{ href: "/app", label: "К домам" }}
      />
      <PageBody wide>
      <nav className="mb-6 flex flex-wrap gap-2">
        {NAV.map(({ href, label, icon: Icon, testid }) => (
          <Button key={href} asChild variant="outline" size="sm" className="h-9 rounded-full px-3.5">
            <Link href={`/app/buildings/${building.id}/${href}`} data-testid={testid}>
              <Icon aria-hidden size={14} />
              {label}
            </Link>
          </Button>
        ))}
      </nav>

      <section className="grid gap-6">
        <div className="grid gap-3">
          <h2 className="m-0 text-base font-semibold">Квартиры ({apartments.length})</h2>
          {apartments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Квартир пока нет. Добавьте первую ниже.</p>
          ) : (
            <ul className="m-0 grid list-none gap-2.5 p-0">
              {apartments.map((apt) => (
                <li key={apt.id} data-testid="apartment-row">
                  <Card className="rounded-2xl shadow-sm">
                    <CardContent className="pt-6">
                      <div className="flex items-baseline justify-between">
                        <strong className="text-sm font-semibold">Кв. {apt.number}</strong>
                        {apt.area != null && (
                          <span className="text-sm text-muted-foreground">{String(apt.area)} м²</span>
                        )}
                      </div>
                      {apt.occupants.length > 0 && (
                        <ul className="m-0 mt-1.5 grid list-none gap-0.5 p-0 text-sm text-muted-foreground">
                          {apt.occupants.map((o) => (
                            <li key={o.id}>
                              {o.fullName} · {o.phone}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-2">
                        <AddResidentForm apartmentId={apt.id} />
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-3">
          <h2 className="m-0 text-base font-semibold">Добавить квартиру</h2>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <AddApartmentForm buildingId={building.id} />
            </CardContent>
          </Card>
        </div>
      </section>
      </PageBody>
    </>
  );
}
