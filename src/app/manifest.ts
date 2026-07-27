import type { MetadataRoute } from "next";

// PWA-манифест (REQ-060). Next отдаёт его по /manifest.webmanifest.
// Иконки-заглушки (SVG) — детально прорабатываются на срезе 5 (PWA-полиш, Lighthouse ≥90).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ОСИ — управление домом",
    short_name: "ОСИ",
    description:
      "Объявления, заявки и отчёты ОСИ. Меньше нагрузки на председателя, прозрачно для жителей.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F6FA",
    theme_color: "#2E6BF0",
    lang: "ru",
    dir: "ltr",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
