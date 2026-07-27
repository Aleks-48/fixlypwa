import { NextResponse } from "next/server";
import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { memberContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  optionId: z.string().uuid(),
  authMethod: z.string().optional(),
  voteId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  const option = await prisma.pollOption.findUnique({
    where: { id: parsed.data.optionId },
    include: { poll: true },
  });

  if (!option || !option.poll) {
    return Errors.notFound("Вариант ответа или опрос не найден");
  }

  const poll = option.poll as any;
  const isExpired = poll.deadline ? new Date() > new Date(poll.deadline) : false;
  if (poll.isClosed || isExpired) {
    return Errors.validation("Голосование завершено");
  }

  const occupant = (await prisma.occupant.findFirst({
    where: { userId: ctx.auth.user.id } as any,
    include: { apartment: true } as any,
  })) as any;

  if (!occupant) {
    return Errors.validation("Вы не зарегистрированы как жилец");
  }

  const apartmentId = occupant.apartmentId || occupant.apartment?.id;
  if (!apartmentId) {
    return Errors.validation("У вас не привязана квартира");
  }

  const voterIin = occupant.iin || "000000000000";
  const squareMeters = Number(occupant.apartment?.area) || occupant.apartment?.squareMeters || 0;

  const voteData = {
    osiId: option.osiId || ctx.osiId,
    pollOptionId: option.id,
    apartmentId,
    voterIin,
    squareMeters,
    authMethod: parsed.data.authMethod || "SYSTEM",
  } as any;

  await prisma.vote.upsert({
    where: {
      id: parsed.data.voteId || "no-id",
    } as any,
    update: voteData,
    create: {
      ...voteData,
      pollId: option.poll.id,
    },
  });

  return ok({ success: true });
}