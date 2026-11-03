import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ find: vi.fn(), tenant: vi.fn(), chat: vi.fn() }));
vi.mock('@/lib/db/tenant', () => ({ forTenant: mocks.tenant }));
vi.mock('@/lib/assistant/providers', () => ({ getLlmProvider: () => ({ chat: mocks.chat }) }));
vi.mock('./service', () => ({ listDocuments: vi.fn() }));
import { analyzeDocumentWithAi } from './aiAnalysis';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tenant.mockImplementation((_osiId, callback) => callback({ document: { findUnique: mocks.find } }));
});
describe('document AI isolation and truthful failure', () => {
  it('does not call the provider for a document invisible to the tenant', async () => {
    mocks.find.mockResolvedValue(null);
    await expect(analyzeDocumentWithAi('osi-A', 'foreign-document')).rejects.toThrow('Документ не найден');
    expect(mocks.tenant).toHaveBeenCalledWith('osi-A', expect.any(Function));
    expect(mocks.chat).not.toHaveBeenCalled();
  });
  it('does not claim compliance when the model produces invalid JSON', async () => {
    mocks.find.mockResolvedValue({ title: 'Test', category: 'OTHER', createdAt: new Date(), fileUrl: '/uploads/test.pdf', poll: null });
    mocks.chat.mockImplementation(async function* () { yield { type: 'text', text: '{}' }; });
    const result = await analyzeDocumentWithAi('osi-A', 'document');
    expect(result.legalCheck).toBe('Соответствие документа законодательству не установлено.');
    expect(result.recommendations.join(' ')).not.toContain('Опубликовать');
  });
});
