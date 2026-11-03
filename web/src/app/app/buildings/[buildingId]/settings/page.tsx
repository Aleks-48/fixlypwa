import { notFound, redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { getBuilding } from "@/lib/onboarding/service";
import { getOsiProfile, listBankAccounts, listOsiTeam } from "@/lib/settings/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageBody, PageHeader } from "../../../_components/PageHeader";
import { OsiSettingsForm } from "../../../_components/OsiSettingsForm";
import { Building2, Users, CreditCard } from "lucide-react";

import { getTranslation } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ChairmanSettingsPage({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}) {
  const { t } = await getTranslation();
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");
  const osiId = activeChairmanOsi(auth);
  if (!osiId) redirect("/app");

  const { buildingId } = await params;

  const [building, osi, bankAccounts, team] = await Promise.all([
    getBuilding(osiId, buildingId),
    getOsiProfile(osiId),
    listBankAccounts(osiId, buildingId),
    listOsiTeam(osiId),
  ]);

  if (!building || !osi) notFound();

  const roleLabels: Record<string, string> = {
    CHAIRMAN: t("role_chairman"),
    ACCOUNTANT: t("label_accountant"),
    MEMBER: t("label_council_member"),
    SUPERADMIN: t("label_support"),
  };

  return (
    <>
      <PageHeader
        title={t("title_chairman_settings")}
        subtitle={t("subtitle_chairman_settings")}
        back={{ href: `/app/buildings/${buildingId}`, label: building.address }}
      />
      <PageBody wide>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Основная форма реквизитов */}
          <div className="lg:col-span-2 grid gap-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="size-4 text-muted-foreground" />
                  {t("label_osi_bank_details")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OsiSettingsForm
                  osi={{
                    id: osi.id,
                    name: osi.name,
                    bin: osi.bin ?? null,
                    address: osi.address ?? null,
                    registeredAt: osi.registeredAt?.toISOString() ?? null,
                    chairmanFullName: auth.user.fullName ?? "",
                  }}
                  bankAccounts={bankAccounts.map((b) => ({
                    id: b.id,
                    type: b.type,
                    bankName: b.bankName,
                    accountNumber: b.accountNumber,
                  }))}
                  buildingId={buildingId}
                />
              </CardContent>
            </Card>
          </div>

          {/* Команда ОСИ */}
          <div className="grid gap-6 content-start">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4 text-muted-foreground" />
                  {t("label_osi_team")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {team.map((member) => {
                    // Безопасное получение инициалов
                    const initials = (member.user?.fullName ?? "?")
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase() || "?";

                    return (
                      <div
                        key={member.userId}
                        className="flex items-start gap-3 rounded-xl bg-secondary/40 p-3"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <p className="m-0 truncate text-sm font-medium">
                            {member.user?.fullName ?? "—"}
                          </p>
                          <p className="m-0 text-xs text-muted-foreground">
                            {roleLabels[member.role] ?? member.role}
                          </p>
                          {member.user?.phone && (
                            <p className="m-0 text-xs text-muted-foreground">
                              {member.user.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {team.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t("label_no_members")}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Банковские счета — информационная плашка */}
            {bankAccounts.length > 0 && (
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="size-4 text-muted-foreground" />
                    {t("label_current_accounts")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {bankAccounts.map((acc) => (
                      <div key={acc.id} className="rounded-xl bg-secondary/40 p-3">
                        <p className="m-0 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {acc.type === "CURRENT" ? t("label_acc_current") : t("label_acc_savings")}
                        </p>
                        <p className="m-0 text-sm font-medium">{acc.bankName}</p>
                        <p className="m-0 font-mono text-xs text-muted-foreground break-all">
                          {acc.accountNumber}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Карточка Активного Тарифа и Меморандума Пилота */}
            <Card className="rounded-2xl shadow-sm border-indigo-500/20 bg-indigo-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-indigo-600 dark:text-indigo-400">
                  <CreditCard className="size-4" />
                  Тариф ОСИ и Пилотный Меморандум
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="rounded-xl bg-indigo-500/10 p-3 border border-indigo-500/20">
                  <p className="m-0 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    🎁 МАКСИМАЛЬНЫЙ VIP-ТАРИФ (Пилот)
                  </p>
                  <p className="m-0 text-sm font-semibold text-foreground">
                    50 ₸ / квартира / мес
                  </p>
                  <p className="m-0 text-xs text-muted-foreground">
                    Первые 3 месяца подписки по цене 50 ₸, со 4-го месяца — 120 ₸ по договору.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <a
                    href="/legal/memorandum-pilot"
                    target="_blank"
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    📄 Ознакомиться с Меморандумом о намерениях (Пилот)
                  </a>
                  <a
                    href="/legal/oferta-osi"
                    target="_blank"
                    className="text-xs font-medium text-muted-foreground hover:underline"
                  >
                    ⚖️ Публичная Оферта для Председателей ОСИ
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}