import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/residentPage";
import { markDocumentRead } from "@/lib/documents/service";

export async function POST(req: NextRequest) {
  const { auth, osiId } = await requireMember();
  const { documentId } = await req.json();

  if (!documentId) {
    return NextResponse.json(
      { error: "documentId обязателен" },
      { status: 400 },
    );
  }

  await markDocumentRead(osiId, documentId, auth.user.id);
  return NextResponse.json({ ok: true });
}
