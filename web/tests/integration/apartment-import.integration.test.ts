import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOsiForUser, createBuilding, importApartments } from "@/lib/onboarding/service";
import { forTenant } from "@/lib/db/tenant";

// Импорт реестра помещений (REQ-012 ревизия, excel-import.md): создание Apartment+Owner+
// Account одним действием, идемпотентно при повторном импорте того же реестра.
const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const TAG = `aptimp-${Date.now()}`;
const uniq = () => `+7785${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

let osi = "";
let buildingId = "";

beforeAll(async () => {
  const chair = await admin.user.create({ data: { phone: uniq() } });
  osi = (await createOsiForUser(chair.id, { name: `${TAG}-osi` })).id;
  buildingId = (await createBuilding(osi, { address: `${TAG}-дом` })).id;
});

afterAll(async () => {
  await admin.owner.deleteMany({ where: { osiId: osi } });
  await admin.account.deleteMany({ where: { osiId: osi } });
  await admin.apartment.deleteMany({ where: { osiId: osi } });
  await admin.building.deleteMany({ where: { osiId: osi } });
  await admin.osi.delete({ where: { id: osi } });
  await admin.user.deleteMany({ where: { phone: { startsWith: "+7785" } } });
  await admin.$disconnect();
});

describe("importApartments (REQ-012 ревизия)", () => {
  it("создаёт Apartment+Owner+Account из строк реестра; строка без ФИО — без Owner", async () => {
    const summary = await importApartments(osi, buildingId, [
      {
        number: "1",
        ownerName: "Герасимова Анна",
        iin: "720929450231",
        phone: "+7 707 913 02 01",
        type: "RESIDENTIAL",
        accountNumber: "43527",
        area: 65.8,
      },
      {
        number: "2",
        ownerName: null,
        iin: null,
        phone: null,
        type: null,
        accountNumber: null,
        area: 50.3,
      },
    ]);

    expect(summary).toMatchObject({
      apartmentsCreated: 2,
      apartmentsUpdated: 0,
      ownersCreated: 1,
      ownersUpdated: 0,
      ownersSkipped: 1,
    });

    const apt1 = await forTenant(osi, (tx) =>
      tx.apartment.findFirstOrThrow({
        where: { buildingId, number: "1" },
        include: { account: true, owners: true },
      }),
    );
    expect(apt1.type).toBe("RESIDENTIAL");
    expect(Number(apt1.area)).toBeCloseTo(65.8);
    expect(apt1.account?.accountNumber).toBe("43527"); // реальный ЛС из файла, не сгенерированный
    expect(apt1.owners).toHaveLength(1);
    expect(apt1.owners[0]?.iin).toBe("720929450231");

    // Кв.2 без ФИО собственника — Account всё равно создан, с fallback-номером.
    const apt2 = await forTenant(osi, (tx) =>
      tx.apartment.findFirstOrThrow({
        where: { buildingId, number: "2" },
        include: { account: true, owners: true },
      }),
    );
    expect(apt2.owners).toHaveLength(0);
    expect(apt2.account?.accountNumber).toBe("A-2");
  });

  it("повторный импорт того же реестра ИДЕМПОТЕНТЕН — обновляет, не дублирует", async () => {
    const summary = await importApartments(osi, buildingId, [
      {
        number: "1",
        ownerName: "Герасимова Анна",
        iin: "720929450231",
        phone: "+7 707 913 02 02", // телефон обновился в новой выгрузке
        type: "RESIDENTIAL",
        accountNumber: "43527",
        area: 65.8,
      },
    ]);

    expect(summary).toMatchObject({
      apartmentsCreated: 0,
      apartmentsUpdated: 1,
      ownersCreated: 0,
      ownersUpdated: 1,
    });

    // Ровно ОДНА квартира с номером "1" и ОДИН владелец — повтор не создал дублей.
    const apartments = await forTenant(osi, (tx) =>
      tx.apartment.findMany({ where: { buildingId, number: "1" } }),
    );
    expect(apartments).toHaveLength(1);

    const owners = await forTenant(osi, (tx) =>
      tx.owner.findMany({ where: { apartmentId: apartments[0]!.id } }),
    );
    expect(owners).toHaveLength(1);
    expect(owners[0]?.phone).toBe("+7 707 913 02 02"); // обновился

    // Account НЕ пересоздан и accountNumber не изменился повторным импортом.
    const account = await forTenant(osi, (tx) =>
      tx.account.findUniqueOrThrow({ where: { apartmentId: apartments[0]!.id } }),
    );
    expect(account.accountNumber).toBe("43527");
  });

  it("несуществующий дом — понятная ошибка (как createApartment)", async () => {
    await expect(
      importApartments(osi, "00000000-0000-0000-0000-000000000000", [
        {
          number: "9",
          ownerName: "Кто-то",
          iin: null,
          phone: null,
          type: null,
          accountNumber: null,
          area: null,
        },
      ]),
    ).rejects.toThrow(/не найден/i);
  });
});
