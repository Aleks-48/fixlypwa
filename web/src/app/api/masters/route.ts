import { requireChairman } from "@/lib/auth/chairmanPage";
import {
listMastersForAssignment
} from "@/lib/masters/reviewService";
import type { RequestCategory } from "@prisma/client";
import { NextRequest,NextResponse } from "next/server";

// POST /api/masters/assign — назначить мастера на заявку
// POST /api/masters/add-contact — добавить мастера из контактов
// GET  /api/masters/list — список мастеров для дропдауна

export async function GET(req: NextRequest) {
  const { osiId } = await requireChairman();
  // Достаём город из здания ОСИ
  const { prisma } = await import("@/lib/db/prisma");
  const building = await prisma.building.findFirst({ where: { osiId } });
  const city = building?.city ?? "Кокшетау";

  const category = req.nextUrl.searchParams.get("category") as
    | RequestCategory
    | undefined;

  const masters = await listMastersForAssignment(city, category || undefined);
  return NextResponse.json(masters);
}
