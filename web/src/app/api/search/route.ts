import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { getShellContext } from "@/lib/auth/shell";
import { globalSearch } from "@/lib/search/service";

export async function GET(req: NextRequest) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const shell = await getShellContext();
  if (!shell) {
    return NextResponse.json([], { status: 200 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  const results = await globalSearch(
    shell.activeOsiId,
    shell.buildings[0]?.id ?? null,
    query,
  );

  return NextResponse.json(results);
}
