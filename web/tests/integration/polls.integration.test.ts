import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOsiForUser, createBuilding } from "@/lib/onboarding/service";
import { createPoll, listPolls, vote } from "@/lib/polls/service";

// Опросы (Тир 1 lite): один голос на опрос, переголосование заменяет, дедлайн закрывает.
const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const uniq = () => `+7778${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
let osi = "";
let buildingId = "";
let voter = "";

beforeAll(async () => {
  const chair = await admin.user.create({ data: { phone: uniq() } });
  const res = await admin.user.create({ data: { phone: uniq() } });
  voter = res.id;
  osi = (await createOsiForUser(chair.id, { name: `poll-${Date.now()}` })).id;
  buildingId = (await createBuilding(osi, { address: "poll-дом" })).id;
});

afterAll(async () => {
  await admin.poll.deleteMany({ where: { osiId: osi } });
  await admin.building.deleteMany({ where: { osiId: osi } });
  await admin.osi.delete({ where: { id: osi } });
  await admin.user.deleteMany({ where: { phone: { startsWith: "+7778" } } });
  await admin.$disconnect();
});

describe("Быстрые опросы (features.md блок C, lite)", () => {
  it("голос учитывается; повторный голос заменяет прежний (1 голос на опрос)", async () => {
    const poll = await createPoll(osi, {
      buildingId,
      question: "Шлагбаум?",
      options: ["Да", "Нет"],
    });
    const [yes, no] = poll.options;

    expect(await vote(osi, yes!.id, voter)).toBe("ok");
    let view = (await listPolls(osi, buildingId, voter)).find((p) => p.id === poll.id)!;
    expect(view.totalVotes).toBe(1);
    expect(view.myOptionId).toBe(yes!.id);

    // Переголосование: суммарно голосов по-прежнему 1, выбор сменился.
    expect(await vote(osi, no!.id, voter)).toBe("ok");
    view = (await listPolls(osi, buildingId, voter)).find((p) => p.id === poll.id)!;
    expect(view.totalVotes).toBe(1);
    expect(view.myOptionId).toBe(no!.id);
  });

  it("после дедлайна голос отклоняется", async () => {
    const past = await createPoll(osi, {
      buildingId,
      question: "Поздно?",
      options: ["Да", "Нет"],
      deadline: new Date(Date.now() - 1000),
    });
    expect(await vote(osi, past.options[0]!.id, voter)).toBe("closed");
  });
});
