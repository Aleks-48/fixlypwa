import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { getOrCreateNotifPrefs, updateNotifPrefs, type NotifPrefsInput } from "@/lib/settings/service";

function resolveOsiId(auth: Awaited<ReturnType<typeof getCurrentAuth>>) {
  if (!auth) return null;
  // Председатель — из сессии; жители — из роли
  const chairmanOsi = activeChairmanOsi(auth);
  if (chairmanOsi) return chairmanOsi;
  // Для жителя берём первую роль
  return auth.user.roles[0]?.osiId ?? null;
}

// GET /api/notifications/preferences  — получить тумблеры (REQ-048)
export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const osiId = resolveOsiId(auth);
  if (!osiId) return NextResponse.json({ error: "No OSI context" }, { status: 400 });

  const prefs = await getOrCreateNotifPrefs(osiId, auth.user.id);
  return NextResponse.json({ prefs });
}

// PATCH /api/notifications/preferences  — обновить тумблеры (REQ-048)
export async function PATCH(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const osiId = resolveOsiId(auth);
  if (!osiId) return NextResponse.json({ error: "No OSI context" }, { status: 400 });

  const body = (await req.json()) as NotifPrefsInput;
  const prefs = await updateNotifPrefs(osiId, auth.user.id, body);
  return NextResponse.json({ prefs });
}
