import { env } from "@/lib/env";
import { parseIdentifier, type Identifier } from "@/lib/identifier";

// TEST-OTP-002: only explicitly designated fake accounts can echo outside loopback.
export function isTestOtpPhone(identifier: Identifier): boolean {
  if (env.NODE_ENV === "production" || env.OTP_DEV_ECHO !== "1" || identifier.kind !== "phone") return false;
  const until = Date.parse(env.OTP_TEST_ECHO_UNTIL);
  if (!Number.isFinite(until) || until <= Date.now()) return false;
  return env.OTP_TEST_PHONES.split(",").some(raw => {
    const phone = parseIdentifier(raw);
    return phone?.kind === "phone" && phone.value === identifier.value;
  });
}

export function allowTestOtpEcho(req: Request, identifier: Identifier): boolean {
  if (!isTestOtpPhone(identifier)) return false;
  if (allowDevOtpEcho(req)) return true;
  try {
    const expected = new URL(env.NEXT_PUBLIC_APP_URL ?? "");
    if (expected.protocol !== "https:") return false;
    if (req.headers.get("host") !== expected.host) return false;
    const origin = req.headers.get("origin");
    return !origin || origin === expected.origin;
  } catch { return false; }
}

function loopbackHost(value: string): boolean {
  try {
    const url = new URL(`http://${value}`);
    return !url.username && !url.password && url.pathname === "/" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

// TECH-015: ngrok preserves the external Host and appends the remote IP to XFF.
// Reject external hosts and every non-loopback proxy hop, even if earlier hops are local.
export function allowDevOtpEcho(req: Request): boolean {
  if (env.OTP_DEV_ECHO !== "1" || env.NODE_ENV === "production") return false;
  if (!loopbackHost(new URL(req.url).host) || !loopbackHost(req.headers.get("host") ?? "")) return false;
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      // Next may normalize req.url to localhost while the browser uses 127.0.0.1.
      const originUrl = new URL(origin);
      if (!["http:", "https:"].includes(originUrl.protocol) ||
          originUrl.host !== req.headers.get("host")) return false;
    } catch { return false; }
  }
  if (req.headers.has("forwarded")) return false;
  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedHost && !forwardedHost.split(",").every(host => loopbackHost(host.trim()))) return false;
  for (const header of ["x-forwarded-for", "x-real-ip"]) {
    const value = req.headers.get(header);
    if (value && !value.split(",").every(ip => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip.trim()))) return false;
  }
  return true;
}
