import { expect, it } from 'vitest';
import { GET } from './route';

it('retires destructive cleanup through GET', async () => {
  const response = await GET();
  expect(response.status).toBe(410);
  expect((await response.json()).error.code).toBe('ENDPOINT_REMOVED');
});
