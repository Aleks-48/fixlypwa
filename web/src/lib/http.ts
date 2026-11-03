import { NextResponse } from "next/server";

// Format for responses/errors: { data } / { error }
// All route handlers must respond in this format.

export type ApiError = {
  code: string;
  message: string;
};

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

export function fail(
  code: string,
  message: string,
  status = 400,
): NextResponse {
  return NextResponse.json({ error: { code, message } satisfies ApiError }, {
    status,
  });
}

// IP address of the client for rate-limit. Nginx sets X-Forwarded-For.
export function clientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

// Standard error responses
export const Errors = {
  unauthorized: () => fail("UNAUTHORIZED", "Unauthorized", 401),
  forbidden: (msg = "Access denied") => fail("FORBIDDEN", msg, 403),
  notFound: (what = "Resource") => fail("NOT_FOUND", `${what} not found`, 404),
  validation: (message: string) => fail("VALIDATION", message, 422),
  rateLimited: (message = "Too many requests, please try again later") =>
    fail("RATE_LIMITED", message, 429),
  internal: () => fail("INTERNAL", "Internal server error", 500),
} as const;