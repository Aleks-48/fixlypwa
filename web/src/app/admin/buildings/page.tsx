import { requireSuperadminPage } from "@/lib/auth/adminPage";
import { listAllBuildingsWithApartments } from "@/lib/admin/service";
import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

// Экран просмотра всех домов и помещений (срез 27).
export default async function AdminBuildingsPage() {
  await requireSuperadminPage();
  const buildings = await listAllBuildingsWithApartments();

  return (
    <>
      <h1 className="mb-4 mt-0 text-xl font-bold">Дома и квартиры</h1>

      {buildings.length === 0 && (
        <p className="text-sm text-muted-foreground">Дома не найдены.</p>
      )}

      <div className="grid gap-3">
        {buildings.map((b) => (
          <Card key={b.id} className="rounded-2xl shadow-sm" data-testid="admin-building-card">
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <Building2 size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <strong className="text-[15px] font-bold block truncate">
                    {b.address}
                  </strong>
                  <p className="m-0 mt-0.5 text-sm text-muted-foreground">
                    ОСИ: {b.osiName} · {b.city}
                  </p>
                  {b.builtYear && (
                    <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                      Год постройки: {b.builtYear}
                    </p>
                  )}

                  {b.apartments.length > 0 ? (
                    <details className="mt-3 text-sm group" data-testid="apartments-details">
                      <summary className="cursor-pointer font-medium text-xs text-muted-foreground hover:text-foreground select-none">
                        Помещения ({b.apartments.length})
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {b.apartments.map((apt) => (
                          <span
                            key={apt.id}
                            className="rounded-full bg-secondary/60 px-2.5 py-0.5 text-xs text-secondary-foreground font-medium"
                          >
                            кв. {apt.number}
                            {apt.area ? ` (${apt.area} м²)` : ""}
                          </span>
                        ))}
                      </div>
                    </details>
                  ) : (
                    <p className="m-0 mt-2 text-xs text-muted-foreground">
                      Помещения не зарегистрированы.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
