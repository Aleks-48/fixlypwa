"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Тема через класс .dark (next-themes) — так работают И CSS-токены (.dark в globals.css),
// И Tailwind dark:-утилиты shadcn. По умолчанию следуем системе, пользователь может переключить.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
