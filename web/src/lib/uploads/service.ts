import "server-only";
import { randomUUID } from "crypto";
import { writePrivateUpload } from "./private";
import sharp from "sharp";

// Хранилище фото — локальный volume на VPS (data-residency РК, marketplace.md Q-054):
// НЕ казахстанский S3 (лишняя зависимость для MVP простого self-host стека, CLAUDE.md).
// Файлы лежат в public/uploads — Next отдаёт их статикой без отдельного route handler.
// В Docker каталог смонтирован как именованный volume (docker-compose.yml), переживает передеплой.
const MAX_DIMENSION = 1600; // px по длинной стороне — вложение, не оригинал с телефона

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const ALLOWED_AUDIO_MIME = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
]);

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 МБ

export function isAllowedAudioMime(mimeType: string): boolean {
  return ALLOWED_AUDIO_MIME.has(mimeType);
}

// Единственный легальный вид ссылки на загруженный файл — то, что возвращает saveUploadedImage
// ниже. Валидаторы API (photoUrls заявки, вложения сообщений) обязаны использовать ЭТУ константу,
// а не свою копию регулярки: изменится схема пути — все проверки изменятся вместе с ней.
export const UPLOAD_URL_RE = /^\/uploads\/([\w-]+\/)?[\w.-]+$/;

export function isAllowedImageMime(mimeType: string): boolean {
  return ALLOWED_MIME.has(mimeType);
}

// Пересжимает и сохраняет фото заявки. Перекодирование в webp через sharp ПОПУТНО стирает
// EXIF/метаданные оригинала (sharp не переносит их, если явно не запросить .withMetadata()) —
// это важно для приватности: телефон часто пишет в EXIF точные GPS-координаты съёмки.
export async function saveUploadedImage(buffer: Buffer, mimeType: string, ownerUserId?: string): Promise<string> {
  if (!isAllowedImageMime(mimeType)) {
    throw new Error(`Неподдерживаемый тип файла: ${mimeType}`);
  }

  const resized = await sharp(buffer)
    .rotate() // учитывает EXIF-ориентацию ДО того, как метаданные будут отброшены
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const filename = `${randomUUID()}.webp`;
  return writePrivateUpload(filename, resized, ownerUserId);
}

// Сохраняет аудио-вложение голосового сообщения. Без перекодирования — только UUID-имя
// и ограничение размера. Хранится рядом с фото в public/uploads/audio/.
export async function saveUploadedAudio(buffer: Buffer, mimeType: string, ownerUserId?: string): Promise<string> {
  if (!isAllowedAudioMime(mimeType)) {
    throw new Error(`Неподдерживаемый аудио-тип: ${mimeType}`);
  }
  if (buffer.length > MAX_AUDIO_BYTES) {
    throw new Error("Аудио-файл слишком большой (макс. 10 МБ)");
  }

  const ext = mimeType === "audio/webm" ? ".webm"
    : mimeType === "audio/ogg" ? ".ogg"
    : mimeType === "audio/mp4" ? ".m4a"
    : ".audio";

  const filename = `${randomUUID()}${ext}`;
  return writePrivateUpload(`audio/${filename}`, buffer, ownerUserId);
}
