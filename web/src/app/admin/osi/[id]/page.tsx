import { notFound } from "next/navigation";
import { requireSuperadminPage } from "@/lib/auth/adminPage";
import { getOsiDetail } from "@/lib/admin/service";
import { Card, CardContent } from "@/components/ui/card";
import { GrantChairmanForm } from "../../_components/GrantChairmanForm";
import { ResetPasswordButton } from "../../_components/ResetPasswordButton";
import { SubscriptionEditor } from "../../_components/SubscriptionEditor";

export const dynamic = "force-dynamic";

// Карточка ОСИ (admin-panel.md §3–4): дома с подписками (REQ-111) и председатели (REQ-112).
export default async function AdminOsiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperadminPage();
  const { id } = await params;
  const detail = await getOsiDetail(id);
  if (!detail) notFound();
  const { osi, buildings } = detail;

  return (
    <>
      <h1 className="mb-1 mt-0 text-xl font-bold" data-testid="admin-osi-name">
        {osi.name}
      </h1>
      <p className="mb-5 mt-0 text-sm text-muted-foreground">
        {osi.bin ? `БИН ${osi.bin} · ` : ""}создана {osi.createdAt.toLocaleDateString("ru-RU")}
      </p>

      <h2 className="mb-2 mt-0 text-base font-bold">Дома и подписки</h2>
      {buildings.length === 0 && <p className="text-sm text-muted-foreground">Домов пока нет.</p>}
      <div className="mb-6 grid gap-3">
        {buildings.map((b) => (
          <Card key={b.id} className="rounded-2xl shadow-sm" data-testid="admin-building-card">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
              <div>
                <strong className="text-[15px] font-bold">{b.address}</strong>
                <p className="m-0 mt-1 text-sm text-muted-foreground">
                  {b.subscription
                    ? `Подписка: ${b.subscription.status} с ${b.subscription.periodStart.toLocaleDateString("ru-RU")}${
                        b.subscription.periodEnd
                          ? ` по ${b.subscription.periodEnd.toLocaleDateString("ru-RU")}`
                          : ""
                      }`
                    : "Подписки нет"}
                </p>
              </div>
              <SubscriptionEditor
                osiId={osi.id}
                buildingId={b.id}
                currentStatus={b.subscription?.status ?? null}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mb-2 mt-0 text-base font-bold">Председатели</h2>
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="pt-5">
          {osi.roles.length === 0 && (
            <p className="mt-0 text-sm text-muted-foreground">Председателей пока нет.</p>
          )}
          <ul className="m-0 mb-4 grid list-none gap-2 p-0">
            {osi.roles.map((r) => (
              <li
                key={r.userId}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
                data-testid="admin-chairman-row"
              >
                <span>
                  {r.user.email ?? r.user.phone}
                  {r.user.email ? ` · ${r.user.phone}` : ""}
                  {r.role === "SUPERADMIN" ? " · саппорт-доступ" : ""}
                </span>
                {r.user.email && <ResetPasswordButton userId={r.userId} />}
              </li>
            ))}
          </ul>
          <GrantChairmanForm osiId={osi.id} />
        </CardContent>
      </Card>
    </>
  );
}
