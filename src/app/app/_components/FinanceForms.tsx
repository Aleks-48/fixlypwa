"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/apiClient";
import { selectClassName } from "@/lib/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Клиентские формы экрана «Финансы» (Фаза 2). Компактные, по паттерну AnnouncementForm.
// Select — нативные (см. build-plan: e2e зависит от selectOption на реальном <select>).

const CATEGORIES = [
  ["MAINTENANCE", "Содержание"],
  ["TARGETED", "Целевой сбор"],
  ["CAPITAL_REPAIR", "Кап. ремонт"],
] as const;

export function TariffForm({ buildingId }: { buildingId: string }) {
  const router = useRouter();
  const [category, setCategory] = useState("MAINTENANCE");
  const [rateType, setRateType] = useState("PER_SQM");
  const [rate, setRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Тариф действует с начала ТЕКУЩЕГО месяца — иначе начисление за этот месяц
      // (period = 1-е число) не увидит тариф, созданный «сегодня».
      const now = new Date();
      await postJson("/api/tariffs", {
        buildingId,
        category,
        rateType,
        rate: Number(rate),
        periodFrom: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString(),
      });
      setRate("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2.5">
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Статья"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          data-testid="tariff-category"
          className={`flex-1 ${selectClassName}`}
        >
          {CATEGORIES.map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
        <select
          aria-label="Тип ставки"
          value={rateType}
          onChange={(e) => setRateType(e.target.value)}
          data-testid="tariff-ratetype"
          className={`flex-1 ${selectClassName}`}
        >
          <option value="PER_SQM">₸/м²</option>
          <option value="FIXED">Фикс, ₸</option>
        </select>
        <Input
          aria-label="Ставка"
          value={rate}
          onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ""))}
          required
          inputMode="decimal"
          placeholder="Ставка"
          data-testid="tariff-rate"
          className="flex-1"
        />
      </div>
      <Button type="submit" disabled={busy} data-testid="tariff-submit">
        {busy ? "…" : "Добавить тариф"}
      </Button>
      {error && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

export function GenerateChargesForm({ buildingId }: { buildingId: string }) {
  const router = useRouter();
  const now = new Date();
  const [period, setPeriod] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const r = await postJson<{ created: number; skipped: number }>(
        "/api/charges/generate",
        { buildingId, period },
      );
      setResult(`Создано: ${r.created}, пропущено: ${r.skipped}`);
      router.refresh();
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={run} className="flex flex-wrap items-center gap-2">
      <Input
        aria-label="Период"
        type="month"
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        data-testid="charges-period"
        className="flex-1 basis-[140px]"
      />
      <Button type="submit" disabled={busy} data-testid="charges-generate" className="w-auto">
        {busy ? "…" : "Начислить за месяц"}
      </Button>
      {result && (
        <p data-testid="charges-result" className="m-0 basis-full text-sm">
          {result}
        </p>
      )}
    </form>
  );
}

export function PaymentForm({ accounts }: { accounts: { accountId: string; number: string }[] }) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(accounts[0]?.accountId ?? "");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("RESIDENT_DUES");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // accountId из state мог инициализироваться пустым (счета появились после refresh) —
      // берём актуальный: выбранный или первый из свежих props.
      const effectiveAccountId = accountId || accounts[0]?.accountId;
      await postJson("/api/payments", {
        accountId: effectiveAccountId,
        amount: Number(amount),
        paidAt: new Date().toISOString(),
        incomeCategory: category,
      });
      setAmount("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  if (accounts.length === 0) {
    return (
      <p className="m-0 text-sm text-muted-foreground">
        Сначала начислите за месяц — появятся лицевые счета.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-2.5">
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Квартира"
          value={accountId || accounts[0]?.accountId || ""}
          onChange={(e) => setAccountId(e.target.value)}
          data-testid="payment-account"
          className={`flex-1 ${selectClassName}`}
        >
          {accounts.map((a) => (
            <option key={a.accountId} value={a.accountId}>
              Кв. {a.number}
            </option>
          ))}
        </select>
        <Input
          aria-label="Сумма"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          required
          inputMode="decimal"
          placeholder="Сумма, ₸"
          data-testid="payment-amount"
          className="flex-1"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pay-cat">Статья (обязательно)</Label>
        <select
          id="pay-cat"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          data-testid="payment-category"
          className={selectClassName}
        >
          <option value="RESIDENT_DUES">6.1 Взносы на содержание</option>
          <option value="PARKING_STORAGE_DUES">6.2 Парковки/кладовки</option>
          <option value="CAPITAL_REPAIR_CONTRIBUTION">6.3 Кап. ремонт</option>
          <option value="RENTAL_INCOME">6.4 Аренда общего имущества</option>
          <option value="TARGETED_RESIDENT">6.5 Целевые (квартиры)</option>
          <option value="TARGETED_PARKING">6.6 Целевые (парковки)</option>
          <option value="OTHER_INCOME">6.7 Иные</option>
        </select>
      </div>
      <Button type="submit" disabled={busy} data-testid="payment-submit">
        {busy ? "…" : "Провести платёж"}
      </Button>
      {error && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
