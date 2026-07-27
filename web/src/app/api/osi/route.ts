import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { getCurrentAuth, setActiveOsi } from "@/lib/auth/session";
import { createOsiForUser } from "@/lib/onboarding/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().min(2, "Название ОСИ слишком короткое"),
  bin: z
    .string()
    .regex(/^\d{12}$/, "БИН — 12 цифр")
    .optional(),
  address: z.string().min(3).optional(),
});

// POST /api/osi — создать ОСИ; создатель становится председателем (Q-051). Новая ОСИ — активная.
export async function POST(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  const osi = await createOsiForUser(auth.user.id, parsed.data);
  await setActiveOsi(auth.session.id, osi.id);

  return ok(
    {
      osi: { id: osi.id, name: osi.name, bin: osi.bin, address: osi.address },
      activeOsiId: osi.id,
    },
    { status: 201 },
  );
}
