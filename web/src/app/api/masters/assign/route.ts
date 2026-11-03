import { NextRequest, NextResponse } from "next/server";
import { chairmanContext } from "@/lib/auth/context";
import { z } from "zod";
import { Errors } from "@/lib/http";
import { assignMasterToRequest } from "@/lib/masters/reviewService";

// POST /api/masters/assign
// Body: { requestId: string, masterId: string | null }
export async function POST(req: NextRequest) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  const parsed = z.object({
    requestId: z.string().uuid(), masterId: z.string().uuid().nullable(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation("Укажите заявку и мастера");
  const assigned = await assignMasterToRequest(ctx.osiId, parsed.data.requestId, parsed.data.masterId);
  if (!assigned) return Errors.notFound("Заявка или доступный мастер");
  return NextResponse.json({ ok: true });
}
