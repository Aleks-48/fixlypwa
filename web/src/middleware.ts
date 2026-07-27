import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// CORS для dev-тестирования Flutter WEB-сборки (срез 21): нативному приложению CORS не нужен
// (нет браузера и same-origin policy), но `flutter run -d web-server` живёт на другом origin
// (localhost:5959), и браузер без этих заголовков блокирует все запросы к /api/**.
// Включается ТОЛЬКО явным CORS_DEV_ORIGINS (список origin через запятую). В проде переменная
// не задана → middleware прозрачен, ни одного заголовка не добавляется.
// process.env напрямую (не src/lib/env.ts): middleware работает в edge-runtime, тянуть туда
// zod-валидацию всего окружения незачем.

function allowedOrigins(): Set<string> {
  return new Set(
    (process.env.CORS_DEV_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin || !allowedOrigins().has(origin)) return NextResponse.next();

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(corsHeaders(origin))) res.headers.set(k, v);
  return res;
}

export const config = { matcher: "/api/:path*" };
