import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi } from "@/lib/auth/guards";
import {
  getOsiProfile,
  updateOsiProfile,
  listBankAccounts,
  upsertBankAccount,
  listOsiTeam,
  type UpdateOsiInput,
} from "@/lib/settings/service";

// GET /api/settings/osi  — реквизиты ОСИ, банковские счета и команда (REQ-045)
export async function GET(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const osiId = activeChairmanOsi(auth);
  if (!osiId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // buildingId — необязательный query param (для банковских счетов)
  const { searchParams } = new URL(req.url);
  const buildingId = searchParams.get("buildingId");

  const [osi, team, bankAccounts] = await Promise.all([
    getOsiProfile(osiId),
    listOsiTeam(osiId),
    buildingId ? listBankAccounts(osiId, buildingId) : Promise.resolve([]),
  ]);

  return NextResponse.json({
    osi,
    bankAccounts,
    team: team.map((r) => ({
      userId: r.userId,
      role: r.role,
      fullName: r.user.fullName,
      phone: r.user.phone,
      email: r.user.email,
    })),
  });
}

// PATCH /api/settings/osi  — обновление реквизитов ОСИ (REQ-045)
export async function PATCH(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const osiId = activeChairmanOsi(auth);
  if (!osiId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as UpdateOsiInput & {
    chairmanFullName?: string;
    // банковский счёт опционально
    bankAccount?: {
      id?: string;
      buildingId?: string;
      type?: "CURRENT" | "SAVINGS";
      bankName?: string;
      accountNumber?: string;
    };
  };

  const [osi, bankAccount] = await Promise.all([
    updateOsiProfile(osiId, {
      name: body.name,
      bin: body.bin,
      address: body.address,
      registeredAt: body.registeredAt,
      chairmanFullName: body.chairmanFullName,
      userId: auth.user.id,
    }),
    body.bankAccount?.buildingId && body.bankAccount?.bankName && body.bankAccount?.accountNumber
      ? upsertBankAccount(osiId, {
          id: body.bankAccount.id,
          buildingId: body.bankAccount.buildingId,
          type: body.bankAccount.type ?? "CURRENT",
          bankName: body.bankAccount.bankName,
          accountNumber: body.bankAccount.accountNumber,
        })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({ osi, bankAccount });
}
