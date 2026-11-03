"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { postJson } from "@/lib/apiClient";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AddResidentForm({ apartmentId }: { apartmentId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone.trim() && !email.trim()) {
      setError(t("error_phone_or_email_required"));
      return;
    }
    setLoading(true);
    try {
      await postJson("/api/residents", {
        apartmentId,
        fullName,
        ...(phone.trim() ? { phone } : {}),
        ...(email.trim() ? { email } : {}),
      });
      setFullName("");
      setPhone("");
      setEmail("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid={`add-resident-${apartmentId}`}
        className="h-7 gap-1 px-2 text-primary"
      >
        <UserPlus aria-hidden size={14} /> {t("role_resident")}
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <Input
        aria-label={t("label_full_name")}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
        minLength={2}
        placeholder={t("label_full_name")}
        data-testid="resident-name"
      />
      <Input
        aria-label={t("label_phone")}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        type="tel"
        placeholder="+7 701 000 00 01"
        data-testid="resident-phone"
      />
      <Input
        aria-label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder={t("placeholder_email_optional")}
        data-testid="resident-email"
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} data-testid="resident-submit" size="sm">
          {loading ? t("status_saving") : t("btn_add")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
          {t("btn_cancel")}
        </Button>
      </div>
      {error && (
        <p role="alert" data-testid="error" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
