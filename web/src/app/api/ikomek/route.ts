import { requireMember } from "@/lib/auth/residentPage";
import { getOccupantBuilding } from "@/lib/comms/service";
import {
createIKomekComplaint,
listIKomekComplaints,
} from "@/lib/ikomek/service";
import type { IKomekCategory } from "@prisma/client";
import { NextRequest,NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const { auth, osiId } = await requireMember();
  const complaints = await listIKomekComplaints(osiId, {
    authorUserId: auth.user.id,
  });
  return NextResponse.json(complaints);
}

export async function POST(req: NextRequest) {
  const { auth, osiId } = await requireMember();
  const occ = await getOccupantBuilding(osiId, auth.user.id);
  if (!occ || !occ.apartment) {
    return NextResponse.json(
      { error: "Квартира не привязана" },
      { status: 400 },
    );
  }

  const { category, description, photoUrls } = await req.json();
  if (!category || !description) {
    return NextResponse.json(
      { error: "Категория и описание обязательны" },
      { status: 400 },
    );
  }

  const complaint = await createIKomekComplaint(osiId, {
    buildingId: occ.apartment.buildingId,
    apartmentId: occ.apartment.id,
    authorUserId: auth.user.id,
    category: category as IKomekCategory,
    description,
    photoUrls: photoUrls ?? [],
  });

  return NextResponse.json(complaint);
}
