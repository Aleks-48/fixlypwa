import { ok } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { listOsiJoinRequests } from "@/lib/onboarding/joinRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/osi/join-requests — активные заявки на подключение к своей ОСИ (REQ-153).
export async function GET() {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const requests = await listOsiJoinRequests(ctx.osiId);
  return ok({ requests });
}
