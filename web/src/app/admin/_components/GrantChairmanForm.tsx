"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Привязка/создание председателя (REQ-112). Временный пароль приходит ОДИН РАЗ в ответе —
// показываем до следующей мутации, никуда не сохраняем.
export function GrantChairmanForm({ osiId }: { osiId: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setTempPassword(null);
    try {
      const data = await postJson<{ tempPassword: string | null }>("/api/admin/chairmen", {
        osiId,
        phone,
        email: email || undefined,
      });
      setTempPassword(data.tempPassword);
      setPhone("");
      setEmail("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="chair-phone">Телефон</Label>
          <Input
            id="chair-phone"
            data-testid="chair-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7701…"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="chair-email">Email (для входа по паролю)</Label>
          <Input
            id="chair-email"
            data-testid="chair-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="необязательно"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={busy} data-testid="chair-submit">
          Привязать председателя
        </Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
      {tempPassword && (
        <p
          className="m-0 rounded-xl bg-warning-soft px-3 py-2 text-sm"
          data-testid="chair-temp-password"
        >
          Временный пароль (показан один раз): <code className="font-bold">{tempPassword}</code>
        </p>
      )}
    </form>
  );
}
