"use client";

import { createLegalVotingAction } from "@/lib/actions/legal-voting";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Calendar, 
  FileText, 
  Users, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";

export default function NewLegalVotingPage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params?.buildingId as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    type: "Официальное ОСС",
    description: "",
    startDate: "",
    endDate: "",
    requiredQuorum: 51,
  });

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
    // Вызов реального сохранения в БД
    await createLegalVotingAction({
      buildingId,
      ...formData,
    });

    // Редирект на список голосований
    router.push(`/app/buildings/${buildingId}/legal-voting`);
    router.refresh();
  } catch (error) {
    console.error("Ошибка при сохранении:", error);
    setIsSubmitting(false);
  }
};

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-zinc-100">
      {/* Шапка с кнопкой Назад */}
      <div className="flex items-center gap-4 border-b border-zinc-800 pb-5">
        <Link
          href={`/app/buildings/${buildingId}/legal-voting`}
          className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          title="Вернуться к списку"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Инициация ОСС / Письменного опроса
            </h1>
            <span className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> ЖК РК
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-0.5">
            Заполнение повестки дня и параметров проведения общего собрания собственников
          </p>
        </div>
      </div>

      {/* Форма создания */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-5">
          
          {/* Тип голосования */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-200">
              Форма проведения
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { 
                  id: "Официальное ОСС", 
                  title: "Официальное ОСС", 
                  desc: "Очное/очно-заочное собрание собственников" 
                },
                { 
                  id: "Письменный опрос", 
                  title: "Письменный опрос", 
                  desc: "Проводится, если очное собрание не дало кворума" 
                },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setFormData({ ...formData, type: item.id })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.type === item.id
                      ? "bg-emerald-500/10 border-emerald-500/60 text-white"
                      : "bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <p className="font-semibold text-sm text-zinc-100">{item.title}</p>
                  <p className="text-xs text-zinc-400 mt-1">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Наименование / Повестка */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium text-zinc-200 flex items-center justify-between">
              <span>Повестка дня (Заголовок) <span className="text-emerald-400">*</span></span>
            </label>
            <input
              id="title"
              type="text"
              required
              placeholder="Например: Утверждение сметы расходов на 2026-2027 гг."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/80 text-sm transition-colors"
            />
          </div>

          {/* Описание / Подробности */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-zinc-200">
              Подробное описание и проекты решений
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Укажите подробные формулировки вопросов, выносимых на голосование..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/80 text-sm transition-colors resize-none"
            />
          </div>

          {/* Даты проведения */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="startDate" className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Дата начала
              </label>
              <input
                id="startDate"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500/80 text-sm transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="endDate" className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                Дата окончания
              </label>
              <input
                id="endDate"
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500/80 text-sm transition-colors"
              />
            </div>
          </div>

          {/* Кворум */}
          <div className="space-y-2 pt-2">
            <label className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Требуемый кворум для принятия решения
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, requiredQuorum: 51 })}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  formData.requiredQuorum === 51
                    ? "bg-emerald-500/10 border-emerald-500/60 text-white"
                    : "bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Более 50% (51%)</span>
                  {formData.requiredQuorum === 51 && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-xs text-zinc-400 mt-1">Обычные вопросы управления и содержания</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, requiredQuorum: 66 })}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  formData.requiredQuorum === 66
                    ? "bg-emerald-500/10 border-emerald-500/60 text-white"
                    : "bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Не менее 2/3 (66%)</span>
                  {formData.requiredQuorum === 66 && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-xs text-zinc-400 mt-1">Капремонт, замена управляющего, сборы</p>
              </button>
            </div>
          </div>

          {/* Информационная плашка */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              После создания голосование будет доступно жильцам в мобильном приложении для ознакомления и подписания с использованием ЭЦП/eGov.
            </p>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/app/buildings/${buildingId}/legal-voting`}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
          >
            Отмена
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-2"
          >
            {isSubmitting ? (
              <span>Сохранение...</span>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Опубликовать ОСС
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}