import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const envPath = ".env";
if (existsSync(envPath) && !/^FIXLY_TESTER_ENV=1$/m.test(readFileSync(envPath, "utf8"))) {
  throw new Error("An existing .env belongs to another environment. Extract the archive into a new folder; setup will not overwrite it.");
}
if (!existsSync(envPath)) {
  const existingVolume = spawnSync("docker", ["volume", "inspect", "fixly-tester_tester_pgdata"], { stdio: "ignore" });
  if (existingVolume.status === 0) {
    throw new Error("A tester database already exists. Use the original extracted folder with its .env; a new password cannot open the existing volume.");
  }
  const admin = randomBytes(24).toString("hex");
  const app = randomBytes(24).toString("hex");
  const superadmin = randomBytes(24).toString("hex");
  writeFileSync(envPath, [
    "FIXLY_TESTER_ENV=1", "POSTGRES_DB=fixly_tester", "POSTGRES_USER=postgres",
    `POSTGRES_PASSWORD=${admin}`, `APP_DB_PASSWORD=${app}`, `APP_SUPERADMIN_PASSWORD=${superadmin}`,
    `DATABASE_URL=postgresql://app_login:${app}@127.0.0.1:5545/fixly_tester?schema=public`,
    `DIRECT_URL=postgresql://postgres:${admin}@127.0.0.1:5545/fixly_tester?schema=public`,
    "SMS_PROVIDER=console", "EMAIL_PROVIDER=console", "PHONE_OTP_CHANNEL=sms", "TELEGRAM_PROVIDER=console",
    "LLM_PROVIDER=console", "OTP_DEV_ECHO=1", "SEED_RESIDENT_PHONE=", "SEED_RESIDENT_TG_CHAT=", "",
  ].join("\n"), { flag: "wx" });
}
function run(command, args) {
  console.log(`> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, CHECKPOINT_DISABLE: "1" } });
  if (result.error || result.status !== 0) throw new Error(`${command} failed; fix the error above and rerun setup.`);
}
run("docker", ["compose", "-p", "fixly-tester", "-f", "docker-compose.tester.yml", "up", "-d", "--wait", "postgres"]);
run("npm", ["ci"]);
// Explicitly override inherited connection settings before any database command.
const { parse } = await import("dotenv");
Object.assign(process.env, parse(readFileSync(envPath)));
if (!process.env.DIRECT_URL?.includes("@127.0.0.1:5545/fixly_tester?") ||
    !process.env.DATABASE_URL?.includes("@127.0.0.1:5545/fixly_tester?")) {
  throw new Error("Tester connections must use the isolated database on port 5545.");
}
run("npm", ["run", "prisma:generate"]);
run("npm", ["run", "prisma:deploy"]);
run("npm", ["run", "db:bootstrap"]);
run("npx", ["tsx", "scripts/check-schema.ts"]);
run("npm", ["run", "seed"]);
console.log("Ready. Run npm run dev -- --hostname 127.0.0.1 and open http://localhost:3000. See ../TESTING.md.");
