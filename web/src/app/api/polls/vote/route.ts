import { memberContext } from "@/lib/auth/context";
import { forTenant } from "@/lib/db/tenant";
import { Errors, fail, ok } from "@/lib/http";
import { vote } from "@/lib/polls/service";
import { z } from "zod";
export async function POST(req: Request) {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;
  const parsed = z.object({ optionId: z.string().uuid() }).strict().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation("Укажите вариант обычного опроса");
  const permitted = await forTenant(ctx.osiId, async tx => {
    const option = await tx.pollOption.findUnique({ where: { id: parsed.data.optionId }, include: { poll: true } });
    if (!option) return false;
    return !!await tx.occupant.findFirst({ where: { userId: ctx.auth.user.id, apartment: { buildingId: option.poll.buildingId } } });
  });
  if (!permitted) return Errors.forbidden("Опрос доступен жителям этого дома");
  const result = await vote(ctx.osiId, parsed.data.optionId, ctx.auth.user.id);
  if (result === "not_found") return Errors.notFound("Опрос");
  if (result === "closed") return fail("POLL_CLOSED", "Опрос завершён", 409);
  return ok({ voted: true });
}
