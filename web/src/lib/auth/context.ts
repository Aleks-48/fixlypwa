import "server-only";
import type { NextResponse } from "next/server";
import { Errors } from "@/lib/http";
import { getCurrentAuth, type AuthContext } from "./session";
import { activeChairmanOsi, activeMemberOsi } from "./guards";
import { getMasterByUserId } from "@/lib/master/service";

type Ctx = { ok: true; auth: AuthContext; osiId: string } | { ok: false; response: NextResponse };

// Требует вошедшего пользователя с правами председателя в активной ОСИ (REQ-003/004).
// Возвращает готовый Response при отказе — route handler делает `if (!ctx.ok) return ctx.response`.
export async function chairmanContext(): Promise<Ctx> {
  const auth = await getCurrentAuth();
  if (!auth) return { ok: false, response: Errors.unauthorized() };
  const osiId = activeChairmanOsi(auth);
  if (!osiId) return { ok: false, response: Errors.forbidden() };
  return { ok: true, auth, osiId };
}

// Требует вошедшего пользователя с ЛЮБОЙ ролью в активной ОСИ (житель или председатель) —
// для read/участие-путей (объявления, свои заявки).
export async function memberContext(): Promise<Ctx> {
  const auth = await getCurrentAuth();
  if (!auth) return { ok: false, response: Errors.unauthorized() };
  const osiId = activeMemberOsi(auth);
  if (!osiId) return { ok: false, response: Errors.forbidden() };
  return { ok: true, auth, osiId };
}

type MasterCtx =
  | { ok: true; auth: AuthContext; masterId: string; city: string }
  | { ok: false; response: NextResponse };

// Требует одобренного мастера (ADR-0009): анкета существует и status=APPROVED — иначе доступ
// к витрине/откликам запрещён (PENDING/REJECTED/BLOCKED видят только свою страницу /master).
export async function masterContext(): Promise<MasterCtx> {
  const auth = await getCurrentAuth();
  if (!auth) return { ok: false, response: Errors.unauthorized() };
  const master = await getMasterByUserId(auth.user.id);
  if (!master || master.status !== "APPROVED") return { ok: false, response: Errors.forbidden() };
  return { ok: true, auth, masterId: master.id, city: master.city };
}

type AdminCtx = { ok: true; auth: AuthContext } | { ok: false; response: NextResponse };

// Требует суперадмина платформы (ADR-0008, REQ-110) — гейт всех /api/admin/**.
// Только identity-флаг User.isSuperadmin; из веба он не мутируется (назначение — CLI
// make-superadmin), поэтому эскалация до этого контекста из приложения невозможна.
export async function adminContext(): Promise<AdminCtx> {
  const auth = await getCurrentAuth();
  if (!auth) return { ok: false, response: Errors.unauthorized() };
  if (!auth.user.isSuperadmin) return { ok: false, response: Errors.forbidden() };
  return { ok: true, auth };
}
