import { requireSuperadminPage } from "@/lib/auth/adminPage";
import { listMasters } from "@/lib/admin/service";
import { requestCategoryLabels } from "@/lib/comms/labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MasterStatusActions } from "../_components/MasterStatusActions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "На проверке",
  APPROVED: "Одобрен",
  REJECTED: "Отклонён",
  BLOCKED: "Заблокирован",
};

const STATUS_TONE: Record<string, string> = {
  PENDING: "bg-warning-soft text-warning",
  APPROVED: "bg-success-soft text-success",
  REJECTED: "bg-destructive-soft text-destructive",
  BLOCKED: "bg-destructive-soft text-destructive",
};

// Верификация мастеров (REQ-114, закрывает Q-053): PENDING первыми, действия по каждой анкете.
export default async function AdminMastersPage() {
  await requireSuperadminPage();
  const masters = await listMasters();

  return (
    <>
      <h1 className="mb-4 mt-0 text-xl font-bold">Мастера</h1>
      {masters.length === 0 && <p className="text-sm text-muted-foreground">Анкет пока нет.</p>}
      <div className="grid gap-3">
        {masters.map((m) => (
          <Card key={m.id} className="rounded-2xl shadow-sm" data-testid="admin-master-card">
            <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-5">
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-[15px] font-bold">{m.fullName}</strong>
                  <Badge className={`rounded-full border-none ${STATUS_TONE[m.status] ?? ""}`}>
                    {STATUS_LABELS[m.status] ?? m.status}
                  </Badge>
                </div>
                <p className="m-0 mt-1 text-sm text-muted-foreground">
                  {m.user.phone}
                  {m.user.email ? ` · ${m.user.email}` : ""} · {m.city}
                </p>
                <p className="m-0 mt-1 text-sm text-muted-foreground">
                  {m.categories.map((c) => requestCategoryLabels[c] ?? c).join(", ")}
                </p>
                {m.bio && <p className="m-0 mt-2 max-w-prose text-sm">{m.bio}</p>}
                <p className="m-0 mt-1 text-xs text-muted-foreground">
                  Подана {m.createdAt.toLocaleDateString("ru-RU")}
                </p>
              </div>
              <MasterStatusActions masterId={m.id} status={m.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
