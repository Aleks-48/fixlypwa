import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), completion: vi.fn(), env: { GROQ_API_KEY: 'test', LLM_PROVIDER: 'groq' } }));
vi.mock('@/lib/auth/session', () => ({ getCurrentAuth: mocks.auth }));
vi.mock('@/lib/env', () => ({ env: mocks.env }));
vi.mock('groq-sdk', () => ({ default: class { chat = { completions: { create: mocks.completion } }; } }));
import { POST } from './route';

const request = (body: unknown) => new Request('http://localhost/api/ai/scan-defect', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: { id: 'user' } }); mocks.env.LLM_PROVIDER = 'groq'; });
describe('defect scanner failure handling', () => {
  it('requires authentication', async () => { mocks.auth.mockResolvedValue(null); expect((await POST(request({ hintText: 'test' }))).status).toBe(401); });
  it('requires actual input', async () => { expect((await POST(request({}))).status).toBe(422); expect(mocks.completion).not.toHaveBeenCalled(); });
  it('does not fabricate a diagnosis for console mode', async () => { mocks.env.LLM_PROVIDER = 'console'; expect((await POST(request({ hintText: 'test' }))).status).toBe(503); expect(mocks.completion).not.toHaveBeenCalled(); });
  it('returns an error for a failed provider', async () => { mocks.completion.mockRejectedValue(new Error('unavailable')); const res = await POST(request({ hintText: 'test' })); expect(res.status).toBe(502); expect(await res.json()).not.toHaveProperty('data.confidence'); });
  it('rejects an invalid model result', async () => { mocks.completion.mockResolvedValue({ choices: [{ message: { content: '{}' } }] }); expect((await POST(request({ hintText: 'test' }))).status).toBe(502); });
});
