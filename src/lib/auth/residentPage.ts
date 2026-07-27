import "server-only";
import { redirect } from "next/navigation";
import { getCurrentAuth, type AuthContext } from "./session";
import { activeMemberOsi } from "./guards";

// Общий guard страниц кабинета жителя (вкладки таб-бара): вход + членство в активной ОСИ.
export async function requireMember(): Promise<{ auth: AuthContext; osiId: string }> {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");
  const osiId = activeMemberOsi(auth);
  if (!osiId) redirect("/app");
  return { auth, osiId };
}
