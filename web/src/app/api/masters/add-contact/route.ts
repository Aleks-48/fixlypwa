import { NextRequest, NextResponse } from "next/server";
import { requireChairman } from "@/lib/auth/chairmanPage";
import { addMasterFromContact } from "@/lib/masters/reviewService";
import type { RequestCategory } from "@prisma/client";

// POST /api/masters/add-contact
// Body: { fullName, phone, categories, bio? }
export async function POST(req: NextRequest) {
  const { osiId } = await requireChairman();

  const { prisma } = await import("@/lib/db/prisma");
  const building = await prisma.building.findFirst({ where: { osiId } });
  const city = building?.city ?? "Кокшетау";

  const { fullName, phone, categories, bio } = await req.json();

  if (!fullName || !phone || !categories?.length) {
    return NextResponse.json(
      { error: "fullName, phone, categories обязательны" },
      { status: 400 },
    );
  }

  const result = await addMasterFromContact({
    fullName,
    phone,
    city,
    categories: categories as RequestCategory[],
    bio,
  });

  return NextResponse.json(result);
}
