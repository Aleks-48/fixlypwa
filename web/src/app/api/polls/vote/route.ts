import { NextResponse } from "next/server";
import { z } from "zod";
import { ok, Errors, fail } from "@/lib/http";
import { memberContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  optionId: z.string().uuid(),
  authMethod: z
    .enum([
      "AITU_PASSPORT",
      "EDS_NCALAYER",
      "SMS_OTP",
      "TELEGRAM_OTP",
      "DRAWN_SIGNATURE",
    ])
    .default("SMS_OTP"),
  signatureUrl: z.string().optional(),
});

// POST /api/polls/vote — официальный юридически значимый голос жителя
export async function POST(req: Request) {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation("Некорректные данные голоса");

  // 1. Находим вариант ответа и опрос
  const option = await prisma.pollOption.findUnique({
    where: { id: parsed.data.optionId },
    include: { poll: true },
  });

  if (!option || !option.poll) return Errors.notFound("Вариант ответа или опрос");

  const poll = option.poll as any;
  const isClosed = poll.isClosed || false;
  const endDate = poll.endDate || poll.deadline;

  if (isClosed || (endDate && new Date() > new Date(endDate))) {
    return fail("POLL_CLOSED", "Опрос завершён", 409);
  }

  // 2. Находим квартиру и жильца (поиск дома через привязанную квартиру)
  const occupant = (await prisma.occupant.findFirst({
    where: {
      userId: ctx.auth.user.id,
      apartment: { buildingId: poll.buildingId },
    } as any,
    include: { apartment: true },
  })) as any;

  if (!occupant || !occupant.apartment) {
    return Errors.validation("У вас нет привязанной квартиры в этом доме");
  }

  const voterIin = occupant.iin || occupant.user?.iin || "000000000000";
  const voterName = occupant.fullName || occupant.user?.name || "Жилец";
  const squareMeters = Number(occupant.apartment.area || occupant.apartment.squareMeters) || 0;

  // 3. Генерируем хэш подписи (Audit Trail)
  const rawString = `${poll.id}_${option.id}_${voterIin}_${squareMeters}_${Date.now()}`;
  const signatureHash = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "secret_key")
    .update(rawString)
    .digest("hex");

  // 4. Проверяем существование голоса от квартиры и обновляем или создаем (1 квартира = 1 голос)
  const existingVote = await prisma.vote.findFirst({
    where: {
      pollId: poll.id,
      apartmentId: occupant.apartment.id,
    } as any,
  });

  let vote: any;

  if (existingVote) {
    vote = await prisma.vote.update({
      where: { id: existingVote.id },
      data: {
        optionId: option.id,
        pollOptionId: option.id,
        authMethod: parsed.data.authMethod,
        signatureHash,
        signatureUrl: parsed.data.signatureUrl,
      } as any,
    });
  } else {
    vote = await prisma.vote.create({
      data: {
        osiId: ctx.osiId,
        pollId: poll.id,
        optionId: option.id,
        pollOptionId: option.id,
        apartmentId: occupant.apartment.id,
        userId: ctx.auth.user.id,
        voterIin,
        voterName,
        squareMeters,
        authMethod: parsed.data.authMethod,
        signatureHash,
        signatureUrl: parsed.data.signatureUrl,
      } as any,
    });
  }

  return ok({ voted: true, voteId: vote.id, signatureHash });
}