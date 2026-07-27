import "server-only";
import { cache } from "react";
import { getCurrentAuth } from "./session";
import { activeChairmanOsi, activeMemberOsi } from "./guards";
import { listBuildings } from "@/lib/onboarding/service";
import { getResidentProfile } from "@/lib/comms/service";
import { prisma } from "@/lib/db/prisma";
import { maskPhone } from "@/lib/phone";

// Данные каркаса кабинета (сайдбар, мобильное меню, шапка) — считаются ОДИН раз на запрос
// (React cache), используются layout.tsx и PageHeader. null → нет входа или нет ОСИ (онбординг).
export type ShellContext = {
  role: "chairman" | "resident";
  activeOsiId: string;
  osiOptions: { id: string; name: string }[];
  buildings: { id: string; address: string }[];
  brandSubtitle: string;
  userName: string;
  initials: string;
};

export const getShellContext = cache(async (): Promise<ShellContext | null> => {
  const auth = await getCurrentAuth();
  if (!auth) return null;

  const chairmanOsi = activeChairmanOsi(auth);
  const memberOsi = chairmanOsi ? null : activeMemberOsi(auth);
  const activeOsi = chairmanOsi ?? memberOsi;
  if (!activeOsi) return null;

  const osiIds = auth.user.roles.map((r) => r.osiId);
  const [osi, osiOptions] = await Promise.all([
    prisma.osi.findUnique({ where: { id: activeOsi }, select: { name: true } }),
    osiIds.length > 1
      ? prisma.osi.findMany({
          where: { id: { in: osiIds } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  let brandSubtitle = osi?.name ?? "ОСИ";
  let userName = auth.user.email ?? maskPhone(auth.user.phone);
  let buildings: { id: string; address: string }[] = [];

  if (chairmanOsi) {
    buildings = (await listBuildings(chairmanOsi)).map((b) => ({ id: b.id, address: b.address }));
  } else {
    const profile = await getResidentProfile(activeOsi, auth.user.id);
    if (profile?.fullName) userName = profile.fullName;
    if (profile?.apartment) {
      brandSubtitle = `${profile.apartment.building.address} · кв. ${profile.apartment.number}`;
    }
  }

  const initials =
    userName
      .replace(/[^\p{L}\s]/gu, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]!.toUpperCase())
      .join("") || "Д";

  return {
    role: chairmanOsi ? "chairman" : "resident",
    activeOsiId: activeOsi,
    osiOptions,
    buildings,
    brandSubtitle,
    userName,
    initials,
  };
});
