import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import dotenv from "dotenv";

const dist = path.resolve(process.env.NEXT_DIST_DIR || ".next-buildcheck");
const root = path.join(dist, "standalone");
if (
  fs.existsSync(path.join(root, "storage")) ||
  fs.readdirSync(root).some((name) => name.startsWith(".env"))
) {
  throw new Error("Private build copies remain");
}
fs.cpSync(path.join(dist, "static"), path.join(root, path.basename(dist), "static"), {
  recursive: true,
});
const publicRoot = path.resolve("public");
fs.cpSync(publicRoot, path.join(root, "public"), {
  recursive: true,
  filter: (source) => {
    const relative = path.relative(publicRoot, source);
    return relative !== "uploads" && !relative.startsWith("uploads" + path.sep);
  },
});
const privateEnv = dotenv.parse(fs.readFileSync(".env"));
const log = fs.openSync("technical-production-smoke.log", "w");
const child = spawn(process.execPath, [path.join(root, "server.js")], {
  cwd: root,
  windowsHide: true,
  stdio: ["ignore", log, log],
  env: {
    ...process.env,
    ...privateEnv,
    NODE_ENV: "production",
    PORT: "3101",
    HOSTNAME: "127.0.0.1",
  },
});
try {
  let healthy = false;
  for (let i = 0; i < 45; i++) {
    if (child.exitCode !== null) throw new Error("Production server exited");
    try {
      const response = await fetch("http://127.0.0.1:3101/api/health", {
        signal: AbortSignal.timeout(4000),
      });
      healthy = response.ok && (await response.json()).data?.db === "up";
      if (healthy) break;
    } catch {
      /* Allow cold start. */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!healthy) throw new Error("Production database health failed");
  const login = await fetch("http://127.0.0.1:3101/login");
  if (!login.ok) throw new Error("Production login page failed");
  const html = await login.text();
  const asset = html.match(/src="([^" ]*\/_next\/static\/[^" ]+\.js)"/);
  if (!asset) throw new Error("Production login script missing");
  if (!(await fetch(new URL(asset[1], "http://127.0.0.1:3101"))).ok)
    throw new Error("Production asset failed");
  console.log(
    "Production smoke passed: database health, login page, JavaScript asset, no bundled local secrets/uploads.",
  );
} finally {
  child.kill();
  fs.closeSync(log);
}
