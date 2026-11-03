import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { forTenant } from '@/lib/db/tenant';
import { assignMasterToRequest, addMasterReview } from '@/lib/masters/reviewService';
import { updateUserProfile } from '@/lib/settings/service';

const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
let osiA = '', osiB = '', userId = '', buildingId = '', documentId = '', requestId = '', masterId = '';

beforeAll(async () => {
  const user = await admin.user.create({ data: { email: `stabilization-${Date.now()}@example.test` } });
  userId = user.id;
  osiA = (await admin.osi.create({ data: { name: 'stabilization-A' } })).id;
  osiB = (await admin.osi.create({ data: { name: 'stabilization-B' } })).id;
  buildingId = (await admin.building.create({ data: { osiId: osiA, address: 'Test building', city: 'Кокшетау' } })).id;
  masterId = (await admin.master.create({ data: { userId, fullName: 'Test master', city: 'Кокшетау', categories: ['PLUMBING'], status: 'APPROVED' } })).id;
  requestId = (await admin.request.create({ data: { osiId: osiA, buildingId, authorUserId: userId, category: 'PLUMBING', text: 'Test request', photoUrls: [], status: 'RESOLVED' } })).id;
  documentId = (await admin.document.create({ data: { osiId: osiA, buildingId, authorUserId: userId, category: 'OTHER', title: 'Test document', fileUrl: '/uploads/test.pdf' } })).id;
  await admin.documentRead.create({ data: { osiId: osiA, documentId, userId } });
  await admin.notificationPreference.create({ data: { osiId: osiA, userId } });
  await admin.iKomekComplaint.create({ data: { osiId: osiA, buildingId, authorUserId: userId, category: 'OTHER', description: 'Test' } });
});

afterAll(async () => {
  if (masterId) await admin.masterReview.deleteMany({ where: { masterId } });
  if (osiA) {
    await admin.documentRead.deleteMany({ where: { osiId: osiA } });
    await admin.notificationPreference.deleteMany({ where: { osiId: osiA } });
    await admin.iKomekComplaint.deleteMany({ where: { osiId: osiA } });
    await admin.document.deleteMany({ where: { osiId: osiA } });
    await admin.request.deleteMany({ where: { osiId: osiA } });
    await admin.building.deleteMany({ where: { osiId: osiA } });
  }
  if (masterId) await admin.master.delete({ where: { id: masterId } });
  await admin.osi.deleteMany({ where: { id: { in: [osiA, osiB].filter(Boolean) } } });
  if (userId) await admin.user.delete({ where: { id: userId } });
  await admin.$disconnect();
});

describe('technical stabilization: tenant isolation and profile persistence', () => {
  it('new tenant tables deny reads without context', async () => {
    expect(await prisma.documentRead.findMany({ where: { documentId } })).toHaveLength(0);
    expect(await prisma.notificationPreference.findMany({ where: { userId } })).toHaveLength(0);
    expect(await prisma.iKomekComplaint.findMany({ where: { buildingId } })).toHaveLength(0);
  });
  it('separates own and foreign tenant rows', async () => {
    for (const [osiId, count] of [[osiA, 1], [osiB, 0]] as const) {
      const rows = await forTenant(osiId, async (tx) => [
        await tx.documentRead.count({ where: { documentId } }),
        await tx.notificationPreference.count({ where: { userId } }),
        await tx.iKomekComplaint.count({ where: { buildingId } }),
      ]);
      expect(rows).toEqual([count, count, count]);
    }
  });
  it('rejects a write labelled with a different tenant', async () => {
    await expect(forTenant(osiB, (tx) => tx.notificationPreference.create({ data: { osiId: osiA, userId } }))).rejects.toThrow();
  });
  it('cannot assign a master to a foreign request, but can assign to its own', async () => {
    expect(await assignMasterToRequest(osiB, requestId, masterId)).toBe(false);
    expect(await assignMasterToRequest(osiA, requestId, masterId)).toBe(true);
  });
  it('rejects foreign reviews and concurrent duplicate reviews', async () => {
    const input = { osiId: osiA, masterId, authorUserId: userId, requestId, rating: 5 };
    await expect(addMasterReview({ ...input, osiId: osiB })).rejects.toThrow();
    const results = await Promise.allSettled([addMasterReview(input), addMasterReview(input)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const master = await admin.master.findUniqueOrThrow({ where: { id: masterId } });
    expect(master.reviewsCount).toBe(1);
    expect(master.rating).toBe(5);
  });
  it('persists the name and language of an email-only account', async () => {
    await updateUserProfile(userId, { fullName: 'Updated name', language: 'kk' });
    const user = await admin.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.fullName).toBe('Updated name');
    expect(user.language).toBe('kk');
    expect(user.phone).toBeNull();
  });
});
