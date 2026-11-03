import { NextResponse } from "next/server";

// Единый формат ответа/ошибок (api-contracts.md §Соглашения): { data } / { error }.
// Все route handlers обязаны отвечать в этом формате, чтобы фронт/будущий внешний API
// имели один контракт.

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

// IP клиента для rate-limit. Nginx проставляет X-Forwarded-For (docker/nginx/app.conf).
// Берём первый адрес из цепочки. null — если заголовков нет (например, прямой доступ).
export function clientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

// Частые коды ошибок — не «магические строки» по всему коду.
export const Errors = {
  unauthorized: () => fail("UNAUTHORIZED", "Требуется вход", 401),
  forbidden: () => fail("FORBIDDEN", "Недостаточно прав", 403),
  notFound: (what = "Ресурс") => fail("NOT_FOUND", `${what} не найден`, 404),
  validation: (message: string) => fail("VALIDATION", message, 422),
  rateLimited: (message = "Слишком много запросов, попробуйте позже") =>
    fail("RATE_LIMITED", message, 429),
  internal: (p0: string) => fail("INTERNAL", "Внутренняя ошибка", 500),
} as const;
