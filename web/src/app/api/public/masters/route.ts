import { NextRequest } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { Errors, ok } from "@/lib/http";
import { listMastersForAssignment } from "@/lib/masters/reviewService";
import type { RequestCategory } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/public/masters?category=PLUMBING&city=Кокшетау
// Публичный список одобренных мастеров — доступен любому аутентифицированному пользователю.
export async function GET(req: NextRequest) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const category = req.nextUrl.searchParams.get("category") as RequestCategory | null;
  const city = req.nextUrl.searchParams.get("city") ?? "Кокшетау";

  const masters = await listMastersForAssignment(city, category ?? undefined);
  return ok({ masters });
}
