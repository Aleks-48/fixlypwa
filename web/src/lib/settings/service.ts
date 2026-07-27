import "server-only";
import { prisma } from "@/lib/db/prisma";
import { forTenant } from "@/lib/db/tenant";

// Сервисный слой модуля «Настройки» (settings.md, REQ-045..048).
// • Osi/User — identity-таблицы, ВНЕ RLS: читаются/обновляются напрямую через prisma.
// • BankAccount, NotificationPreference — tenant-таблицы ПОД RLS: через forTenant(osiId).

// ── Тип обновления реквизитов ОСИ (REQ-045) ──────────────────────────────────
export type UpdateOsiInput = {
  name?: string;
  bin?: string | null;
  address?: string | null;
  registeredAt?: Date | null;
};

// ── Настройки ОСИ: юридические реквизиты ─────────────────────────────────────

/** Получить профиль ОСИ (вне RLS — по id). */
export function getOsiProfile(osiId: string) {
  return prisma.osi.findUnique({
    where: { id: osiId },
    select: { id: true, name: true, bin: true, address: true, registeredAt: true },
  });
}

/** Обновить юридические реквизиты ОСИ (REQ-045). */
export function updateOsiProfile(osiId: string, input: UpdateOsiInput) {
  return prisma.osi.update({
    where: { id: osiId },
    data: {
      name: input.name,
      bin: input.bin ?? undefined,
      address: input.address ?? undefined,
      registeredAt: input.registeredAt ?? undefined,
    },
    select: { id: true, name: true, bin: true, address: true, registeredAt: true },
  });
}

// ── Банковские счета (REQ-026, report-spec.md) ────────────────────────────────

/** Список банковских счетов дома (под RLS). */
export function listBankAccounts(osiId: string, buildingId: string) {
  return forTenant(osiId, (tx) =>
    tx.bankAccount.findMany({
      where: { buildingId },
      orderBy: { type: "asc" },
      select: {
        id: true,
        type: true,
        bankName: true,
        accountNumber: true,
        currentBalance: true,
        updatedAt: true,
      },
    }),
  );
}

export type UpsertBankAccountInput = {
  id?: string; // если задан — обновление, иначе создание
  buildingId: string;
  type: "CURRENT" | "SAVINGS";
  bankName: string;
  accountNumber: string;
};

/** Создать или обновить банковский счёт (под RLS). */
export function upsertBankAccount(osiId: string, input: UpsertBankAccountInput) {
  if (input.id) {
    return forTenant(osiId, (tx) =>
      tx.bankAccount.update({
        where: { id: input.id },
        data: {
          bankName: input.bankName,
          accountNumber: input.accountNumber,
        },
        select: { id: true, type: true, bankName: true, accountNumber: true },
      }),
    );
  }
  return forTenant(osiId, (tx) =>
    tx.bankAccount.create({
      data: {
        osiId,
        buildingId: input.buildingId,
        type: input.type,
        bankName: input.bankName,
        accountNumber: input.accountNumber,
      },
      select: { id: true, type: true, bankName: true, accountNumber: true },
    }),
  );
}

// ── Команда ОСИ (REQ-045, UserOsiRole) ───────────────────────────────────────

/** Список участников команды ОСИ (вне RLS — UserOsiRole identity). */
export function listOsiTeam(osiId: string) {
  return prisma.userOsiRole.findMany({
    where: { osiId },
    include: {
      user: {
        select: { id: true, fullName: true, phone: true, email: true },
      },
    },
    orderBy: { role: "asc" },
  });
}

// ── Профиль пользователя (REQ-046, User identity) ────────────────────────────

export type UpdateProfileInput = {
  fullName?: string;
  email?: string | null;
  language?: string; // 'ru' | 'kk'
};

/** Обновить личные данные и язык пользователя (вне RLS). */
export function updateUserProfile(userId: string, input: UpdateProfileInput) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      fullName: input.fullName,
      email: input.email ?? undefined,
      language: input.language,
    },
    select: { id: true, fullName: true, phone: true, email: true },
  });
}

// ── Настройки уведомлений (REQ-048, NotificationPreference) ──────────────────

export type NotifPrefsInput = {
  announcements?: boolean;
  requestUpdates?: boolean;
  charges?: boolean;
};

/**
 * Получить или создать (upsert) предпочтения уведомлений для пары (user, osi).
 * Под RLS — читается через forTenant.
 */
export function getOrCreateNotifPrefs(osiId: string, userId: string) {
  return forTenant(osiId, async (tx) => {
    const existing = await tx.notificationPreference.findUnique({
      where: { osiId_userId: { osiId, userId } },
    });
    if (existing) return existing;
    return tx.notificationPreference.create({
      data: { osiId, userId, updatedAt: new Date() },
    });
  });
}

/** Обновить предпочтения уведомлений (под RLS). */
export function updateNotifPrefs(osiId: string, userId: string, input: NotifPrefsInput) {
  return forTenant(osiId, (tx) =>
    tx.notificationPreference.upsert({
      where: { osiId_userId: { osiId, userId } },
      create: {
        osiId,
        userId,
        announcements: input.announcements ?? true,
        requestUpdates: input.requestUpdates ?? true,
        charges: input.charges ?? true,
        updatedAt: new Date(),
      },
      update: {
        ...(input.announcements !== undefined && { announcements: input.announcements }),
        ...(input.requestUpdates !== undefined && { requestUpdates: input.requestUpdates }),
        ...(input.charges !== undefined && { charges: input.charges }),
        updatedAt: new Date(),
      },
    }),
  );
}
