import { randomUUID, createHmac } from "node:crypto";
import { z } from "zod";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeMemberOsi } from "@/lib/auth/guards";
import { Errors, ok, fail } from "@/lib/http";
import { prisma } from "@/lib/db/prisma";
import { sendFcmToUsers } from "@/lib/notifications/fcm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Transient signaling for the single Fixly application instance. Media is peer-to-peer.
type Call = { id: string; from: string; to: string; name: string; offer: string;
  answer?: string; expires: number; lastCaller: number; lastCallee: number };
const memory = globalThis as typeof globalThis & { fixlyVideo?: Map<string, Call>; fixlyDialTimes?: Map<string, number> };
const calls = memory.fixlyVideo ??= new Map();
const dialTimes = memory.fixlyDialTimes ??= new Map();
function prune(now: number) {
  for (const c of calls.values()) if (c.expires < now ||
      (c.answer && Math.min(c.lastCaller, c.lastCallee) < now - 90000)) calls.delete(c.id);
  for (const [user, at] of dialTimes) if (at < now - 15000) dialTimes.delete(user);
}
function own(user: string) {
  return Array.from(calls.values()).find(c => c.from === user || c.to === user);
}
function ice(user: string) {
  const urls = process.env.FIXLY_TURN_URL;
  const secret = process.env.FIXLY_TURN_SECRET;
  if (!urls || !secret) return [];
  const username = Math.floor(Date.now()/1000 + 7200) + ":" + user;
  return [{ urls, username, credential: createHmac("sha1", secret).update(username).digest("base64") }];
}
export async function GET(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();
  const now = Date.now(), user = auth.user.id;
  prune(now);
  if (new URL(req.url).searchParams.has("ice")) return ok({ iceServers: ice(user) });
  const c = own(user);
  if (!c) return ok({ call: null });
  const incoming = c.to === user;
  if (incoming) c.lastCallee = now; else c.lastCaller = now;
  return ok({call: { id: c.id, incoming, name: c.name, answered: Boolean(c.answer),
    offer: incoming ? c.offer : undefined, answer: incoming ? undefined : c.answer }});
}
const sdp = z.string().startsWith("v=0").max(64000);
const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("dial"), masterId: z.string().uuid(), offer: sdp }),
  z.object({ action: z.literal("answer"), id: z.string().uuid(), answer: sdp }),
  z.object({ action: z.literal("end"), id: z.string().uuid() }),
]);
export async function POST(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation("Некорректные параметры звонка");
  const b = parsed.data, user = auth.user.id;
  prune(Date.now());
  if (b.action === "dial") {
    if (!activeMemberOsi(auth)) return Errors.forbidden();
    const master = await prisma.master.findFirst({where:{id:b.masterId,status:"APPROVED"},select:{userId:true}});
    if (!master || master.userId === user) return Errors.notFound("Мастер");
    const now = Date.now();
    if (own(user) || own(master.userId)) return fail("BUSY","Участник уже занят",409);
    if (dialTimes.has(user) || calls.size >= 1000) return fail("BUSY","Повторите звонок позже",429);
    const id = randomUUID();
    calls.set(id,{id,from:user,to:master.userId,name:auth.user.fullName || "Пользователь Fixly",offer:b.offer,
      expires:now+75000,lastCaller:now,lastCallee:now});
    dialTimes.set(user,now);
    await sendFcmToUsers([master.userId],{type:"VIDEO_CALL",notificationId:id}).catch(() => {});
    return ok({id});
  }
  const c = calls.get(b.id);
  if (!c || (user !== c.from && user !== c.to)) return Errors.notFound("Звонок");
  if (b.action === "end") { calls.delete(c.id); return ok({ended:true}); }
  if (user !== c.to) return Errors.forbidden();
  if (c.answer && c.answer !== b.answer) return fail("ANSWERED","На звонок уже ответили",409);
  c.answer = b.answer; c.lastCallee = Date.now(); c.expires = Date.now()+7200000;
  return ok({answered:true});
}
