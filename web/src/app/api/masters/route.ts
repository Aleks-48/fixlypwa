import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { listApprovedMasters } from "@/lib/masters/service";
import type { RequestCategory } from "@prisma/client";

// GET /api/masters — каталог проверенных мастеров с поиском и фильтром по категории (REQ-072)
export async function GET(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || "Кокшетау";
  const category = (searchParams.get("category") as RequestCategory) || undefined;

  const masters = await listApprovedMasters(city, category);

  return NextResponse.json({ masters });
}
