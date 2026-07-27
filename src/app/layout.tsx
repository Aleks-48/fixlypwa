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

// ОБЯЗАТЕЛЬНО: export default function!
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={cn("font-sans", golos.variable)} suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}