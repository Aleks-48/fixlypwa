import { forTenant } from "@/lib/db/tenant";
import crypto from "crypto";

// --- Типы и Enums (соответствуют schema.prisma) ---

export type PollType = "INFORMATIONAL" | "LEGALLY_BINDING";
export type QuorumType = "BY_AREA" | "BY_APARTMENT";
export type AuthMethod = "AITU_PASSPORT" | "EDS_NCALAYER" | "SMS_OTP";

export type NewPoll = {
  buildingId: string;
  title: string;
  description?: string;
  type?: PollType;
  quorumType?: QuorumType;
  quorumThreshold?: number;
  totalBuildingArea: number;
  totalApartments: number;
  options: string[];
  startDate?: Date;
  endDate?: Date;
};

export type PollView = {
  id: string;
  title: string;
  description: string | null;
  type: PollType;
  quorumType: QuorumType;
  quorumThreshold: number;
  startDate: Date;
  endDate: Date;
  closed: boolean;
  totalVotes: number;
  votedArea: number;
  quorumPercentage: number;
  isQuorumReached: boolean;
  myOptionId: string | null;
  options: { id: string; text: string; votes: number; areaVotes: number }[];
};

export type VoteResult =
  | "ok"
  | "not_found"
  | "closed"
  | "no_apartment"
  | "iin_required";

// --- Сервисные функции ---

/**
 * Создание опроса или юридически значимого голосования
 */
export function createPoll(osiId: string, input: NewPoll) {
  const now = new Date();
  const defaultEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return forTenant(osiId, (tx) =>
    tx.poll.create({
      data: {
        osiId,
        buildingId: input.buildingId,
        title: input.title,
        description: input.description ?? null,
        type: input.type ?? "INFORMATIONAL",
        quorumType: input.quorumType ?? "BY_AREA",
        quorumThreshold: input.quorumThreshold ?? 50.0,
        totalBuildingArea: input.totalBuildingArea,
        totalApartments: input.totalApartments,
        startDate: input.startDate ?? now,
        endDate: input.endDate ?? defaultEndDate,
        options: {
          create: input.options.map((text) => ({
            text,
            osiId,
          })),
        },
      },
      include: { options: true },
    })
  );
}

/**
 * Получение списка голосований дома с выбором голоса текущего пользователя и расчётом кворума
 */
export function listPolls(
  osiId: string,
  buildingId: string,
  viewerUserId: string
): Promise<PollView[]> {
  return forTenant(osiId, async (tx) => {
    // 1. Находим квартиру текущего жильца
    const occupant = await tx.occupant.findFirst({
      where: { userId: viewerUserId, osiId },
      select: { apartmentId: true },
    });

    const viewerApartmentId = occupant?.apartmentId;

    // 2. Получаем опросы дома с их вариантами и голосами
    const polls = await tx.poll.findMany({
      where: { buildingId, osiId },
      orderBy: { createdAt: "desc" },
      include: {
        options: {
          include: {
            votes: true,
          },
        },
        votes: viewerApartmentId
          ? {
              where: { apartmentId: viewerApartmentId },
              select: { optionId: true },
            }
          : false,
      },
    });

    const nowTime = Date.now();

    return polls.map((p) => {
      const allVotes = p.options.flatMap((o) => o.votes);
      const totalVotes = allVotes.length;

      // Суммарная проголосовавшая площадь
      const votedArea = allVotes.reduce(
        (sum, v) => sum + (v.squareMeters || 0),
        0
      );

      // Расчет кворума
      const quorumPercentage =
        p.quorumType === "BY_AREA" && p.totalBuildingArea > 0
          ? (votedArea / p.totalBuildingArea) * 100
          : p.totalApartments > 0
          ? (totalVotes / p.totalApartments) * 100
          : 0;

      const myOptionId =
        Array.isArray(p.votes) && p.votes.length > 0
          ? p.votes[0].optionId
          : null;

      const isClosedByTime = p.endDate.getTime() < nowTime;

      return {
        id: p.id,
        title: p.title,
        description: p.description,
        type: p.type,
        quorumType: p.quorumType,
        quorumThreshold: p.quorumThreshold,
        startDate: p.startDate,
        endDate: p.endDate,
        closed: p.isClosed || isClosedByTime,
        totalVotes,
        votedArea: Number(votedArea.toFixed(2)),
        quorumPercentage: Number(quorumPercentage.toFixed(1)),
        isQuorumReached: quorumPercentage >= p.quorumThreshold,
        myOptionId,
        options: p.options.map((o) => ({
          id: o.id,
          text: o.text,
          votes: o.votes.length,
          areaVotes: Number(
            o.votes
              .reduce((sum, v) => sum + (v.squareMeters || 0), 0)
              .toFixed(2)
          ),
        })),
      };
    });
  });
}

/**
 * Приём и подпись голоса жильца
 */
export function vote(
  osiId: string,
  optionId: string,
  userId: string,
  authMethod: AuthMethod = "SMS_OTP"
): Promise<VoteResult> {
  return forTenant(osiId, async (tx) => {
    // 1. Поиск варианта ответа и самого опроса
    const option = await tx.pollOption.findUnique({
      where: { id: optionId },
      include: { poll: true },
    });

    if (!option) return "not_found";

    const poll = option.poll;
    if (poll.isClosed || poll.endDate.getTime() < Date.now()) {
      return "closed";
    }

    // 2. Поиск жильца (Occupant) и его квартиры
    const occupant = await tx.occupant.findFirst({
      where: { userId, osiId },
      include: { apartment: true },
    });

    if (!occupant || !occupant.apartment) {
      return "no_apartment";
    }

    // Поиск ИИН из записи собственника (Owner)
    const owner = await tx.owner.findFirst({
      where: { apartmentId: occupant.apartmentId, osiId },
      select: { iin: true },
    });

    const voterIin = owner?.iin || "";

    // Обязательная проверка ИИН для юридических голосований
    if (poll.type === "LEGALLY_BINDING" && !voterIin) {
      return "iin_required";
    }

    const apartmentId = occupant.apartment.id;
    const squareMeters = occupant.apartment.area
      ? Number(occupant.apartment.area)
      : 0;
    const voterName = occupant.fullName || "Житель";
    const timestamp = new Date().toISOString();

    // 3. Формирование хэш-подписи голоса (защита от подделки в БД)
    const secret = process.env.VOTE_SIGNING_SECRET || "fixly-signing-secret";
    const signatureHash = crypto
      .createHmac("sha256", secret)
      .update(`${poll.id}:${optionId}:${voterIin}:${squareMeters}:${timestamp}`)
      .digest("hex");

    // 4. Переголосование: удаляем прошлый голос этой квартиры в текущем опросе
    await tx.vote.deleteMany({
      where: {
        pollId: poll.id,
        apartmentId: apartmentId,
      },
    });

    // 5. Создаём запись голоса
    await tx.vote.create({
      data: {
        osiId,
        pollId: poll.id,
        optionId,
        apartmentId,
        voterIin: voterIin || "НЕ УКАЗАН",
        voterName,
        squareMeters,
        authMethod,
        signatureHash,
      },
    });

    return "ok";
  });
}