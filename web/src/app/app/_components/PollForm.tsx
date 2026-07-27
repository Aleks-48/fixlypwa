"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPollAction } from "../buildings/[buildingId]/polls/actions";

interface PollFormProps {
  buildingId: string;
}

export function PollForm({ buildingId }: PollFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["Да", "Нет"]);
  const [error, setError] = useState<string | null>(null);

  // Добавление нового варианта
  const handleAddOption = () => {
    setOptions((prev) => [...prev, ""]);
  };

  // Обновление конкретного варианта
  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидация прямо на клиенте перед отправкой
    if (!question.trim()) {
      setError("Введите вопрос");
      return;
    }

    const filteredOptions = options.map((o) => o.trim()).filter(Boolean);
    if (filteredOptions.length < 2) {
      setError("Заполните минимум 2 варианта ответа");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("buildingId", buildingId);
      formData.append("question", question.trim());
      formData.append("title", question.trim()); // Передаем и title, и question для совместимости
      
      filteredOptions.forEach((opt) => {
        formData.append("options", opt);
      });

      try {
        // Если у вас вызывается Server Action:
        const res = await createPollAction(buildingId, formData);
        
        if (res && !res.success) {
          setError(res.error || "Не удалось создать опрос");
          return;
        }

        // Очищаем форму при успехе
        setQuestion("");
        setOptions(["Да", "Нет"]);
        router.refresh();
      } catch (err: any) {
        // Если экшен бросает исключение или валидация упала
        setError(err?.message || "Произошла ошибка при сохранении");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Вопрос</label>
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Например: Ремонт крыши в 3 подъезде"
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Варианты ответов</label>
        {options.map((option, idx) => (
          <Input
            key={idx}
            value={option}
            onChange={(e) => handleOptionChange(idx, e.target.value)}
            placeholder={`Вариант ${idx + 1}`}
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
          + Вариант
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Создание..." : "Создать опрос"}
        </Button>
      </div>

      {/* Вывод понятной ошибки вместо красного "Required" */}
      {error && (
        <p className="text-xs font-medium text-destructive mt-1">{error}</p>
      )}
    </form>
  );
}