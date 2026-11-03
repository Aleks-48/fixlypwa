// ACCEPT-002: Next copies loaded .env files even when tracing excludes them.
// Windows tracing can also retain runtime uploads. Sanitize only build copies.
import fs from "node:fs";
import path from "node:path";

const project = process.cwd();
const dist = path.resolve(project, process.env.NEXT_DIST_DIR || ".next");
if (path.dirname(dist) !== project || !path.basename(dist).startsWith(".next")) {
  throw new Error("Build directory must be a .next* child of the web project");
}
const root = path.join(dist, "standalone");
if (!fs.existsSync(root)) throw new Error("Standalone build is missing");
// Next 15's Windows trace can omit runtime modules required by its own adapter.
// Keep the installed framework runtime complete; this contains package code only.
if (process.platform === "win32") {
  fs.cpSync(
    path.join(project, "node_modules/next/dist"),
    path.join(root, "node_modules/next/dist"),
    { recursive: true },
  );
}
const targets = [
  "storage",
  "public/uploads",
  ...fs
    .readdirSync(root)
    .filter((name) => name.startsWith(".env") || /^technical-.*\.(log|json)$/.test(name)),
];
for (const relative of targets) {
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep)) throw new Error("Unsafe build copy path");
  fs.rmSync(target, { recursive: true, force: true });
  if (fs.existsSync(target)) throw new Error("Build copy cleanup failed");
}
console.log("Standalone sanitized: environment secrets and runtime uploads excluded.");
