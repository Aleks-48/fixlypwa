import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

// Хранилище фото — локальный volume на VPS (data-residency РК, marketplace.md Q-054):
// НЕ казахстанский S3 (лишняя зависимость для MVP простого self-host стека, CLAUDE.md).
// Файлы лежат в public/uploads — Next отдаёт их статикой без отдельного route handler.
// В Docker каталог смонтирован как именованный volume (docker-compose.yml), переживает передеплой.
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_DIMENSION = 1600; // px по длинной стороне — вложение, не оригинал с телефона

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isAllowedImageMime(mimeType: string): boolean {
  return ALLOWED_MIME.has(mimeType);
}

// Пересжимает и сохраняет фото заявки. Перекодирование в webp через sharp ПОПУТНО стирает
// EXIF/метаданные оригинала (sharp не переносит их, если явно не запросить .withMetadata()) —
// это важно для приватности: телефон часто пишет в EXIF точные GPS-координаты съёмки.
export async function saveUploadedImage(buffer: Buffer, mimeType: string): Promise<string> {
  if (!isAllowedImageMime(mimeType)) {
    throw new Error(`Неподдерживаемый тип файла: ${mimeType}`);
  }

  const resized = await sharp(buffer)
    .rotate() // учитывает EXIF-ориентацию ДО того, как метаданные будут отброшены
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  await mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `${randomUUID()}.webp`;
  await writeFile(path.join(UPLOADS_DIR, filename), resized);

  return `/uploads/${filename}`;
}
