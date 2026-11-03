import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeMemberOsi } from "@/lib/auth/guards";
import { getReceiptData, ReceiptNotFoundError } from "@/lib/payments/receiptService";

// GET /api/payments/receipt — получение данных для квитанции жителя (REQ-095)
export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const osiId = activeMemberOsi(auth);
  if (!osiId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let receipt;
  try { receipt = await getReceiptData(osiId, auth.user.id); }
  catch (error) { if (error instanceof ReceiptNotFoundError) return NextResponse.json({ error: "Receipt not found" }, { status: 404 }); throw error; }
  if (!receipt) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });

  return NextResponse.json({ receipt });
}
