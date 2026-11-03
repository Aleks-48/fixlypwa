import { requireMember } from "@/lib/auth/residentPage";
import { getReceiptData, ReceiptNotFoundError } from "@/lib/payments/receiptService";
import { notFound } from "next/navigation";
import ReceiptPrintView from "./ReceiptPrintView";
export default async function ReceiptPage({ searchParams }: { searchParams: Promise<{ paymentId?: string }> }) {
  const { auth, osiId } = await requireMember();
  const { paymentId } = await searchParams;
  try { return <ReceiptPrintView data={await getReceiptData(osiId, paymentId ?? auth.user.id, auth.user.id)} />; }
  catch (error) { if (error instanceof ReceiptNotFoundError) notFound(); throw error; }
}
