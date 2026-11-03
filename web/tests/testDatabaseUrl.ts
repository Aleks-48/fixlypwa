export function withTestDbName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const url = new URL(value);
  if (!['postgresql:', 'postgres:'].includes(url.protocol)) {
    throw new Error('Test database must use PostgreSQL');
  }
  const name = url.pathname.slice(1);
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw new Error('Invalid database name');
  url.pathname = `/${name.endsWith('_test') ? name : `${name}_test`}`;
  return url.toString();
}

export function assertTestDatabaseUrls(databaseUrl?: string, directUrl?: string): string {
  if (!databaseUrl || !directUrl) throw new Error('Test database URLs are required');
  const database = new URL(databaseUrl);
  const direct = new URL(directUrl);
  const name = direct.pathname.slice(1);
  if (!/^[a-zA-Z0-9_-]+_test$/.test(name) || database.pathname !== direct.pathname) {
    throw new Error('Both database URLs must point to the same isolated *_test database');
  }
  return name;
}
