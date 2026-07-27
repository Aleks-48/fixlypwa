import Link from "next/link";
import { ChevronRight, Info } from "lucide-react";
import { requireMember } from "@/lib/auth/residentPage";
import { getResidentProfile } from "@/lib/comms/service";
import { maskPhone } from "@/lib/phone";
import { Card, CardContent } from "@/components/ui/card";
import { LogoutButton } from "../LogoutButton";
import { PushToggle } from "../_components/PushToggle";
import { ThemeToggle } from "../_components/ThemeToggle";
import { PageBody, PageHeader } from "../_components/PageHeader";

export const dynamic = "force-dynamic";

// Вкладка «Профиль» жителя (REQ-050/052): ФИО, привязка к квартире, push-тумблер, выход.
export default async function ResidentProfilePage() {
  const { auth, osiId } = await requireMember();
  const profile = await getResidentProfile(osiId, auth.user.id);
  const initials = (profile?.fullName ?? "Ж")
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <PageHeader title="Профиль" actions={<ThemeToggle />} />
      <PageBody>
        <section className="grid max-w-xl gap-4">
          <Card className="rounded-2xl shadow-sm" data-testid="resident-profile">
            <CardContent className="flex items-center gap-3.5 pt-6">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-base font-semibold text-accent-foreground">
                {initials}
              </span>
              <div>
                <strong className="text-sm font-semibold">
                  {profile?.fullName ?? maskPhone(auth.user.phone)}
                </strong>
                <p className="m-0 mt-0.5 text-sm text-muted-foreground">
                  {profile?.apartment
                    ? `${profile.apartment.building.address}, кв. ${profile.apartment.number}`
                    : "Квартира не привязана"}
                </p>
                <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                  Телефон: {maskPhone(auth.user.phone)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <h2 className="m-0 mb-2.5 text-sm font-semibold">Уведомления</h2>
              <PushToggle />
            </CardContent>
          </Card>
          <Link href="/app/info" className="no-underline">
            <Card className="rounded-2xl shadow-sm transition-colors hover:bg-muted/40">
              <CardContent className="flex items-center gap-3 px-4 py-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Info aria-hidden size={17} />
                </span>
                <span className="flex-1 text-sm font-medium">
                  Инфо по дому
                  <span className="block text-xs font-normal text-muted-foreground">
                    Контакты, вывоз мусора, отчёты
                  </span>
                </span>
                <ChevronRight aria-hidden size={16} className="text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <LogoutButton full />
        </section>
      </PageBody>
    </>
  );
}
