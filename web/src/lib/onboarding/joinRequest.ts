import { prisma } from "@/lib/db/prisma";
import { OnboardingError } from "./service";

export { OnboardingError };

// Заявка жителя на подключение к ОСИ (REQ-151..154, docs/specs/osi-join-request.md).
// OsiJoinRequest — identity-таблица (ВНЕ RLS, как UserOsiRole/TelegramLink): создаётся ДО того,
// как у пользователя есть роль в этой ОСИ, поэтому все функции ниже — обычный prisma, без
// forTenant. Председатель фильтрует по СВОЕЙ osiId вручную (тот же паттерн, что chairmenOfOsi()
// в notifications/service.ts) — это не дыра в изоляции: пользователь без роли и так не видит
// ничего тенантного, а председатель получает только запросы к СВОЕЙ osiId (условие в WHERE).

export type OsiSearchResult = { id: string; name: string; address: string | null };

// Поиск ОСИ по названию/адресу (REQ-151) — Osi вне RLS, доступен любому вошедшему пользователю
// независимо от tenant-контекста (это и есть сценарий: житель ЕЩЁ не состоит ни в одной ОСИ).
export function searchOsi(query: string): Promise<OsiSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return Promise.resolve([]);
  return prisma.osi.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, address: true },
    orderBy: { name: "asc" },
    take: 10,
  });
}

// Активные (PENDING) заявки текущего пользователя — чтобы UI показал статус вместо повторного
// поиска (REQ-154: одна заявка на ОСИ, но пользователь мог отправить в несколько).
export function listMyJoinRequests(userId: string) {
  return prisma.osiJoinRequest.findMany({
    where: { userId, status: "PENDING" },
    include: { osi: { select: { name: true, address: true } } },
    orderBy: { createdAt: "desc" },
  });
}

// Отправить/обновить заявку (REQ-151/154). Upsert по (userId, osiId) — повторная отправка на
// ту же ОСИ обновляет пометку вместо дубля. Уже состоящим в ОСИ (по любой причине) — отказ:
// заявка нужна только тем, у кого ещё нет роли там.
export async function submitJoinRequest(userId: string, osiId: string, note: string | null) {
  const osi = await prisma.osi.findUnique({ where: { id: osiId } });
  if (!osi) throw new OnboardingError("OSI_NOT_FOUND", "ОСИ не найдена");

  const existingRole = await prisma.userOsiRole.findUnique({
    where: { userId_osiId: { userId, osiId } },
  });
  if (existingRole) throw new OnboardingError("ALREADY_MEMBER", "Вы уже состоите в этой ОСИ");

  // created различает первую отправку от повторной (review 2026-07-22, REQ-152): повторный
  // POST на ту же ОСИ обновляет пометку, но НЕ должен заново уведомлять председателя каждый
  // раз — иначе залогиненный пользователь мог бы циклом задолбать его уведомлениями. Повторная
  // отправка ПОСЛЕ того, как заявку уже обработали (RESOLVED), — новый цикл, уведомляем снова.
  const existingRequest = await prisma.osiJoinRequest.findUnique({
    where: { userId_osiId: { userId, osiId } },
  });
  const created = !existingRequest || existingRequest.status !== "PENDING";

  const request = await prisma.osiJoinRequest.upsert({
    where: { userId_osiId: { userId, osiId } },
    update: { note, status: "PENDING", resolvedAt: null },
    create: { userId, osiId, note },
  });
  return { request, osi, created };
}

// Отозвать свою заявку (передумал/ошибся ОСИ) — только пока PENDING и только автор.
export async function cancelJoinRequest(userId: string, requestId: string): Promise<void> {
  const res = await prisma.osiJoinRequest.deleteMany({
    where: { id: requestId, userId, status: "PENDING" },
  });
  if (res.count === 0) throw new OnboardingError("REQUEST_NOT_FOUND", "Заявка не найдена");
}

// Заявки председателя (REQ-153) — вручную фильтровано по его osiId (см. комментарий выше).
export function listOsiJoinRequests(osiId: string) {
  return prisma.osiJoinRequest.findMany({
    where: { osiId, status: "PENDING" },
    include: {
      user: {
        select: {
          email: true,
          phone: true,
          occupant: { select: { fullName: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

// Отметить обработанной (REQ-153) — председатель уже подключил жителя через AddResidentForm
// (или связался напрямую и решил вопрос иначе); заявка сама привязку не делает и не проверяет.
export async function resolveJoinRequest(osiId: string, requestId: string): Promise<void> {
  const res = await prisma.osiJoinRequest.updateMany({
    where: { id: requestId, osiId, status: "PENDING" },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
  if (res.count === 0) throw new OnboardingError("REQUEST_NOT_FOUND", "Заявка не найдена");
}
