import { getCurrentAuth } from "@/lib/auth/session";
import { ok, Errors } from "@/lib/http";
import { cancelJoinRequest, OnboardingError } from "@/lib/onboarding/joinRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/osi/join-request/[id] — отозвать свою заявку (передумал/ошибся ОСИ, REQ-151).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const { id } = await params;
  try {
    await cancelJoinRequest(auth.user.id, id);
    return ok({ cancelled: true });
  } catch (err) {
    if (err instanceof OnboardingError) return Errors.notFound("Заявка");
    throw err;
  }
}
