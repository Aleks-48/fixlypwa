import { beforeEach, expect, it, vi } from "vitest";
const chairmanContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/context", () => ({ chairmanContext }));
import { GET, POST } from "./route";
import { POST as commit } from "./commit/route";
beforeEach(() => { chairmanContext.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) }); });
it("rejects residents before reading or committing a statement", async () => {
  expect((await GET()).status).toBe(403);
  expect((await POST(new Request("http://localhost/api/bank-import", { method: "POST" }))).status).toBe(403);
  expect((await commit(new Request("http://localhost/api/bank-import/commit", { method: "POST" }))).status).toBe(403);
});
