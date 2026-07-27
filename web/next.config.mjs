import path from "path";
import { fileURLToPath } from "url";
import withPWAInit from "@ducanh2912/next-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PWA (REQ-060..062, NFR-040/041). @ducanh2912/next-pwa — поддерживаемый форк (CLAUDE.md).
// Плагин webpack-based, поэтому production-сборка идёт на webpack (Next 15, без --turbopack),
// а в dev PWA отключён (service worker мешает hot reload). Оффлайн-фолбэк — страница /~offline.
const withPWA = withPWAInit({
  dest: "public",
  // Кастомный воркер (service-worker/index.ts): обработчики push/notificationclick (срез 7).
  customWorkerSrc: "service-worker",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // ВЫКЛЮЧЕНО (2026-07-04): cacheOnFrontendNav/aggressiveFrontEndNavCaching кэшировали
  // RSC-ответы страниц → router.refresh() после мутаций (добавить дом, отметить прочитанным)
  // отдавал устаревшие данные из SW-кэша (pages-rsc). Все страницы кабинета — force-dynamic
  // с персональными данными; кэшировать их навигацию нельзя. Установка PWA, precache статики
  // и офлайн-фолбэк /~offline работают как раньше.
  reloadOnOnline: true,
  fallbacks: {
    document: "/~offline",
  },
  // RSC-запросы (client-навигация/refresh) — МИМО SW-кэша (NetworkOnly, первым в списке —
  // выигрывает у дефолтных pages-rsc/pages-rsc-prefetch). Дефолтный NetworkFirst клонировал
  // стримящийся RSC-ответ (после появления loading.tsx) и подвешивал поток →
  // router.refresh() обрывался (net::ERR_ABORTED), UI не видел свежие данные после мутаций.
  // Кэшировать персональные force-dynamic ответы и не нужно: офлайн закрывает /~offline.
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: ({ sameOrigin, request }) =>
          sameOrigin && request.headers.get("RSC") === "1",
        handler: "NetworkOnly",
      },
      {
        // SSE-поток (срез 24, /api/events) — бесконечный ответ. Дефолтный набор кэширования
        // (extendDefaultRuntimeCaching) заворачивает /api/* в NetworkFirst, который читает
        // ответ целиком для кэша — на потоке без конца это тот же зависающий clone(), что уже
        // ловили на стримящемся RSC (комментарий выше). Держим вне SW-кэша явно.
        urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname === "/api/events",
        handler: "NetworkOnly",
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Задаём папку web как корень проекта, чтобы Next.js не поднимался на уровень выше из-за верхнего package-lock.json
  outputFileTracingRoot: __dirname,

  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,

  // Игнорируем ошибки линтера и типов при сборке
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    tsconfigPath: "tsconfig.build.json",
    ignoreBuildErrors: true,
  },

  allowedDevOrigins: [
    "172.30.0.1",
    "legless-bennie-sheepish.ngrok-free.dev",
    "localhost:3000",
    "127.0.0.1:3000",
  ],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);