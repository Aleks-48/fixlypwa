import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { getMasterByUserId } from "@/lib/master/service";
import { RegisterView } from "./RegisterView";

// ?role=master предвыбирает карточку «Мастер» (ссылка из /master, если анкеты ещё нет).
// Уже одобренного/ожидающего мастера сюда возвращать незачем — сразу в его кабинет.
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const auth = await getCurrentAuth();
  if (auth) {
    const master = await getMasterByUserId(auth.user.id);
    if (master) redirect("/master");
  }

  const { role } = await searchParams;
  const initialRole = role === "master" ? "master" : role === "chairman" ? "chairman" : "resident";

  return <RegisterView initialRole={initialRole} />;
}
