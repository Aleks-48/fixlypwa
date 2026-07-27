import Link from "next/link";
import { requireSuperadminPage } from "@/lib/auth/adminPage";
import { listOsisWithStats } from "@/lib/admin/service";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

// Список всех ОСИ платформы (admin-panel.md §3): identity + агрегаты через forTenant.
export default async function AdminOsiListPage() {
  await requireSuperadminPage();
  const osis = await listOsisWithStats();

  return (
    <>
      <h1 className="mb-4 mt-0 text-xl font-bold">ОСИ</h1>
      {osis.length === 0 && <p className="text-sm text-muted-foreground">ОСИ пока нет.</p>}
      <div className="grid gap-3">
        {osis.map((osi) => {
          const subs = Object.entries(osi.subscriptions);
          return (
          <Card key={osi.id} className="rounded-2xl shadow-sm" data-testid="admin-osi-card">
            <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-5">
              <div>
                <Link
                  href={`/admin/osi/${osi.id}`}
                  className="text-[15px] font-bold underline-offset-2 hover:underline"
                >
                  {osi.name}
                </Link>
                <p className="m-0 mt-1 text-sm text-muted-foreground">
                  {osi.bin ? `БИН ${osi.bin} · ` : ""}
                  домов: {osi.buildingsCount} · создана {osi.createdAt.toLocaleDateString("ru-RU")}
                </p>
                <p className="m-0 mt-1 text-sm text-muted-foreground">
                  Председатели:{" "}
                  {osi.chairmen.length > 0
                    ? osi.chairmen.map((c) => c.email ?? c.phone).join(", ")
                    : "—"}
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                {subs.length > 0
                  ? subs.map(([status, count]) => `${status}: ${count}`).join(" · ")
                  : "подписок нет"}
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
    </>
  );
}
