"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.assign("/");
}

// full=true → полноширинная кнопка с текстом (экран профиля); иначе — иконка в шапке.
export function LogoutButton({ full = false }: { full?: boolean }) {
  if (full) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={logout}
        data-testid="logout"
        className="h-11 gap-2 rounded-xl"
      >
        <LogOut aria-hidden size={16} /> Выйти
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={logout}
      data-testid="logout"
      aria-label="Выйти"
      className="size-9 rounded-full"
    >
      <LogOut aria-hidden size={16} />
    </Button>
  );
}
