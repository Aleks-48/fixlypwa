"use client";

import { useState } from "react";
import { Star, Camera, X } from "lucide-react";
import { createMasterReview } from "@/app/actions/masters";

interface TicketReviewFormProps {
  osiId: string;
  requestId: string;
  masterId: string;
  masterName: string;
}

export function TicketReviewForm({ osiId, requestId, masterId, masterName }: TicketReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) setPhotos((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createMasterReview({
        osiId,
        requestId,
        masterId,
        rating,
        comment,
        photoUrls: photos,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full rounded-2xl border border-border bg-card p-4 space-y-4 shadow-sm">
      <div>
        <h3 className="m-0 text-sm font-bold">Оцените работу мастера</h3>
        <p className="m-0 mt-0.5 text-xs text-muted-foreground">
          Как прошла работа с мастером {masterName}?
        </p>
      </div>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 transition-transform hover:scale-110 focus:outline-none cursor-pointer"
          >
            <Star
              className={`h-7 w-7 ${
                (hoverRating || rating) >= star
                  ? "fill-amber-400 stroke-amber-400"
                  : "stroke-muted-foreground fill-none"
              }`}
            />
          </button>
        ))}
      </div>

      <textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Напишите комментарий о качестве работы..."
        className="w-full rounded-xl border border-border bg-transparent p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
      />

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Фото работы (необязательно)</p>
        <div className="flex items-center gap-2 flex-wrap">
          {photos.map((src, idx) => (
            <div key={idx} className="relative h-16 w-16 rounded-lg overflow-hidden border border-border">
              <img src={src} alt="Превью" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 transition-colors">
            <Camera className="h-5 w-5" />
            <span className="text-[10px] mt-1">Фото</span>
            <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
      >
        {submitting ? "Отправка..." : "Отправить отзыв"}
      </button>
    </form>
  );
}