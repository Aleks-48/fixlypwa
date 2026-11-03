import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Golos_Text } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

const golos = Golos_Text({ subsets: ["cyrillic", "latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ОСИ — управление домом",
  description:
    "PWA для управления ОСИ: объявления, заявки, начисления и отчёты. Кокшетау, Казахстан.",
  applicationName: "ОСИ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ОСИ",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0E1320" },
    { color: "#2E6BF0" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { cookies } from "next/headers";
import type { Language } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

// ОБЯЗАТЕЛЬНО: export default function!
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("fixly_lang")?.value as Language;
  const initialLanguage = (langCookie && ["ru", "kk", "en"].includes(langCookie)) ? langCookie : "ru";

  return (
    <html lang={initialLanguage} className={cn("font-sans", golos.variable)} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <LanguageProvider initialLanguage={initialLanguage}>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}