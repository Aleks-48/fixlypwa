"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// Переключатель светлой/тёмной темы (класс .dark через next-themes). До монтирования
// рендерим нейтральную иконку, чтобы избежать рассинхрона гидратации.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Светлая тема" : "Тёмная тема"}
      data-testid="theme-toggle"
      className="size-9 rounded-full"
    >
      {isDark ? <Sun aria-hidden size={16} /> : <Moon aria-hidden size={16} />}
    </Button>
  );
}
