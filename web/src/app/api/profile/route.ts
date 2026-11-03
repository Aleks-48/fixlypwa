import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { updateUserProfile } from "@/lib/settings/service";
import { z } from "zod";

// GET /api/profile  — профиль текущего пользователя (REQ-046)
export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user } = auth;
  return NextResponse.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      language: user.language,
    },
  });
}

// PATCH /api/profile  — обновление ФИО, email, языка (REQ-046, REQ-047)
export async function PATCH(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = z.object({
    fullName: z.string().trim().max(200).optional(),
    name: z.string().trim().max(200).optional(),
    email: z.string().trim().email().nullable().optional(),
    language: z.enum(["ru", "kk", "en"]).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные профиля" }, { status: 400 });
  const body = parsed.data;

  // Валидация языка
  if (body.language && !["ru", "kk", "en"].includes(body.language)) {
    return NextResponse.json({ error: "Invalid language. Use 'ru', 'kk', or 'en'." }, { status: 400 });
  }

  const updated = await updateUserProfile(auth.user.id, body);
  return NextResponse.json({ user: updated });
}
