import "server-only";
import { redirect } from "next/navigation";
import { getCurrentAuth, type AuthContext } from "./session";
import { activeChairmanOsi } from "./guards";

// Guard страниц/API председателя: вход + роль CHAIRMAN/SUPERADMIN в активной ОСИ.
export async function requireChairman(): Promise<{ auth: AuthContext; osiId: string }> {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");
  const osiId = activeChairmanOsi(auth);
  if (!osiId) redirect("/app");
  return { auth, osiId };
}
