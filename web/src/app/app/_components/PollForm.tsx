"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useRouter } from "next/navigation";
import { useState,useTransition } from "react";
import { createPollAction } from "../buildings/[buildingId]/polls/actions";

interface PollFormProps {
  buildingId: string;
}

export function PollForm({ buildingId }: PollFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>([t("btn_yes"), t("btn_no")]);
  const [error, setError] = useState<string | null>(null);

  const handleAddOption = () => {
    setOptions((prev) => [...prev, ""]);
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!question.trim()) {
      setError(t("error_enter_question"));
      return;
    }

    const filteredOptions = options.map((o) => o.trim()).filter(Boolean);
    if (filteredOptions.length < 2) {
      setError(t("error_min_two_options"));
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("buildingId", buildingId);
      formData.append("question", question.trim());
      formData.append("title", question.trim());
      
      filteredOptions.forEach((opt) => {
        formData.append("options", opt);
      });

      try {
        const res = await createPollAction(buildingId, formData);
        
        if (res && !res.success) {
          setError(res.error || t("error_poll_create_failed"));
          return;
        }

        setQuestion("");
        setOptions([t("btn_yes"), t("btn_no")]);
        router.refresh();
      } catch (caughtError) {
const err = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

        setError(err?.message || t("error_save_failed"));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">{t("label_question")}</label>
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t("placeholder_poll_question")}
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">{t("label_answer_options")}</label>
        {options.map((option, idx) => (
          <Input
            key={idx}
            value={option}
            onChange={(e) => handleOptionChange(idx, e.target.value)}
            placeholder={`${t("label_option")} ${idx + 1}`}
            disabled={isPending}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddOption}
          disabled={isPending}
        >
          + {t("label_option")}
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? t("status_creating") : t("label_create_poll")}
        </Button>
      </div>

      {error && (
        <p className="text-xs font-medium text-destructive mt-1">{error}</p>
      )}
    </form>
  );
}