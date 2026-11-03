import { forTenant } from "@/lib/db/tenant";

// Быстрые опросы (Тир 1 lite, features.md блок C): НЕ юридически значимые — без кворума/ЭЦП.
// Легитимные голосования собрания — Тир 2 за аккредитацией (ADR-0007), здесь их НЕТ осознанно.

export type NewPoll = {
  buildingId: string;
  question: string;
  options: string[]; // 2..6 вариантов
  deadline?: Date | null;
};

export function createPoll(osiId: string, input: NewPoll) {
  return forTenant(osiId, (tx) =>
    tx.poll.create({
      data: {
        osiId,
        buildingId: input.buildingId,
        question: input.question,
        deadline: input.deadline ?? null,
        options: {
          create: input.options.map((label) => ({ osiId, label })),
        },
      },
      include: { options: true },
    }),
  );
}

export type PollView = {
  id: string;
  question: string;
  deadline: Date | null;
  closed: boolean;
  totalVotes: number;
  myOptionId: string | null;
  options: { id: string; label: string; votes: number }[];
};

// Опросы дома: счётчики голосов + мой выбор. Мгновенный подсчёт (features.md блок C).
export function listPolls(
  osiId: string,
  buildingId: string,
  viewerUserId: string,
): Promise<PollView[]> {
  return forTenant(osiId, async (tx) => {
    const polls = await tx.poll.findMany({
      where: { buildingId },
      orderBy: { createdAt: "desc" },
      include: {
        options: {
          include: {
            _count: { select: { votes: true } },
            votes: { where: { userId: viewerUserId }, select: { userId: true } },
          },
        },
      },
    });
    const now = Date.now();
    return polls.map((p) => ({
      id: p.id,
      question: p.question,
      deadline: p.deadline,
      closed: p.deadline !== null && p.deadline.getTime() < now,
      totalVotes: p.options.reduce((s, o) => s + o._count.votes, 0),
      myOptionId: p.options.find((o) => o.votes.length > 0)?.id ?? null,
      options: p.options.map((o) => ({ id: o.id, label: o.label, votes: o._count.votes })),
    }));
  });
}

export type VoteResult = "ok" | "not_found" | "closed";

// Голос: 1 на пользователя на опрос (переголосование разрешено — прошлый голос заменяется).
// Схема уникальна по (optionId,userId), а не по опросу — целостность на уровне опроса
// обеспечиваем здесь: удаляем прежний голос по ЛЮБОЙ опции этого опроса в той же транзакции.
export function vote(osiId: string, optionId: string, userId: string): Promise<VoteResult> {
  return forTenant(osiId, async (tx) => {
    const option = await tx.pollOption.findUnique({
      where: { id: optionId },
      include: { poll: { select: { id: true, deadline: true } } },
    });
    if (!option) return "not_found";
    if (option.poll.deadline && option.poll.deadline.getTime() < Date.now()) return "closed";

    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${option.poll.id + ":" + userId}, 0))::text`;
    await tx.vote.deleteMany({
      where: { userId, option: { pollId: option.poll.id } },
    });
    await tx.vote.create({ data: { osiId, optionId, userId } });
    return "ok";
  });
}
