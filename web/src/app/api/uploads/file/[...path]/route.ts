import { getCurrentAuth } from "@/lib/auth/session";
import { Errors } from "@/lib/http";
import { canReadUpload, readPrivateUpload, safeUploadName } from "@/lib/uploads/private";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const mime: Record<string, string> = {
  webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  pdf: "application/pdf", webm: "audio/webm", ogg: "audio/ogg", m4a: "audio/mp4",
  audio: "application/octet-stream", mp3: "audio/mpeg", wav: "audio/wav",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
export async function GET(_req: Request, context: { params: Promise<{ path: string[] }> }) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();
  const name = safeUploadName((await context.params).path);
  const ext = name?.split(".").pop()?.toLowerCase() ?? "";
  if (!name || !mime[ext] || !await canReadUpload(auth, `/uploads/${name}`)) return Errors.notFound();
  const data = await readPrivateUpload(name);
  if (!data) return Errors.notFound();
  return new Response(new Uint8Array(data), { headers: {
    "Content-Type": mime[ext], "Cache-Control": "private, no-store", "Vary": "Cookie, Authorization",
    "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox",
    "Content-Disposition": `${/^(image|audio)\//.test(mime[ext]) || ext === "pdf" ? "inline" : "attachment"}; filename="${name.split("/").pop()}"`,
  } });
}
