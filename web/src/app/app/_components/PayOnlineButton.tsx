"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, QrCode, TriangleAlert } from "lucide-react";
import { postJson } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";

type Method = "test_card" | "test_qr";
type CheckoutResult = {
  success: boolean;
  alreadyPaid?: boolean;
  gatewayRef?: string;
  amount?: number;
};

const fmt = (n: number) => `₸ ${Math.round(n).toLocaleString("ru-RU")}`;

// Онлайн-оплата (демо-режим, payments-online.md §2-4, ADR-0010): нижняя шторка → выбор
// способа (косметика) → симулятор эквайринга → результат. Сумма — весь текущий долг жителя,
// пересчитывается на сервере (REQ-034), клиент только показывает её, выбирает способ и передаёт
// её же как expectedAmount — сверка на случай, если долг изменился, пока шторка была открыта
// (REQ-036).
export function PayOnlineButton({ amount, hero = false }: { amount: number; hero?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>("test_card");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setResult(null);
    setError(null);
    setBusy(false);
  }

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const r = await postJson<CheckoutResult>("/api/payments/checkout", {
        method,
        expectedAmount: amount,
      });
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось провести оплату");
    } finally {
      setBusy(false);
    }
  }

  // Обновляем данные страницы (баланс, историю) только при закрытии шторки, а не сразу после
  // ответа API — иначе router.refresh() перерисовывает родителя с обнулённым долгом раньше, чем
  // пользователь успевает увидеть экран успеха, и шторка размонтируется вместе с кнопкой-триггером.
  function close() {
    const shouldRefresh = result?.success === true;
    setOpen(false);
    reset();
    if (shouldRefresh) router.refresh();
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (v) setOpen(true);
        else close();
      }}
    >
      <SheetTrigger asChild>
        <Button
          type="button"
          data-testid="pay-online"
          className={
            hero
              ? "h-11 w-full rounded-xl bg-white font-bold text-primary hover:bg-white/90"
              : "h-11 w-full rounded-xl font-bold"
          }
        >
          Оплатить онлайн
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-2xl">
        {result?.success ? (
          <div className="grid justify-items-center gap-3 px-4 py-8 text-center">
            {/* Радикс требует заголовок диалога для доступности; визуально скрыт — макет
                уже несёт смысл через галочку и крупный текст ниже. */}
            <SheetTitle className="sr-only">
              {result.alreadyPaid ? "Задолженности уже нет" : "Оплата прошла успешно"}
            </SheetTitle>
            <span className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
              <Check aria-hidden size={28} />
            </span>
            <p className="m-0 text-lg font-bold" data-testid="pay-online-result">
              {result.alreadyPaid ? "Задолженности уже нет" : "Оплата прошла успешно"}
            </p>
            {!result.alreadyPaid && (
              <p className="m-0 text-sm text-muted-foreground">
                {fmt(result.amount ?? amount)}
                {result.gatewayRef ? ` · ${result.gatewayRef}` : ""}
              </p>
            )}
            <Button type="button" data-testid="pay-online-done" onClick={close} className="mt-2 w-full">
              Готово
            </Button>
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>Оплата онлайн</SheetTitle>
              <SheetDescription className="flex items-start gap-2 text-left">
                <TriangleAlert aria-hidden size={16} className="mt-0.5 shrink-0 text-warning" />
                <span>
                  Приложение работает в демонстрационном режиме. Ввод реальных банковских карт не
                  требуется.
                </span>
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-2 px-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="pay-method-card"
                  onClick={() => setMethod("test_card")}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium ${
                    method === "test_card" ? "border-primary bg-accent text-primary" : "border-border"
                  }`}
                >
                  <CreditCard aria-hidden size={18} />
                  Картой
                </button>
                <button
                  type="button"
                  data-testid="pay-method-qr"
                  onClick={() => setMethod("test_qr")}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium ${
                    method === "test_qr" ? "border-primary bg-accent text-primary" : "border-border"
                  }`}
                >
                  <QrCode aria-hidden size={18} />
                  QR (Kaspi)
                </button>
              </div>
              {error && (
                <p role="alert" className="m-0 text-sm text-destructive" data-testid="pay-online-error">
                  {error}
                </p>
              )}
            </div>
            <SheetFooter>
              <Button
                type="button"
                disabled={busy}
                onClick={pay}
                data-testid="pay-online-submit"
                className="h-11 w-full rounded-xl font-bold"
              >
                {busy ? "Обрабатываем…" : `Оплатить ${fmt(amount)}`}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
