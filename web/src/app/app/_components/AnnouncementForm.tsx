"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/apiClient";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function AnnouncementForm({ buildingId }: { buildingId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/announcements", { buildingId, title, body });
      setTitle("");
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3.5">
      <div className="grid gap-1.5">
        <Label htmlFor="a-title">{t("label_title")}</Label>
        <Input
          id="a-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder={t("placeholder_announcement_title")}
          data-testid="ann-title"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="a-body">{t("label_text")}</Label>
        <Textarea
          id="a-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={3}
          placeholder={t("placeholder_announcement_body")}
          data-testid="ann-body"
        />
      </div>
      <Button type="submit" disabled={loading} data-testid="ann-submit">
        {loading ? t("status_publishing") : t("btn_publish")}
      </Button>
      {error && (
        <p role="alert" data-testid="error" className="m-0 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
