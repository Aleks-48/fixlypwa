"use client";

import { Button } from "@/components/ui/button";
import {
Sheet,
SheetContent,
SheetDescription,
SheetFooter,
SheetHeader,
SheetTitle,
SheetTrigger,
} from "@/components/ui/sheet";
import { postJson } from "@/lib/apiClient";
import { Check,CreditCard,QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
// Онлайн-оплата (симулятор эквайринга с интерактивной картой и QR-кодом Kaspi)
export function PayOnlineButton({ amount, hero = false }: { amount: number; hero?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>("test_card");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Поля тестовой карты
  const [cardNumber, setCardNumber] = useState("4400 4301 2345 6789");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("777");

  function reset() {
    setResult(null);
    setError(null);
    setBusy(false);
  }

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      // Имитируем реалистичное время процессинга банка (1.2 сек анимации)
      await new Promise((r) => setTimeout(r, 1200));

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
              ? "h-11 w-full rounded-2xl bg-white font-black text-primary hover:bg-white/90 shadow-md transition-all active:scale-98"
              : "h-11 w-full rounded-2xl font-bold shadow-md transition-all active:scale-98"
          }
        >
          Оплатить онлайн
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl border-t border-border/80 bg-card/95 backdrop-blur-xl p-6 shadow-2xl">
        {result?.success ? (
          <div className="grid justify-items-center gap-3 py-6 text-center animate-in zoom-in-95 duration-300">
            <SheetTitle className="sr-only">
              {result.alreadyPaid ? "Задолженности уже нет" : "Оплата прошла успешно"}
            </SheetTitle>

            <div className="relative">
              <span className="flex size-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 ring-8 ring-emerald-500/10 shadow-lg shadow-emerald-500/20">
                <Check aria-hidden size={36} className="stroke-[3]" />
              </span>
            </div>

            <div className="space-y-1">
              <p className="m-0 text-xl font-black text-foreground" data-testid="pay-online-result">
                {result.alreadyPaid ? "Задолженности уже нет" : "Оплата прошла успешно!"}
              </p>
              {!result.alreadyPaid && (
                <p className="m-0 text-2xl font-black text-emerald-500">
                  {fmt(result.amount ?? amount)}
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-muted/40 p-3 text-xs text-muted-foreground w-full border border-border/60 text-left space-y-1">
              <div className="flex justify-between">
                <span>Чек транзакции:</span>
                <span className="font-mono font-bold text-foreground">{result.gatewayRef || "FIX-DEMO-9982"}</span>
              </div>
              <div className="flex justify-between">
                <span>Способ:</span>
                <span className="font-semibold text-foreground">{method === "test_qr" ? "Kaspi QR" : "Банковская карта"}</span>
              </div>
              <div className="flex justify-between">
                <span>Статус:</span>
                <span className="text-emerald-500 font-bold">100% Зачислено на счет ОСИ</span>
              </div>
            </div>

            <Button 
              type="button" 
              data-testid="pay-online-done" 
              onClick={close} 
              className="mt-2 w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-lg shadow-emerald-500/20"
            >
              Закрыть чек
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <SheetHeader className="text-left">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-lg font-bold">Оплата коммунальных услуг</SheetTitle>
                <span className="text-lg font-black text-emerald-500">{fmt(amount)}</span>
              </div>
              <SheetDescription className="text-xs text-muted-foreground">
                Тестовый шлюз эквайринга FixlyPay (Kaspi QR / Банковская карта)
              </SheetDescription>
            </SheetHeader>

            {/* Выбор способа оплаты */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                data-testid="pay-method-card"
                onClick={() => setMethod("test_card")}
                className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-bold transition-all ${
                  method === "test_card" 
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 shadow-sm" 
                    : "border-border bg-card text-muted-foreground hover:border-foreground/30"
                }`}
              >
                <CreditCard aria-hidden size={18} />
                Банковской картой
              </button>
              <button
                type="button"
                data-testid="pay-method-qr"
                onClick={() => setMethod("test_qr")}
                className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-bold transition-all ${
                  method === "test_qr" 
                    ? "border-red-500 bg-red-500/10 text-red-600 shadow-sm" 
                    : "border-border bg-card text-muted-foreground hover:border-foreground/30"
                }`}
              >
                <QrCode aria-hidden size={18} />
                Kaspi QR
              </button>
            </div>

            {/* Ввод банковской карты */}
            {method === "test_card" ? (
              <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-lg space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold tracking-wider uppercase">Fixly Platinum Card</span>
                  <span className="font-bold text-amber-400">VISA / MASTERCARD</span>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Номер карты</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono tracking-widest text-white outline-none focus:border-emerald-500"
                    placeholder="0000 0000 0000 0000"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Срок действия</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-center text-white outline-none focus:border-emerald-500"
                      placeholder="MM/YY"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">CVC / CVV</label>
                    <input
                      type="password"
                      maxLength={3}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-center text-white outline-none focus:border-emerald-500"
                      placeholder="***"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Оплата по Kaspi QR */
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-center space-y-2.5">
                <div className="inline-block p-3 rounded-2xl bg-white border-2 border-red-500 shadow-md">
                  <div className="relative size-36 mx-auto bg-slate-950 rounded-xl flex items-center justify-center p-2">
                    {/* Стилизованный QR */}
                    <div className="size-full border-4 border-dashed border-white/80 rounded-lg flex flex-col items-center justify-center text-white text-[11px] font-mono gap-1">
                      <QrCode size={40} className="text-red-500" />
                      <span className="font-bold text-red-400">Kaspi.kz QR</span>
                    </div>
                  </div>
                </div>
                <p className="m-0 text-xs font-bold text-foreground">
                  Отсканируйте QR-код камерой приложения Kaspi.kz
                </p>
                <p className="m-0 text-[11px] text-muted-foreground">
                  Или нажмите кнопку «Оплатить» для моментальной тестовой проводки
                </p>
              </div>
            )}

            {error && (
              <p role="alert" className="m-0 text-xs font-semibold text-destructive text-center" data-testid="pay-online-error">
                {error}
              </p>
            )}

            <SheetFooter>
              <Button
                type="button"
                disabled={busy}
                onClick={pay}
                data-testid="pay-online-submit"
                className={`h-12 w-full rounded-2xl font-black text-sm text-white shadow-lg transition-all ${
                  method === "test_qr"
                    ? "bg-red-600 hover:bg-red-500 shadow-red-500/25"
                    : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25"
                }`}
              >
                {busy ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Проведение транзакции…
                  </span>
                ) : (
                  `Оплатить ${fmt(amount)}`
                )}
              </Button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
