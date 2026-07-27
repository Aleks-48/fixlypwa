import { notFound } from "next/navigation";
import { getReceiptData, ReceiptNotFoundError } from "@/lib/payments/receiptService";
import { getCurrentAuth } from "@/lib/auth/session";
import ReceiptPrintView from "./ReceiptPrintView";

interface ReceiptPageProps {
  searchParams: Promise<{ paymentId?: string }>;
}

export default async function ReceiptPage({ searchParams }: ReceiptPageProps) {
  const { paymentId } = await searchParams;

  if (!paymentId) {
    notFound();
  }

  // Получаем контекст авторизации текущего пользователя/ОСИ
  const auth = await getCurrentAuth();
  const tenantId = (auth as any)?.tenantId || (auth as any)?.osiId;

  if (!tenantId) {
    notFound();
  }

  try {
    const data = await getReceiptData(tenantId, paymentId);

    return <ReceiptPrintView data={data} />;
  } catch (error) {
    if (error instanceof ReceiptNotFoundError) {
      notFound();
    }

    throw error;
  }
}