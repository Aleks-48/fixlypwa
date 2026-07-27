import { requireSuperadminPage } from "@/lib/auth/adminPage";
import { listAllAnnouncements } from "@/lib/admin/service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteAdminButton } from "../_components/DeleteAdminButton";

export const dynamic = "force-dynamic";

const SCOPE_LABELS: Record<string, string> = {
  BUILDING: "Весь дом",
  ENTRANCE: "Подъезд",
  APARTMENT: "Квартира",
};

// Экран просмотра всех объявлений (срез 27).
export default async function AdminAnnouncementsPage() {
  await requireSuperadminPage();
  const announcements = await listAllAnnouncements();

  return (
    <>
      <h1 className="mb-4 mt-0 text-xl font-bold">Объявления</h1>

      {announcements.length === 0 && (
        <p className="text-sm text-muted-foreground">Объявлений пока нет.</p>
      )}

      <div className="grid gap-3">
        {announcements.map((a) => (
          <Card key={a.id} className="rounded-2xl shadow-sm" data-testid="admin-announcement-card">
            <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-5">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <Badge className="rounded-full bg-secondary text-secondary-foreground border-none">
                    {SCOPE_LABELS[a.scope] ?? a.scope}
                  </Badge>
                  {a.isPinned && (
                    <Badge className="rounded-full bg-primary-soft text-primary border-none font-semibold">
                      Закреплено
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {a.createdAt.toLocaleDateString("ru-RU")} · {a.createdAt.toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <h3 className="text-[15px] font-bold text-foreground mb-1">
                  {a.title}
                </h3>
                <p className="text-sm text-foreground mb-2 break-words max-w-prose">
                  {a.body}
                </p>

                <p className="m-0 text-xs text-muted-foreground">
                  ОСИ: {a.osiName} · {a.building.address}
                </p>
                <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                  Автор: {a.author?.fullName || "Без имени"} ({a.author?.phone || a.author?.email || "—"})
                </p>
              </div>

              <div className="flex flex-col items-end gap-2 self-center sm:self-start">
                <DeleteAdminButton
                  endpoint="/api/admin/announcements"
                  body={{ osiId: a.osiId, announcementId: a.id }}
                  testId="admin-delete-announcement"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
