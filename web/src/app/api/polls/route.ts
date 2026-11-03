import { chairmanContext, memberContext } from "@/lib/auth/context";
import { hasRole } from "@/lib/auth/guards";
import { getOccupantBuilding } from "@/lib/comms/service";
import { getBuilding, listBuildings } from "@/lib/onboarding/service";
import { Errors, ok } from "@/lib/http";
import { createPoll, listPolls } from "@/lib/polls/service";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const Body = z.object({
  buildingId: z.string().uuid(),
  question: z.string().trim().min(3).max(300).optional(),
  title: z.string().trim().min(3).max(300).optional(),
  type: z.literal("INFORMATIONAL").optional(),
  deadline: z.coerce.date().nullish(), endDate: z.coerce.date().nullish(),
  options: z.array(z.string().trim().min(1).max(100)).min(2).max(10),
}).refine(data => !!(data.question || data.title), "Укажите вопрос");
// ACCEPT-005: ordinary polls; legal voting requires ADR-0007 integration.
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation("Укажите вопрос, варианты и дату обычного опроса. Юридические голосования пока не подключены.");
  if (!await getBuilding(ctx.osiId, parsed.data.buildingId)) return Errors.notFound("Дом");
  const deadline = parsed.data.deadline ?? parsed.data.endDate;
  if (deadline && deadline.getTime() <= Date.now()) return Errors.validation("Дата завершения должна быть в будущем");
  const poll = await createPoll(ctx.osiId, { ...parsed.data, question: parsed.data.question ?? parsed.data.title!, deadline });
  return ok({ poll }, { status: 201 });
}
export async function GET(req: Request) {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;
  let buildingId = new URL(req.url).searchParams.get("buildingId");
  if (hasRole(ctx.auth, ctx.osiId, "CHAIRMAN", "SUPERADMIN")) {
    buildingId ??= (await listBuildings(ctx.osiId))[0]?.id ?? null;
  } else {
    const occupant = await getOccupantBuilding(ctx.osiId, ctx.auth.user.id);
    const ownBuilding = occupant?.apartment.buildingId;
    if (buildingId && buildingId !== ownBuilding) return Errors.forbidden();
    buildingId = ownBuilding ?? null;
  }
  if (!buildingId) return ok({ polls: [] });
  return ok({ polls: await listPolls(ctx.osiId, buildingId, ctx.auth.user.id) });
}
