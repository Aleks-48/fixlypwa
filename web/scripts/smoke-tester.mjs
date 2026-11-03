import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const base = new URL(process.argv[2] ?? "http://127.0.0.1:3000");
if (!["127.0.0.1", "localhost"].includes(base.hostname) || !/^FIXLY_TESTER_ENV=1$/m.test(readFileSync(".env", "utf8"))) {
  throw new Error("Run only against the local synthetic tester environment.");
}
async function read(path, options = {}) {
  const response = await fetch(new URL(path, base), { ...options, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}
await read("/api/health");
const denied = await fetch(new URL("/api/bank-import", base));
if (denied.status !== 401) throw new Error("Unauthenticated bank import was not rejected");
const login = await read("/api/auth/login", {
  method: "POST", headers: { "Content-Type": "application/json", "X-Client": "mobile" },
  body: JSON.stringify({ email: "demo@osi.kz", password: "demo12345" }),
});
const headers = { Authorization: `Bearer ${login.data.token}`, "X-Client": "mobile" };
try {
  const buildings = await read("/api/buildings", { headers });
  const building = buildings.data.buildings[0];
  if (!building) throw new Error("Demo building missing");
  const form = new FormData();
  form.append("buildingId", building.id);
  form.append("file", new Blob([readFileSync("tests/fixtures/bank-import-demo.csv")]), "demo.csv");
  const preview = await read("/api/bank-import", { method: "POST", headers, body: form });
  if (!preview.items.some((item) => item.matchedAccountId)) throw new Error("Demo income did not match");
  const commit = () => read("/api/bank-import/commit", {
    method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ items: preview.items }),
  });
  const first = await commit(), second = await commit();
  if (second.paymentsCreated !== 0 || second.skippedDuplicates < 1) throw new Error("Duplicate protection failed");
  console.log(JSON.stringify({ login: "passed", previewRows: preview.items.length, first, second }, null, 2));
} finally {
  await read("/api/auth/logout", { method: "POST", headers });
}
