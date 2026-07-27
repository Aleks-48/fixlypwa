import { ok, Errors } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { resolveJoinRequest, OnboardingError } from "@/lib/onboarding/joinRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/osi/join-requests/[id]/resolve — отметить заявку обработанной (REQ-153).
// Не привязывает жителя сама — председатель уже сделал это через AddResidentForm (или решил
// вопрос иначе); это просто снимает заявку со списка.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  try {
    await resolveJoinRequest(ctx.osiId, id);
    return ok({ resolved: true });
  } catch (err) {
    if (err instanceof OnboardingError) return Errors.notFound("Заявка");
    throw err;
  }
}
