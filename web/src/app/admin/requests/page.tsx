import { requireSuperadminPage } from "@/lib/auth/adminPage";
import { listAllRequests } from "@/lib/admin/service";
import { requestCategoryLabels, requestStatusLabels } from "@/lib/comms/labels";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteAdminButton } from "../_components/DeleteAdminButton";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  RECEIVED: "bg-warning-soft text-warning",
  IN_PROGRESS: "bg-primary-soft text-primary",
  RESOLVED: "bg-success-soft text-success",
};

// Экран просмотра всех заявок жителей (срез 27).
export default async function AdminRequestsPage() {
  await requireSuperadminPage();
  const requests = await listAllRequests();

  return (
    <>
      <h1 className="mb-4 mt-0 text-xl font-bold">Заявки</h1>

      {requests.length === 0 && (
        <p className="text-sm text-muted-foreground">Заявок пока нет.</p>
      )}

      <div className="grid gap-3">
        {requests.map((r) => (
          <Card key={r.id} className="rounded-2xl shadow-sm" data-testid="admin-request-card">
            <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-5">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <Badge className="rounded-full bg-secondary text-secondary-foreground border-none">
                    {requestCategoryLabels[r.category] ?? r.category}
                  </Badge>
                  <Badge className={`rounded-full border-none ${STATUS_TONE[r.status] ?? ""}`}>
                    {requestStatusLabels[r.status] ?? r.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {r.createdAt.toLocaleDateString("ru-RU")} · {r.createdAt.toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-sm text-foreground mb-2 break-words max-w-prose">
                  {r.text}
                </p>

                <p className="m-0 text-xs text-muted-foreground">
                  ОСИ: {r.osiName} · {r.building.address}
                  {r.apartment ? ` · кв. ${r.apartment.number}` : ""}
                </p>
                <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                  Автор: {r.author?.fullName || "Без имени"} ({r.author?.phone || r.author?.email || "—"})
                </p>
              </div>

              <div className="flex flex-col items-end gap-2 self-center sm:self-start">
                <DeleteAdminButton
                  endpoint="/api/admin/requests"
                  body={{ osiId: r.osiId, requestId: r.id }}
                  testId="admin-delete-request"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
