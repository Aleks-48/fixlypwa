import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { updateUserProfile, type UpdateProfileInput } from "@/lib/settings/service";

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
      // language field will exist after migration
      language: (user as Record<string, unknown>).language ?? "ru",
    },
  });
}

// PATCH /api/profile  — обновление ФИО, email, языка (REQ-046, REQ-047)
export async function PATCH(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as UpdateProfileInput;

  // Валидация языка
  if (body.language && !["ru", "kk"].includes(body.language)) {
    return NextResponse.json({ error: "Invalid language. Use 'ru' or 'kk'." }, { status: 400 });
  }

  const updated = await updateUserProfile(auth.user.id, body);
  return NextResponse.json({ user: updated });
}
