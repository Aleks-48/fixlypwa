import "server-only";
import { mkdir, readFile, writeFile, realpath } from "node:fs/promises";
import path from "node:path";
import type { AuthContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { forTenant } from "@/lib/db/tenant";
import { forMaster } from "@/lib/db/master";

export const privateUploadsRoot = () => path.resolve(process.cwd(), "storage", "uploads");
export function safeUploadName(parts: string[]): string | null {
  if (parts.length < 1 || parts.length > 2 || parts.some(p => !/^[\w.-]+$/.test(p) || p.startsWith(".") || p.includes(".."))) return null;
  if (parts.length === 2 && !["docs", "audio"].includes(parts[0] ?? "")) return null;
  return parts.join("/");
}
export async function writePrivateUpload(name: string, bytes: Buffer, ownerUserId?: string) {
  if (!safeUploadName(name.split("/"))) throw new Error("Invalid upload path");
  const file = path.join(privateUploadsRoot(), name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes, { flag: "wx" });
  if (ownerUserId) {
    const metaDir = path.join(privateUploadsRoot(), ".owners");
    await mkdir(metaDir, { recursive: true });
    await writeFile(path.join(metaDir, encodeURIComponent(name) + ".json"), JSON.stringify({ ownerUserId }), { flag: "wx" });
  }
  return `/uploads/${name}`;
}
export async function canReadUpload(auth: AuthContext, url: string): Promise<boolean> {
  if (!url.startsWith("/uploads/")) return false;
  const name = safeUploadName(url.slice(9).split("/"));
  if (!name) return false;
  try {
    const meta = JSON.parse(await readFile(path.join(privateUploadsRoot(), ".owners", encodeURIComponent(name) + ".json"), "utf8"));
    if (meta.ownerUserId === auth.user.id) return true;
  } catch { /* Old files have no owner sidecar; authorize against their parent record. */ }
  const portfolio = await prisma.masterPortfolioItem.findFirst({ where: {
    photoUrls: { has: url }, master: { status: "APPROVED" },
  }, select: { id: true } });
  if (portfolio) return true;
  for (const role of auth.user.roles) {
    const allowed = await forTenant(role.osiId, async tx => {
      const chairman = role.role === "CHAIRMAN" || role.role === "SUPERADMIN";
      const occupant = chairman ? null : await tx.occupant.findUnique({ where: { userId: auth.user.id }, include: { apartment: true } });
      if (chairman || occupant?.apartment) {
        const document = await tx.document.findFirst({ where: {
          fileUrl: url,
          ...(chairman ? {} : { isPublic: true, buildingId: occupant!.apartment!.buildingId }),
        }, select: { id: true } });
        if (document) return true;
        if (await tx.report.findFirst({ where: { fileUrl: url,
          ...(chairman ? {} : { status: "PUBLISHED", buildingId: occupant!.apartment.buildingId }),
        }, select: { id: true } })) return true;
      }
      const request = await tx.request.findFirst({ where: {
        ...(chairman ? {} : { authorUserId: auth.user.id }),
        OR: [{ photoUrls: { has: url } }, { messages: { some: { OR: [{ imageUrl: url }, { audioUrl: url }] } } }],
      }, select: { id: true } });
      if (request) return true;
      if (chairman && await tx.expense.findFirst({ where: { actUrl: url }, select: { id: true } })) return true;
      if (chairman && await tx.bankStatement.findFirst({ where: { sourceFileUrl: url }, select: { id: true } })) return true;
      return false;
    });
    if (allowed) return true;
  }
  const master = await prisma.master.findUnique({ where: { userId: auth.user.id } });
  if (master?.status === "APPROVED") {
    return forMaster(master.id, master.city, async tx => !!await tx.marketListing.findFirst({
      where: { photoUrls: { has: url } }, select: { id: true },
    }));
  }
  return false;
}
export async function readPrivateUpload(name: string): Promise<Buffer | null> {
  for (const root of [privateUploadsRoot(), path.resolve(process.cwd(), "public", "uploads")]) {
    try {
      const base = await realpath(root);
      const file = await realpath(path.join(root, name));
      if (!file.startsWith(base + path.sep)) return null;
      return await readFile(file);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return null;
}
