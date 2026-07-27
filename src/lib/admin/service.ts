import "server-only";
import { randomBytes } from "node:crypto";
import type { MasterStatus, Prisma, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { forTenant } from "@/lib/db/tenant";
import { hashPassword } from "@/lib/auth/password";

/**
 * Сервис админки платформы (ADR-0008, admin-panel.md). Инвариант доступа:
 *  - identity-таблицы (Osi, User, UserOsiRole, Master, AdminAuditLog) — обычный prisma;
 *  - тенантные данные — ТОЛЬКО через штатный forTenant(osiId), где osiId взят из identity-
 *    таблицы Osi ПОСЛЕ гейта adminContext/requireSuperadminPage. Никакого BYPASSRLS-клиента
 *    в веб-рантайме не существует (ADR-0008, решение 2).
 * Каждая мутация пишет AdminAuditLog (REQ-110); секреты (пароли) в diff не попадают.
 */

// Append-only журнал действий админки. Отдельная функция, чтобы аудит нельзя было «забыть»
// молча: каждая мутация ниже завершается adminAudit(...).
function adminAudit(
  db: Prisma.TransactionClient | typeof prisma,
  actorUserId: string,
  action: string,
  entityId: string,
  diff?: Prisma.InputJsonValue,
) {
  return db.adminAuditLog.create({ data: { actorUserId, action, entityId, diff } });
}

// ---------------------------------------------------------------------------
// Мастера (REQ-114, закрывает Q-053)
// ---------------------------------------------------------------------------

// Все анкеты мастеров: PENDING первыми (очередь на проверку), затем по дате подачи.
export async function listMasters() {
  const masters = await prisma.master.findMany({
    include: { user: { select: { phone: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return masters.sort((a, b) => Number(b.status === "PENDING") - Number(a.status === "PENDING"));
}

export async function setMasterStatus(actorUserId: string, masterId: string, status: MasterStatus) {
  const before = await prisma.master.findUnique({ where: { id: masterId } });
  if (!before) return null;
  const master = await prisma.master.update({ where: { id: masterId }, data: { status } });
  await adminAudit(prisma, actorUserId, "MASTER_STATUS", masterId, {
    from: before.status,
    to: status,
  });
  return master;
}

// ---------------------------------------------------------------------------
// ОСИ: список и карточка (REQ-111/113)
// ---------------------------------------------------------------------------

// Общая выборка управляющих ролей ОСИ (список и карточка обязаны показывать одинаковый круг лиц).
const osiManagerRoles = {
  where: { role: { in: ["CHAIRMAN", "SUPERADMIN"] } },
  include: { user: { select: { phone: true, email: true } } },
} satisfies Prisma.Osi$rolesArgs;

export type OsiSummary = {
  id: string;
  name: string;
  bin: string | null;
  createdAt: Date;
  chairmen: { userId: string; phone: string | null; email: string | null }[];
  buildingsCount: number;
  subscriptions: Partial<Record<SubscriptionStatus, number>>;
};

// Список всех ОСИ: identity-часть одним запросом, тенантные агрегаты — forTenant-циклом
// (O(N ОСИ) транзакций — приемлемо на целевом масштабе, ADR-0008 «Последствия»).
export async function listOsisWithStats(): Promise<OsiSummary[]> {
  const osis = await prisma.osi.findMany({
    include: { roles: osiManagerRoles },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    osis.map(async (osi) => {
      const [buildingsCount, subs] = await forTenant(osi.id, (tx) =>
        Promise.all([
          tx.building.count(),
          tx.subscription.groupBy({ by: ["status"], _count: true }),
        ]),
      );
      return {
        id: osi.id,
        name: osi.name,
        bin: osi.bin,
        createdAt: osi.createdAt,
        chairmen: osi.roles.map((r) => ({
          userId: r.userId,
          phone: r.user.phone,
          email: r.user.email,
        })),
        buildingsCount,
        subscriptions: Object.fromEntries(subs.map((s) => [s.status, s._count])),
      };
    }),
  );
}

// Карточка ОСИ: дома с подписками (тенантные — через forTenant той же ОСИ).
export async function getOsiDetail(osiId: string) {
  const osi = await prisma.osi.findUnique({
    where: { id: osiId },
    include: { roles: osiManagerRoles },
  });
  if (!osi) return null;

  const buildings = await forTenant(osiId, (tx) =>
    tx.building.findMany({
      include: { subscription: true },
      orderBy: { address: "asc" },
    }),
  );
  return { osi, buildings };
}

// ---------------------------------------------------------------------------
// Подписки (REQ-111)
// ---------------------------------------------------------------------------

export type SetSubscriptionInput = {
  osiId: string;
  buildingId: string;
  status: SubscriptionStatus;
  periodStart?: Date;
  periodEnd?: Date | null;
};

// Upsert подписки дома. Принадлежность дома ОСИ доказывается ЧТЕНИЕМ ВНУТРИ forTenant
// (RLS вернёт null для чужого дома) — тот же принцип, что offer→listing.osiId в
// marketplace.md §3а: не доверяем паре (osiId, buildingId) из клиентского ввода.
export async function setSubscription(actorUserId: string, input: SetSubscriptionInput) {
  const result = await forTenant(input.osiId, async (tx) => {
    const building = await tx.building.findUnique({ where: { id: input.buildingId } });
    if (!building) return null; // чужой/несуществующий дом — RLS отсёк

    const before = await tx.subscription.findUnique({ where: { buildingId: building.id } });
    const sub = await tx.subscription.upsert({
      where: { buildingId: building.id },
      create: {
        osiId: input.osiId,
        buildingId: building.id,
        status: input.status,
        periodStart: input.periodStart ?? new Date(),
        periodEnd: input.periodEnd ?? null,
      },
      update: {
        status: input.status,
        ...(input.periodStart !== undefined && { periodStart: input.periodStart }),
        ...(input.periodEnd !== undefined && { periodEnd: input.periodEnd }),
      },
    });
    return { sub, from: before?.status ?? null };
  });
  if (!result) return null;

  await adminAudit(prisma, actorUserId, "SUBSCRIPTION_SET", result.sub.buildingId, {
    osiId: input.osiId,
    from: result.from,
    to: result.sub.status,
  });
  return result.sub;
}

// ---------------------------------------------------------------------------
// Аккаунты председателей (REQ-112)
// ---------------------------------------------------------------------------

// Временный пароль: 12 base64url-символов (~72 бита). Показывается ОДИН РАЗ в ответе UI,
// в AdminAuditLog/логи не пишется (admin-panel.md §4).
function generateTempPassword(): string {
  return randomBytes(9).toString("base64url");
}

export type GrantChairmanInput = { osiId: string; phone: string; email?: string };

export type GrantChairmanResult =
  | { ok: true; userId: string; created: boolean; tempPassword: string | null }
  | { ok: false; error: "OSI_NOT_FOUND" | "EMAIL_TAKEN" };

// Привязка председателя к ОСИ: существующий телефон → добавить роль (идемпотентно);
// нового пользователя создаём с временным паролем (если задан email — вход email+пароль,
// иначе вход по телефону+OTP, ADR-0005).
export async function grantChairman(
  actorUserId: string,
  input: GrantChairmanInput,
): Promise<GrantChairmanResult> {
  const osi = await prisma.osi.findUnique({ where: { id: input.osiId } });
  if (!osi) return { ok: false, error: "OSI_NOT_FOUND" };

  let user = await prisma.user.findUnique({ where: { phone: input.phone } });
  let created = false;
  let tempPassword: string | null = null;

  if (!user) {
    if (input.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: input.email } });
      if (emailTaken) return { ok: false, error: "EMAIL_TAKEN" };
      tempPassword = generateTempPassword();
    }
    user = await prisma.user.create({
      data: {
        phone: input.phone,
        email: input.email ?? null,
        passwordHash: tempPassword ? hashPassword(tempPassword) : null,
      },
    });
    created = true;
  }

  // Идемпотентно, с повышением: RESIDENT → CHAIRMAN (житель стал председателем — обычный
  // кейс выборов в ОСИ); CHAIRMAN остаётся как есть; SUPERADMIN (саппорт-доступ) НЕ понижаем.
  const existingRole = await prisma.userOsiRole.findUnique({
    where: { userId_osiId: { userId: user.id, osiId: input.osiId } },
  });
  if (!existingRole) {
    await prisma.userOsiRole.create({
      data: { userId: user.id, osiId: input.osiId, role: "CHAIRMAN" },
    });
  } else if (existingRole.role === "RESIDENT") {
    await prisma.userOsiRole.update({
      where: { userId_osiId: { userId: user.id, osiId: input.osiId } },
      data: { role: "CHAIRMAN" },
    });
  }

  await adminAudit(prisma, actorUserId, "CHAIRMAN_GRANT", user.id, {
    osiId: input.osiId,
    created,
  });
  return { ok: true, userId: user.id, created, tempPassword };
}

export type ResetPasswordResult =
  { ok: true; tempPassword: string } | { ok: false; error: "USER_NOT_FOUND" | "NO_EMAIL" };

// Сброс пароля председателя: новый временный пароль + отзыв ВСЕХ сессий пользователя
// (угнанная сессия не должна переживать сброс). Требует email — иначе входа по паролю нет.
export async function resetChairmanPassword(
  actorUserId: string,
  userId: string,
): Promise<ResetPasswordResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "USER_NOT_FOUND" };
  if (!user.email) return { ok: false, error: "NO_EMAIL" };

  const tempPassword = generateTempPassword();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(tempPassword) },
    }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);

  await adminAudit(prisma, actorUserId, "PASSWORD_RESET", userId);
  return { ok: true, tempPassword };
}

