import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { createInfoItem } from "@/lib/comms/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  buildingId: z.string().uuid(),
  type: z.enum([
    "TRASH_SCHEDULE",
    "EMERGENCY_CONTACTS",
    "PAYMENT_DETAILS",
    "CHAIRMAN_CONTACTS",
    "OTHER",
  ]),
  title: z.string().min(1, "Заголовок обязателен").max(200),
  content: z.string().min(1, "Текст обязателен"),
});

// POST /api/info — председатель добавляет запись в инфо-раздел дома (features.md блок B).
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  const item = await createInfoItem(ctx.osiId, parsed.data);
  return ok({ infoItem: { id: item.id, title: item.title } }, { status: 201 });
}
