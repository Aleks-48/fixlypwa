import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const webEnv = fileURLToPath(new URL('../.env', import.meta.url));
const appEnv = fileURLToPath(new URL('../../app/.env', import.meta.url));
function readEnv(path) { return dotenv.parse(readFileSync(path, 'utf8')); }
function setValues(path, values) {
  let text = existsSync(path) ? readFileSync(path, 'utf8') : '';
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${JSON.stringify(value)}`;
    const pattern = new RegExp(`^${key}=.*$`, 'gm');
    text = pattern.test(text) ? text.replace(pattern, () => line) : `${text.trimEnd()}\n${line}\n`;
  }
  writeFileSync(path, text);
}
async function telegram(env, method, body) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`Telegram ${method} failed (HTTP ${response.status}).`);
  return result.result;
}
try {
  const env = readEnv(webEnv);
  if (env.FIXLY_TESTER_ENV === '1') throw new Error('Use START_TESTER.bat for the isolated tester environment.');
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) throw new Error('Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in web/.env.');
  const action = process.argv[2];
  if (action === 'preflight') {
    if (!env.DATABASE_URL || !env.DIRECT_URL) throw new Error('Set DATABASE_URL and DIRECT_URL in web/.env.');
    for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
      const url = new URL(env[key]);
      if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.port !== '5544' || decodeURIComponent(url.pathname.slice(1)) !== env.POSTGRES_DB) {
        throw new Error(`${key} must point to local PostgreSQL on port 5544 and POSTGRES_DB.`);
      }
    }
    console.log('Local configuration found.');
  } else {
    const url = new URL(process.argv[3]);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Expected an HTTPS tunnel origin.');
    const publicUrl = url.origin;
    if (action === 'configure') {
      setValues(webEnv, { NEXT_PUBLIC_APP_URL: publicUrl, PHONE_OTP_CHANNEL: 'telegram', TELEGRAM_PROVIDER: 'bot' });
      if (!existsSync(appEnv)) writeFileSync(appEnv, readFileSync(new URL('../../app/.env.example', import.meta.url)));
      setValues(appEnv, { API_BASE_URL: publicUrl });
      console.log('Website and Flutter source configuration URLs updated. Installed APKs keep their compiled URL.');
    } else if (action === 'webhook') {
      const endpoint = `${publicUrl}/api/telegram/webhook`;
      const health = await fetch(`${publicUrl}/api/health`, { headers: { 'ngrok-skip-browser-warning': '1' }, signal: AbortSignal.timeout(45000) });
      const data = await health.json();
      if (!health.ok || data.data?.db !== 'up') throw new Error('Public website/database is not ready.');
      await telegram(env, 'setWebhook', { url: endpoint, secret_token: env.TELEGRAM_WEBHOOK_SECRET });
      const info = await telegram(env, 'getWebhookInfo', {});
      if (info.url !== endpoint) throw new Error('Telegram webhook URL did not match.');
      console.log(`Telegram webhook configured; pending updates: ${info.pending_update_count}.`);
    } else throw new Error('Unknown launcher action.');
  }
} catch (error) {
  // Transport errors may contain the bot URL/token; never print raw error objects.
  const message = error instanceof Error && !/https?:|fetch|JSON|Unexpected|ENOTFOUND|ECONN/i.test(error.message)
    ? error.message : 'Launcher configuration/network step failed. Check local configuration and connectivity.';
  console.error(message);
  process.exitCode = 1;
}
