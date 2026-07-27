import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { chairmanContext, memberContext } from "@/lib/auth/context";
import { getOccupantBuilding } from "@/lib/comms/service";
import { createPoll, listPolls } from "@/lib/polls/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  buildingId: z.string().uuid("Некорректный ID дома"),
  question: z.string().min(3, "Сформулируйте вопрос").max(300),
  options: z.array(z.string().min(1).max(100)).min(2, "Минимум 2 варианта").max(6),
  // Преобразуем "" или null в undefined, чтобы предотвратить ошибку 422 при пустом поле даты
  deadline: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.date().optional()
  ),
});

// POST /api/polls — председатель создаёт быстрый опрос (Тир 1 lite, не юридический).
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  // Явное приведение типа, так как createPoll возвращает unknown
  const poll = (await createPoll(ctx.osiId, parsed.data)) as {
    id: string;
    question: string;
  };

  return ok({ poll: { id: poll.id, question: poll.question } }, { status: 201 });
}

// GET /api/polls?buildingId=… — опросы дома (председатель — любой свой дом;
// житель — только дом своей квартиры).
export async function GET(req: Request) {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(req.url, "http://localhost");
  let buildingId = url.searchParams.get("buildingId");

  if (!buildingId) {
    const occ = (await getOccupantBuilding(ctx.osiId, ctx.auth.user.id)) as {
      apartment?: { buildingId?: string };
    } | null;

    buildingId = occ?.apartment?.buildingId ?? null;
  }

  if (!buildingId) return Errors.validation("Укажите buildingId");

  return ok({ polls: await listPolls(ctx.osiId, buildingId, ctx.auth.user.id) });
}