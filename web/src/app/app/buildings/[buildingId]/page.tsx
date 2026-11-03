import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Megaphone, Wrench, Wallet, FileText, ListTodo, Info } from "lucide-react";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { getBuilding, listApartmentsWithOccupants } from "@/lib/onboarding/service";
import { getTranslation } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AddApartmentForm } from "../../_components/AddApartmentForm";
import { ImportApartmentsForm } from "../../_components/ImportApartmentsForm";
import { AddResidentForm } from "../../_components/AddResidentForm";
import { PageBody, PageHeader } from "../../_components/PageHeader";

export const dynamic = "force-dynamic";

// Управление домом: квартиры + привязка жителей (REQ-011/013). Данные читаются через forTenant
// (RLS): чужой дом вернёт null → 404.
export default async function BuildingPage({
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

  const apartments = await listApartmentsWithOccupants(osiId, buildingId);

  const NAV = [
    { href: "announcements", labelKey: "nav_announcements", icon: Megaphone, testid: "nav-announcements" },
    { href: "requests", labelKey: "nav_requests_chairman", icon: Wrench, testid: "nav-requests" },
    { href: "finance", labelKey: "nav_payments", icon: Wallet, testid: "nav-finance" },
    { href: "reports", labelKey: "nav_reports", icon: FileText, testid: "nav-reports" },
    { href: "polls", labelKey: "nav_polls", icon: ListTodo, testid: "nav-polls" },
    { href: "info", labelKey: "nav_info", icon: Info, testid: "nav-info" },
  ] as const;

  return (
    <>
      <PageHeader
        title={building.address}
        subtitle={`${apartments.length} ${t("label_apartments")}`}
        back={{ href: "/app", label: t("label_back_to_buildings") }}
      />
      <PageBody wide>
      <nav className="mb-6 flex flex-wrap gap-2">
        {NAV.map(({ href, labelKey, icon: Icon, testid }) => (
          <Button key={href} asChild variant="outline" size="sm" className="h-9 rounded-full px-3.5">
            <Link href={`/app/buildings/${building.id}/${href}`} data-testid={testid}>
              <Icon aria-hidden size={14} />
              {t(labelKey)}
            </Link>
          </Button>
        ))}
      </nav>

      <section className="grid gap-6">
        <div className="grid gap-3">
          <h2 className="m-0 text-base font-semibold">{t("label_apartments")} ({apartments.length})</h2>
          {apartments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("label_no_apartments")}</p>
          ) : (
            <ul className="m-0 grid list-none gap-2.5 p-0">
              {apartments.map((apt) => (
                <li key={apt.id} data-testid="apartment-row">
                  <Card className="rounded-2xl shadow-sm">
                    <CardContent className="pt-6">
                      <div className="flex items-baseline justify-between">
                        <strong className="text-sm font-semibold">{t("label_apt_short")} {apt.number}</strong>
                        {apt.area != null && (
                          <span className="text-sm text-muted-foreground">{String(apt.area)} м²</span>
                        )}
                      </div>
                      {apt.occupants.length > 0 && (
                        <ul className="m-0 mt-1.5 grid list-none gap-0.5 p-0 text-sm text-muted-foreground">
                          {apt.occupants.map((o) => {
                            const contact = o.phone ?? o.user.email;
                            return (
                              <li key={o.id}>
                                {o.fullName}
                                {contact ? ` · ${contact}` : ""}
                              </li>
                            );
                          })}
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
          <h2 className="m-0 text-base font-semibold">{t("label_add_apartment")}</h2>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <AddApartmentForm buildingId={building.id} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3">
          <h2 className="m-0 text-base font-semibold">{t("label_import_apartments")}</h2>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <ImportApartmentsForm buildingId={building.id} />
            </CardContent>
          </Card>
        </div>
      </section>
      </PageBody>
    </>
  );
}
