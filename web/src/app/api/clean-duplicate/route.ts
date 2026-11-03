import { fail } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TECH-002: cleanup must never mutate data through an HTTP GET.
export async function GET() {
  return fail("ENDPOINT_REMOVED", "Служебная очистка через HTTP отключена", 410);
}
