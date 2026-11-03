import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeMemberOsi } from "@/lib/auth/guards";
import { getOrCreateNotifPrefs } from "@/lib/settings/service";
import { getTranslation } from "@/lib/i18n/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageBody, PageHeader } from "../_components/PageHeader";
import { ProfileSettingsForm } from "../_components/ProfileSettingsForm";
import { NotificationPrefsForm } from "../_components/NotificationPrefsForm";
import { User, Bell } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ResidentSettingsPage() {
  const { t } = await getTranslation();
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");
  const osiId = activeMemberOsi(auth);
  if (!osiId) redirect("/app");

  const { user } = auth;
  const prefs = await getOrCreateNotifPrefs(osiId, user.id);

  return (
    <>
      <PageHeader
        title={t("title_account_settings")}
        subtitle={t("subtitle_account_settings")}
      />
      <PageBody>
        <div className="grid gap-6">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="size-4 text-muted-foreground" />
                {t("label_personal_data")}
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

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="size-4 text-muted-foreground" />
                {t("label_push_notifications")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                {t("label_choose_notif_categories")}
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
