import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

async function main() {
  const direct = new URL(process.env.DIRECT_URL!);
  if (!["localhost", "127.0.0.1"].includes(direct.hostname)) throw new Error("Local database required");
  const database = decodeURIComponent(direct.pathname.slice(1));
  const restoreDatabase = "fixly_restore_test_" + Date.now();
  const container = execFileSync("docker", ["compose", "ps", "-q", "postgres"], { encoding: "utf8" }).trim();
  if (!container) throw new Error("Database container not found");
  const adminUrl = new URL(direct); adminUrl.pathname = "/postgres";
  const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
  const original = new PrismaClient({ datasourceUrl: direct.toString() });
  const restoredUrl = new URL(direct); restoredUrl.pathname = "/" + restoreDatabase;
  const restored = new PrismaClient({ datasourceUrl: restoredUrl.toString() });
  let created = false;
  const counts = async (db: PrismaClient) => ({ users: await db.user.count(), buildings: await db.building.count(), apartments: await db.apartment.count(), charges: await db.charge.count(), payments: await db.payment.count(), documents: await db.document.count() });
  try {
    await mkdir("../.local-backups", { recursive: true });
    const before = await counts(original);
    execFileSync("docker", ["exec", container, "pg_dump", "-U", direct.username, "-d", database, "-Fc", "-f", "/tmp/fixly-restore-check.dump"]);
    const backup = "../.local-backups/fixly-verified-" + Date.now() + ".dump";
    execFileSync("docker", ["cp", container+":/tmp/fixly-restore-check.dump", backup]);
    await admin.$executeRawUnsafe('CREATE DATABASE "'+restoreDatabase+'"'); created = true;
    execFileSync("docker", ["exec", container, "pg_restore", "--exit-on-error", "-U", direct.username, "-d", restoreDatabase, "/tmp/fixly-restore-check.dump"]);
    const after = await counts(restored);
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Backup counts differ; pause writes and retry");
    await mkdir("../artifacts/qa-2026-09-26", { recursive: true });
    await writeFile("../artifacts/qa-2026-09-26/backup-verification.json", JSON.stringify({ verifiedAt: new Date().toISOString(), backup, counts: after, restoredIntoSeparateDatabase: true }, null, 2));
    console.log("Backup restored into a separate database; all six table counts match.");
  } finally {
    await restored.$disconnect(); await original.$disconnect();
    if (created && /^fixly_restore_test_\d+$/.test(restoreDatabase)) await admin.$executeRawUnsafe('DROP DATABASE "'+restoreDatabase+'"');
    await admin.$disconnect();
  }
}
main().catch(error=>{ console.error(error.message); process.exitCode=1; });