// ---------------------------------------------------------------------------
// Дашборд (REQ-113)
// ---------------------------------------------------------------------------

export async function platformStats() {
  const [userCount, masterByStatus, osis] = await Promise.all([
    prisma.user.count(),
    prisma.master.groupBy({ by: ["status"], _count: true }),
    prisma.osi.findMany({ select: { id: true } }),
  ]);

  // Тенантные счётчики — суммой по ОСИ (ADR-0008: O(N) приемлемо, кэш — при росте).
  let buildings = 0;
  let apartments = 0;
  let openRequests = 0;
  for (const osi of osis) {
    const [b, a, r] = await forTenant(osi.id, (tx) =>
      Promise.all([
        tx.building.count(),
        tx.apartment.count(),
        tx.request.count({ where: { status: { in: ["RECEIVED", "IN_PROGRESS"] } } }),
      ]),
    );
    buildings += b;
    apartments += a;
    openRequests += r;
  }

  return {
    osiCount: osis.length,
    userCount,
    masters: Object.fromEntries(masterByStatus.map((m) => [m.status, m._count])),
    buildings,
    apartments,
    openRequests,
  };
}

export async function searchUsers(query?: string) {
  const clean = query?.trim().toLowerCase();
  const where: Prisma.UserWhereInput = clean
    ? {
        OR: [
          { email: { contains: clean, mode: "insensitive" } },
          { phone: { contains: clean, mode: "insensitive" } },
        ],
      }
    : {};
  return prisma.user.findMany({
    where,
    include: {
      roles: { include: { osi: { select: { name: true } } } },
      master: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listAllBuildingsWithApartments() {
  const osis = await prisma.osi.findMany({ select: { id: true, name: true } });
  const results = [];
  for (const osi of osis) {
    const blds = await forTenant(osi.id, (tx) =>
      tx.building.findMany({
        include: { apartments: { orderBy: { number: "asc" } } },
        orderBy: { address: "asc" },
      }),
    );
    for (const b of blds) {
      results.push({
        ...b,
        osiName: osi.name,
      });
    }
  }
  return results;
}

export async function listAllRequests() {
  const osis = await prisma.osi.findMany({ select: { id: true, name: true } });
  const results = [];
  for (const osi of osis) {
    const reqs = await forTenant(osi.id, (tx) =>
      tx.request.findMany({
        include: {
          building: true,
          apartment: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    );
    const authorUserIds = reqs.map((r) => r.authorUserId);
    const users = await prisma.user.findMany({
      where: { id: { in: authorUserIds } },
      select: { id: true, phone: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    for (const r of reqs) {
      results.push({
        ...r,
        osiName: osi.name,
        author: userMap.get(r.authorUserId) || null,
      });
    }
  }
  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function listAllAnnouncements() {
  const osis = await prisma.osi.findMany({ select: { id: true, name: true } });
  const results = [];
  for (const osi of osis) {
    const anns = await forTenant(osi.id, (tx) =>
      tx.announcement.findMany({
        include: { building: true },
        orderBy: { createdAt: "desc" },
      }),
    );
    const authorUserIds = anns.map((a) => a.authorUserId);
    const users = await prisma.user.findMany({
      where: { id: { in: authorUserIds } },
      select: { id: true, phone: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    for (const a of anns) {
      results.push({
        ...a,
        osiName: osi.name,
        author: userMap.get(a.authorUserId) || null,
      });
    }
  }
  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function deleteRequestAdmin(actorUserId: string, osiId: string, requestId: string) {
  const result = await forTenant(osiId, async (tx) => {
    const before = await tx.request.findUnique({ where: { id: requestId } });
    if (!before) return null;
    await tx.request.delete({ where: { id: requestId } });
    return before;
  });
  if (!result) return false;
  await adminAudit(prisma, actorUserId, "REQUEST_DELETE", requestId, {
    osiId,
    category: result.category,
    text: result.text,
  });
  return true;
}

export async function deleteAnnouncementAdmin(actorUserId: string, osiId: string, announcementId: string) {
  const result = await forTenant(osiId, async (tx) => {
    const before = await tx.announcement.findUnique({ where: { id: announcementId } });
    if (!before) return null;
    await tx.announcement.delete({ where: { id: announcementId } });
    return before;
  });
  if (!result) return false;
  await adminAudit(prisma, actorUserId, "ANNOUNCEMENT_DELETE", announcementId, {
    osiId,
    title: result.title,
  });
  return true;
}