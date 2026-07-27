import { notFound, redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { getBuilding } from "@/lib/onboarding/service";
import { getOsiProfile, listBankAccounts, listOsiTeam } from "@/lib/settings/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageBody, PageHeader } from "../../../_components/PageHeader";
import { OsiSettingsForm } from "../../../_components/OsiSettingsForm";
import { Building2, Users, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ChairmanSettingsPage({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}) {
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
    CHAIRMAN: "Председатель",
    ACCOUNTANT: "Бухгалтер",
    MEMBER: "Член совета",
    SUPERADMIN: "Саппорт",
  };

  return (
    <>
      <PageHeader
        title="Настройки ОСИ и дома"
        subtitle="Реквизиты, банковские счета и команда управления"
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
                  Реквизиты ОСИ и банковские счета
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
                  Команда ОСИ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {team.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-start gap-3 rounded-xl bg-secondary/40 p-3"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {(member.user.fullName ?? "?")
                          .split(" ")
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join("")
                          .toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="m-0 truncate text-sm font-medium">
                          {member.user.fullName ?? "—"}
                        </p>
                        <p className="m-0 text-xs text-muted-foreground">
                          {roleLabels[member.role] ?? member.role}
                        </p>
                        {member.user.phone && (
                          <p className="m-0 text-xs text-muted-foreground">
                            {member.user.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {team.length === 0 && (
                    <p className="text-sm text-muted-foreground">Нет участников</p>
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
                    Текущие счета
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {bankAccounts.map((acc) => (
                      <div key={acc.id} className="rounded-xl bg-secondary/40 p-3">
                        <p className="m-0 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {acc.type === "CURRENT" ? "Текущий" : "Сберегательный"}
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
          </div>
        </div>
      </PageBody>
    </>
  );
}
