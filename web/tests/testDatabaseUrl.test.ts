import { describe, expect, it } from 'vitest';
import { assertTestDatabaseUrls, withTestDbName } from './testDatabaseUrl';

describe('integration database isolation', () => {
  it.each(['fixlypwa', 'another_database', 'already_test'])('isolates %s and preserves connection parameters', (name) => {
    const result = new URL(withTestDbName(`postgresql://user:pass@localhost:5544/${name}?schema=public`) ?? '');
    expect(result.pathname).toBe(`/${name.endsWith('_test') ? name : `${name}_test`}`);
    expect(result.searchParams.get('schema')).toBe('public');
  });
  it('rejects missing URLs and a production database before setup', () => {
    expect(() => assertTestDatabaseUrls()).toThrow();
    expect(() => assertTestDatabaseUrls('postgresql://localhost/main', 'postgresql://localhost/main')).toThrow();
  });
  it('rejects mismatched databases', () => {
    expect(() => assertTestDatabaseUrls('postgresql://localhost/a_test', 'postgresql://localhost/b_test')).toThrow();
  });
  it('accepts direct and pooled connections to the same test database', () => {
    expect(assertTestDatabaseUrls('postgresql://localhost:6432/fixly_test', 'postgresql://localhost:5544/fixly_test')).toBe('fixly_test');
  });
});
