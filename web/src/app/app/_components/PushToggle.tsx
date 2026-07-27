"use client";

import { useEffect, useState } from "react";
import {
  getPushState,
  subscribeToPush,
  unsubscribeFromPush,
  type PushState,
} from "@/lib/pushClient";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Тумблер Web Push в профиле (REQ-102/104). Permission запрашивается ТОЛЬКО по клику
// (жест пользователя). При unsupported (iOS без установки, без VAPID-ключа) — скрывается.
export function PushToggle() {
  const [state, setState] = useState<PushState | "loading">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY) {
      setState("unsupported");
      return;
    }
    getPushState().then(setState).catch(() => setState("unsupported"));
  }, []);

  if (state === "loading" || state === "unsupported") return null;

  if (state === "denied") {
    return (
      <p className="m-0 text-sm text-muted-foreground">
        Push-уведомления заблокированы в настройках браузера.
      </p>
    );
  }

  const on = state === "subscribed";

  async function toggle() {
    setBusy(true);
    try {
      if (on) {
        await unsubscribeFromPush();
        setState("unsubscribed");
      } else {
        const okSub = await subscribeToPush();
        setState(okSub ? "subscribed" : await getPushState());
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2.5">
      <Switch
        id="push-toggle"
        checked={on}
        onCheckedChange={toggle}
        disabled={busy}
        data-testid="push-toggle"
      />
      <Label htmlFor="push-toggle" className="cursor-pointer text-sm font-normal">
        Push-уведомления на это устройство
      </Label>
    </div>
  );
}
