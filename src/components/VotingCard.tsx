'use client';

import React, { useState } from 'react';

interface Question {
  id: string;
  text: string;
  options: string[];
}

interface VotingProps {
  votingId: string;
  title: string;
  description: string;
  endDate: string;
  apartmentArea: number; // Вес голоса (площадь в м²)
  apartmentName: string; // Напр. "кв. 42"
  questions: Question[];
}

export default function VotingCard({
  votingId,
  title,
  description,
  endDate,
  apartmentArea,
  apartmentName,
  questions,
}: VotingProps) {
  // Храним выбранные варианты: { [questionId]: "За" }
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptionSelect = (questionId: string, option: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверка: ответил ли жилец на все вопросы
    if (Object.keys(selectedAnswers).length < questions.length) {
      setError('Пожалуйста, ответьте на все вопросы голосования.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/votings/${votingId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: selectedAnswers,
          apartmentArea,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Ошибка при отправке голоса');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при отправке.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-green-50 border border-green-200 rounded-xl text-center">
        <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
          ✓
        </div>
        <h3 className="text-xl font-bold text-green-800 mb-1">Ваш голос принят!</h3>
        <p className="text-sm text-green-700">
          Спасибо за участие. Ваш голос учтён с весом площади <strong>{apartmentArea} м²</strong> ({apartmentName}).
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
      {/* Шапка голосования */}
      <div className="p-6 border-b border-gray-100 bg-gray-50">
        <div className="flex justify-between items-start mb-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold uppercase">
            Активное голосование
          </span>
          <span className="text-xs text-gray-500">До {endDate}</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-600">{description}</p>
        
        {/* Инфо о голосующем */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex justify-between items-center text-sm">
          <span className="text-blue-900 font-medium">Объект: {apartmentName}</span>
          <span className="text-blue-800 font-semibold">Вес голоса: {apartmentArea} м²</span>
        </div>
      </div>

      {/* Форма вопросов */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        {questions.map((q, idx) => (
          <div key={q.id} className="p-4 rounded-xl border border-gray-200 bg-white">
            <p className="font-semibold text-gray-900 mb-3">
              {idx + 1}. {q.text}
            </p>
            <div className="space-y-2">
              {q.options.map((option) => {
                const isSelected = selectedAnswers[q.id] === option;
                return (
                  <label
                    key={option}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-medium'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={option}
                        checked={isSelected}
                        onChange={() => handleOptionSelect(q.id, option)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span>{option}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition duration-150 disabled:opacity-50 shadow-sm"
        >
          {loading ? 'Отправка и регистрация...' : 'Проголосовать'}
        </button>
      </form>
    </div>
  );
}