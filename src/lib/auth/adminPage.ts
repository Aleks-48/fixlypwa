import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentAuth, type AuthContext } from "./session";

// Guard страниц админки платформы (ADR-0008, REQ-110). Не вошедший → /login; вошедший
// не-суперадмин → 404 (существование /admin не подтверждаем — в отличие от API, где 403).
// Гейт — ТОЛЬКО по identity-флагу User.isSuperadmin (назначается CLI make-superadmin),
// НЕ по Role.SUPERADMIN из UserOsiRole (та — точечный саппорт-доступ к одной ОСИ).
export async function requireSuperadminPage(): Promise<AuthContext> {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");
  if (!auth.user.isSuperadmin) notFound();
  return auth;
}
