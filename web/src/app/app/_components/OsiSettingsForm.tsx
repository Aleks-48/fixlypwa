"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, CheckCircle2 } from "lucide-react";

type OsiData = {
  id: string;
  name: string;
  bin: string | null;
  address: string | null;
  registeredAt: string | null;
};

type BankAccount = {
  id: string;
  type: "CURRENT" | "SAVINGS";
  bankName: string;
  accountNumber: string;
};

// Форма реквизитов ОСИ и банковских счетов (REQ-045)
export function OsiSettingsForm({
  osi: initialOsi,
  bankAccounts: initialAccounts,
  buildingId,
}: {
  osi: OsiData;
  bankAccounts: BankAccount[];
  buildingId: string;
}) {
  const [osi, setOsi] = useState(initialOsi);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentAcc = accounts.find((a) => a.type === "CURRENT");
  const savingsAcc = accounts.find((a) => a.type === "SAVINGS");

  const [currentBank, setCurrentBank] = useState(currentAcc?.bankName ?? "");
  const [currentIban, setCurrentIban] = useState(currentAcc?.accountNumber ?? "");
  const [savingsBank, setSavingsBank] = useState(savingsAcc?.bankName ?? "");
  const [savingsIban, setSavingsIban] = useState(savingsAcc?.accountNumber ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/settings/osi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: osi.name,
          bin: osi.bin,
          address: osi.address,
          registeredAt: osi.registeredAt ? new Date(osi.registeredAt) : null,
          // Текущий счёт
          ...(currentBank && currentIban
            ? {
                bankAccount: {
                  id: currentAcc?.id,
                  buildingId,
                  type: "CURRENT",
                  bankName: currentBank,
                  accountNumber: currentIban,
                },
              }
            : {}),
        }),
      });

      if (!res.ok) throw new Error((await res.json()).error ?? "Ошибка сохранения");

      // Сохранить сберегательный счёт отдельным запросом если заполнен
      if (savingsBank && savingsIban) {
        await fetch("/api/settings/osi", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bankAccount: {
              id: savingsAcc?.id,
              buildingId,
              type: "SAVINGS",
              bankName: savingsBank,
              accountNumber: savingsIban,
            },
          }),
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8">
      {/* Юридические реквизиты */}
      <section className="grid gap-4">
        <h4 className="m-0 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Юридические реквизиты
        </h4>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="osi-name">Наименование ОСИ</Label>
            <Input
              id="osi-name"
              value={osi.name}
              onChange={(e) => setOsi({ ...osi, name: e.target.value })}
              placeholder="ОСИ «Абай 15»"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="osi-bin">БИН</Label>
              <Input
                id="osi-bin"
                value={osi.bin ?? ""}
                onChange={(e) => setOsi({ ...osi, bin: e.target.value || null })}
                placeholder="123456789012"
                maxLength={12}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="osi-reg-date">Дата регистрации</Label>
              <Input
                id="osi-reg-date"
                type="date"
                value={osi.registeredAt ? osi.registeredAt.slice(0, 10) : ""}
                onChange={(e) =>
                  setOsi({ ...osi, registeredAt: e.target.value || null })
                }
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="osi-address">Юридический адрес</Label>
            <Input
              id="osi-address"
              value={osi.address ?? ""}
              onChange={(e) => setOsi({ ...osi, address: e.target.value || null })}
              placeholder="г. Кокшетау, ул. Абая, 15"
            />
          </div>
        </div>
      </section>

      {/* Текущий счёт */}
      <section className="grid gap-4">
        <h4 className="m-0 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Текущий счёт (управление и содержание)
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="current-bank">Банк</Label>
            <Input
              id="current-bank"
              value={currentBank}
              onChange={(e) => setCurrentBank(e.target.value)}
              placeholder="Kaspi Bank"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="current-iban">IBAN (ИИК)</Label>
            <Input
              id="current-iban"
              value={currentIban}
              onChange={(e) => setCurrentIban(e.target.value)}
              placeholder="KZ12 3456 7890 1234 5678"
            />
          </div>
        </div>
      </section>

      {/* Сберегательный счёт */}
      <section className="grid gap-4">
        <h4 className="m-0 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Сберегательный счёт (кап. ремонт)
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="savings-bank">Банк</Label>
            <Input
              id="savings-bank"
              value={savingsBank}
              onChange={(e) => setSavingsBank(e.target.value)}
              placeholder="Halyk Bank"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="savings-iban">IBAN (ИИК)</Label>
            <Input
              id="savings-iban"
              value={savingsIban}
              onChange={(e) => setSavingsIban(e.target.value)}
              placeholder="KZ98 7654 3210 9876 5432"
            />
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <Save className="size-4" />
          )}
          {saved ? "Сохранено!" : "Сохранить"}
        </Button>
        {saved && (
          <span className="text-sm text-muted-foreground">Изменения применены</span>
        )}
      </div>
    </form>
  );
}
