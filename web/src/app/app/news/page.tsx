import { Megaphone } from "lucide-react";
import { requireMember } from "@/lib/auth/residentPage";
import { getOccupantBuilding, listAnnouncements } from "@/lib/comms/service";
import { getTranslation } from "@/lib/i18n/server";
import { Card, CardContent } from "@/components/ui/card";
import { MarkReadButton } from "../_components/MarkReadButton";
import { PageBody, PageHeader } from "../_components/PageHeader";

export const dynamic = "force-dynamic";

export default async function ResidentNewsPage() {
  const { t } = await getTranslation();
  const { auth, osiId } = await requireMember();
  const occ = await getOccupantBuilding(osiId, auth.user.id);
  const announcements = occ?.apartment
    ? await listAnnouncements(osiId, occ.apartment.buildingId, auth.user.id)
    : [];

  return (
    <>
      <PageHeader title={t("nav_news")} subtitle={t("subtitle_announcements")} />
      <PageBody>
        {!occ ? (
          <p className="text-sm text-muted-foreground">
            {t("label_apartment_not_linked")}
          </p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("label_no_announcements")}</p>
        ) : (
          <ul className="m-0 grid list-none gap-4 p-0">
            {announcements.map((a) => (
              <li key={a.id} data-testid="ann-row">
                <Card className="rounded-2xl shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                        <Megaphone aria-hidden size={18} />
                      </span>
                      <div className="min-w-0">
                        <strong className="text-[15px] font-bold">{a.title}</strong>
                        <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                          {a.createdAt.toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "long",
                          })}
                          {a.isPinned ? ` · ${t("label_pinned")}` : ""}
                        </p>
                      </div>
                    </div>
                    <p className="mb-3 mt-2.5 text-sm leading-relaxed text-muted-foreground">
                      {a.body}
                    </p>
                    <MarkReadButton id={a.id} read={a.readByViewer} />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}
