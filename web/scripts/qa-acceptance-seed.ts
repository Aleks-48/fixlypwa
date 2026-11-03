import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const direct = process.env.DIRECT_URL!;
  if (!direct || !["localhost", "127.0.0.1"].includes(new URL(direct).hostname)) throw new Error("QA fixtures require a local database");
  const db = new PrismaClient({ datasourceUrl: direct });
  const file = "../.local-run/qa-credentials.json";
  let password: string;
  try { if (process.argv.includes("--rotate-password")) throw new Error("rotate"); password = JSON.parse(await readFile(file, "utf8")).password; } catch { password = randomBytes(18).toString("base64url"); }
  try {
    const chair = await db.user.upsert({ where: { email: "qa.chair.20260926@example.test" }, update: { passwordHash: hashPassword(password) },
      create: { email: "qa.chair.20260926@example.test", fullName: "Тестовый председатель", passwordHash: hashPassword(password) } });
    const resident = await db.user.upsert({ where: { email: "qa.resident.20260926@example.test" }, update: {},
      create: { email: "qa.resident.20260926@example.test", phone: "+77700009261", fullName: "Тестовый житель" } });
    const worker = await db.user.upsert({ where: { email: "qa.master.20260926@example.test" }, update: {},
      create: { email: "qa.master.20260926@example.test", phone: "+77700009262", fullName: "Тестовый мастер" } });
    let osi = await db.osi.findFirst({ where: { name: "Fixly — техническая проверка" } });
    osi ??= await db.osi.create({ data: { name: "Fixly — техническая проверка", address: "Кокшетау · тестовые данные" } });
    for (const [userId, role] of [[chair.id, "CHAIRMAN"], [resident.id, "RESIDENT"]] as const) {
      await db.userOsiRole.upsert({ where: { userId_osiId: { userId, osiId: osi.id } }, update: {}, create: { userId, osiId: osi.id, role } });
    }
    let building = await db.building.findFirst({ where: { osiId: osi.id } });
    building ??= await db.building.create({ data: { osiId: osi.id, address: "Тестовый дом, 26", city: "Кокшетау", apartmentsCount: 1 } });
    let apartment = await db.apartment.findFirst({ where: { buildingId: building.id } });
    apartment ??= await db.apartment.create({ data: { osiId: osi.id, buildingId: building.id, number: "1", area: 50 } });
    await db.occupant.upsert({ where: { userId: resident.id }, update: {}, create: { osiId: osi.id, apartmentId: apartment.id, userId: resident.id, fullName: "Тестовый житель", phone: resident.phone } });
    const account = await db.account.upsert({ where: { apartmentId: apartment.id }, update: {}, create: { osiId: osi.id, apartmentId: apartment.id, accountNumber: "QA-2026-1" } });
    const master = await db.master.upsert({ where: { userId: worker.id }, update: {}, create: { userId: worker.id, fullName: "Тестовый мастер", city: "Кокшетау", categories: ["PLUMBING"], status: "APPROVED", bio: "Профиль для технической проверки Fixly" } });
    if (!await db.tariff.count({ where: { buildingId: building.id } })) {
      const tariff = await db.tariff.create({ data: { osiId: osi.id, buildingId: building.id, category: "MAINTENANCE", rateType: "FIXED", rate: 2500, periodFrom: new Date("2026-09-01T00:00:00Z") } });
      await db.charge.create({ data: { osiId: osi.id, accountId: account.id, tariffId: tariff.id, amount: 2500, period: new Date("2026-09-01T00:00:00Z"), dueDate: new Date("2026-09-30T00:00:00Z") } });
    }
    let request = await db.request.findFirst({ where: { osiId: osi.id } });
    request ??= await db.request.create({ data: { osiId: osi.id, buildingId: building.id, authorUserId: resident.id, category: "PLUMBING", text: "Тестовая заявка: проверить кран в подъезде", photoUrls: [] } });
    if (!await db.marketListing.count({ where: { requestId: request.id } })) await db.marketListing.create({ data: { osiId: osi.id, requestId: request.id, city: "Кокшетау", category: "PLUMBING", title: "Тестовая заявка: осмотр крана", description: "Заявка для проверки работы кабинета мастера", buildingLabel: "Тестовый дом, 26", photoUrls: [] } });
    const name = `docs/qa-${randomUUID()}.pdf`;
    await mkdir("storage/uploads/docs", { recursive: true });
    // Minimal valid one-page PDF, only synthetic text.
    const parts = ["%PDF-1.4\n", "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n", "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n", "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] >> endobj\n"];
    let pdf = parts.join(""); const offsets = [parts[0]!.length, parts[0]!.length+parts[1]!.length, parts[0]!.length+parts[1]!.length+parts[2]!.length];
    const xref = pdf.length; pdf += "xref\n0 4\n0000000000 65535 f \n" + offsets.map(n=>String(n).padStart(10,"0")+" 00000 n \n").join("") + `trailer << /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    await writeFile("storage/uploads/"+name, pdf);
    await db.document.create({ data: { osiId: osi.id, buildingId: building.id, authorUserId: chair.id, category: "OTHER", title: "Тестовый документ для проверки доступа", fileUrl: "/uploads/"+name, isPublic: true, fileType: "application/pdf" } });
    await mkdir("../.local-run", { recursive: true });
    await writeFile(file, JSON.stringify({ password, chairEmail: chair.email, residentPhone: resident.phone, masterPhone: worker.phone, osiId: osi.id, buildingId: building.id, requestId: request.id, masterId: master.id, documentUrl: "/uploads/"+name }, null, 2));
    console.log("Synthetic QA accounts and building ready. Credentials saved privately in .local-run.");
  } finally { await db.$disconnect(); }
}
main().catch(error=>{ console.error(error.message); process.exitCode=1; });
