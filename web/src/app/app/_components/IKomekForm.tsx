"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card,CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
ikomekCategoryLabels,
ikomekStatusLabels,
} from "@/lib/ikomek/service";
import type { IKomekCategory,IKomekStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhotoUpload } from "./PhotoUpload";

interface IKomekComplaintView {
  id: string;
  category: IKomekCategory;
  description: string;
  photoUrls: string[];
  status: IKomekStatus;
  ticketNumber: string | null;
  createdAt: string | Date;
  building?: { address: string };
  apartment?: { number: string } | null;
}

const STATUS_TONE: Record<IKomekStatus, string> = {
  PENDING: "bg-warning-soft text-warning",
  IN_PROGRESS: "bg-primary/10 text-primary",
  RESOLVED: "bg-success-soft text-success",
};

export function IKomekForm({
  buildingAddress,
  apartmentNumber,
  initialComplaints,
}: {
  buildingAddress: string;
  apartmentNumber: string;
  initialComplaints: IKomekComplaintView[];
}) {
  const { t } = useTranslation();
  const router = useRouter();

  const CATEGORIES: { value: IKomekCategory; label: string }[] = [
    { value: "HEATING", label: t("ikomek_heating") },
    { value: "WATER_SUPPLY", label: t("ikomek_water") },
    { value: "YARD", label: t("ikomek_yard") },
    { value: "GARBAGE", label: t("ikomek_garbage") },
    { value: "LIGHTING", label: t("ikomek_lighting") },
    { value: "OTHER", label: t("ikomek_other") },
  ];

  const [category, setCategory] = useState<IKomekCategory>("HEATING");
  const [description, setDescription] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<IKomekComplaintView[]>(initialComplaints);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Опишите проблему");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ikomek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, description, photoUrls }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка при отправке");

      setComplaints([data, ...complaints]);
      setDescription("");
      setPhotoUrls([]);
      router.refresh();
    } catch (caughtError) {
const err = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Форма подачи обращения */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="pt-6">
          <div className="mb-4">
            <h2 className="m-0 text-base font-bold">Подать обращение в iKomek 109</h2>
            <p className="m-0 mt-1 text-xs text-muted-foreground">
              Адрес: {buildingAddress}, кв. {apartmentNumber}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {t("label_problem_category")}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      category === c.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {t("label_problem_description")}
              </label>
              <textarea
                className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
                rows={3}
                placeholder={t("placeholder_ikomek_desc")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {t("label_problem_photo")}
              </label>
              <PhotoUpload value={photoUrls} onChange={setPhotoUrls} />
            </div>

            {error && <p className="m-0 text-xs text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full rounded-xl">
              {loading ? t("status_sending") : t("btn_send_ikomek")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Список моих обращений */}
      <div className="flex flex-col gap-3">
        <h2 className="m-0 text-base font-semibold">{t("title_my_ikomek_tickets")}</h2>
        {complaints.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("label_no_ikomek_tickets")}</p>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0">
            {complaints.map((c) => (
              <li key={c.id}>
                <Card className="rounded-2xl shadow-sm">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-primary">
                          {c.ticketNumber ? `№ ${c.ticketNumber}` : "109"}
                        </span>
                        <p className="m-0 font-bold text-sm">{ikomekCategoryLabels[c.category]}</p>
                      </div>
                      <Badge
                        className={`rounded-full border-none px-2.5 py-0.5 text-[11px] font-bold ${
                          STATUS_TONE[c.status]
                        }`}
                      >
                        {ikomekStatusLabels[c.status]}
                      </Badge>
                    </div>

                    <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                      {c.description}
                    </p>

                    {c.photoUrls && c.photoUrls.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {c.photoUrls.map((url) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={url}
                            src={url}
                            alt="Фото обращения"
                            className="size-14 rounded-lg border border-border object-cover"
                          />
                        ))}
                      </div>
                    )}

                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Подано {new Date(c.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
