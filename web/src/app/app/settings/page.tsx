import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeMemberOsi } from "@/lib/auth/guards";
import { getOrCreateNotifPrefs } from "@/lib/settings/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageBody, PageHeader } from "../_components/PageHeader";
import { ProfileSettingsForm } from "../_components/ProfileSettingsForm";
import { NotificationPrefsForm } from "../_components/NotificationPrefsForm";
import { User, Bell } from "lucide-react";

export const dynamic = "force-dynamic";

// Персональные настройки аккаунта жителя (settings.md §1.2, REQ-046..048)
export default async function ResidentSettingsPage() {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");
  const osiId = activeMemberOsi(auth);
  if (!osiId) redirect("/app");

  const { user } = auth;

  // Предпочтения уведомлений (upsert — создадим если нет)
  const prefs = await getOrCreateNotifPrefs(osiId, user.id);

  return (
    <>
      <PageHeader
        title="Настройки аккаунта"
        subtitle="Персональные данные, выбор языка и подписки на уведомления"
      />
      <PageBody>
        <div className="grid gap-6">
          {/* Персональные данные */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="size-4 text-muted-foreground" />
                Персональные данные
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileSettingsForm
                fullName={user.fullName}
                phone={user.phone}
                email={user.email}
              language={user.language ?? "ru"}
              />
            </CardContent>
          </Card>

          {/* Уведомления */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="size-4 text-muted-foreground" />
                Push-уведомления
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Выберите категории уведомлений, которые хотите получать.
              </p>
              <NotificationPrefsForm
                initial={{
                  announcements: prefs.announcements,
                  requestUpdates: prefs.requestUpdates,
                  charges: prefs.charges,
                }}
              />
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
