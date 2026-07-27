import { z } from "zod";
import { getCurrentAuth } from "@/lib/auth/session";
import { ok, Errors } from "@/lib/http";
import { listMyJoinRequests, submitJoinRequest, OnboardingError } from "@/lib/onboarding/joinRequest";
import { notifyOsiJoinRequest } from "@/lib/notifications/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/osi/join-request — мои активные заявки (REQ-151/154): UI показывает статус вместо
// повторного поиска, если заявка уже отправлена.
export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const requests = await listMyJoinRequests(auth.user.id);
  return ok({ requests });
}

const Body = z.object({
  osiId: z.string().uuid(),
  note: z.string().trim().max(200).optional(),
});

// POST /api/osi/join-request — отправить заявку на подключение (REQ-151). Уведомляет
// председателей (REQ-152); саму привязку к квартире делает председатель (REQ-153).
export async function POST(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  try {
    const { request, created } = await submitJoinRequest(
      auth.user.id,
      parsed.data.osiId,
      parsed.data.note?.trim() || null,
    );
    // Уведомляем только на первую отправку (REQ-152, review 2026-07-22) — повторный POST на
    // ту же ОСИ (пользователь поправил пометку) обновляет заявку молча, без спама председателю.
    if (created) {
      const identifier = auth.user.email ?? auth.user.phone ?? "без контакта";
      await notifyOsiJoinRequest(parsed.data.osiId, {
        id: request.id,
        identifier,
        note: request.note,
      }).catch((err) => {
        console.error("[join-request] уведомление председателю не отправлено:", err);
      });
    }
    return ok({ request }, { status: 201 });
  } catch (err) {
    if (err instanceof OnboardingError) {
      return err.code === "OSI_NOT_FOUND" ? Errors.notFound("ОСИ") : Errors.validation(err.message);
    }
    throw err;
  }
}
