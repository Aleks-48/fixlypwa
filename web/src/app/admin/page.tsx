import Link from "next/link";
import { requireSuperadminPage } from "@/lib/auth/adminPage";
import { platformStats } from "@/lib/admin/service";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

// Дашборд платформы (REQ-113): identity-счётчики одним запросом, тенантные — суммой
// forTenant-циклом по ОСИ (ADR-0008 — приемлемо на целевом масштабе).
export default async function AdminDashboardPage() {
  await requireSuperadminPage();
  const stats = await platformStats();

  const tiles: { label: string; value: number; href?: string }[] = [
    { label: "ОСИ", value: stats.osiCount, href: "/admin/osi" },
    { label: "Пользователи", value: stats.userCount },
    { label: "Дома", value: stats.buildings },
    { label: "Квартиры", value: stats.apartments },
    { label: "Открытые заявки", value: stats.openRequests },
    {
      label: "Мастера на проверке",
      value: stats.masters.PENDING ?? 0,
      href: "/admin/masters",
    },
  ];

  return (
    <>
      <h1 className="mb-4 mt-0 text-xl font-bold">Платформа</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3" data-testid="admin-stats">
        {tiles.map((t) => (
          <Card key={t.label} className="rounded-2xl shadow-sm">
            <CardContent className="pt-5">
              <p className="m-0 text-3xl font-extrabold">{t.value}</p>
              {t.href ? (
                <Link href={t.href} className="text-sm text-muted-foreground underline">
                  {t.label}
                </Link>
              ) : (
                <p className="m-0 text-sm text-muted-foreground">{t.label}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
