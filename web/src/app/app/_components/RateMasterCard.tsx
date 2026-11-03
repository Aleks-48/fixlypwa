"use client";

import { useState } from "react";
import { PhotoUpload } from "./PhotoUpload";

interface RateMasterCardProps {
  requestId: string;
  masterId: string;
  masterName: string;
  onDone?: () => void;
}

const STARS = [1, 2, 3, 4, 5] as const;

export function RateMasterCard({
  requestId,
  masterId,
  masterName,
  onDone,
}: RateMasterCardProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="rate-card rate-card--done">
        <span className="rate-card__check">✓</span>
        <span>Спасибо за отзыв и оценку!</span>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!rating) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/masters/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, masterId, rating, comment, photoUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      setDone(true);
      onDone?.();
    } catch (caughtError) {
const e = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rate-card">
      <div className="rate-card__header">
        <span className="rate-card__icon">⭐</span>
        <div>
          <p className="rate-card__title">Оцените работу мастера</p>
          <p className="rate-card__sub">{masterName}</p>
        </div>
      </div>

      {/* Звёзды */}
      <div className="rate-card__stars" aria-label="Выберите оценку">
        {STARS.map((s) => (
          <button
            key={s}
            type="button"
            className={`rate-card__star ${s <= (hovered || rating) ? "rate-card__star--active" : ""}`}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`${s} звезд`}
          >
            ★
          </button>
        ))}
      </div>

      {/* Комментарий */}
      <textarea
        className="rate-card__textarea"
        placeholder="Расскажите подробнее о качестве работы (необязательно)..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={500}
      />

      {/* Фото выполненной работы */}
      <div className="mt-1">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Фото выполненной работы
        </label>
        <PhotoUpload value={photoUrls} onChange={setPhotoUrls} />
      </div>

      {error && <p className="rate-card__error">{error}</p>}

      <button
        className="rate-card__btn"
        onClick={handleSubmit}
        disabled={!rating || loading}
      >
        {loading ? "Отправка..." : "Отправить отзыв с фото"}
      </button>
    </div>
  );
}
