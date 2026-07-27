import "server-only";
import { redirect } from "next/navigation";
import type { Master } from "@prisma/client";
import { getCurrentAuth, type AuthContext } from "./session";
import { getMasterByUserId } from "@/lib/master/service";

// Guard страниц области мастера (по образцу requireMember): вход обязателен, наличие/статус
// анкеты Master — НЕ проверяется здесь (страница сама решает, что показать: онбординг,
// «на проверке», отказ, ленту заказов) — так же, как chairman-страницы сами ветвят по roleFor.
export async function requireMasterUser(): Promise<{ auth: AuthContext; master: Master | null }> {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/register?role=master");
  const master = await getMasterByUserId(auth.user.id);
  return { auth, master };
}
