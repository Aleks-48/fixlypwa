import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseApartmentRegistry } from "./apartmentImport";

// Парсер реестра помещений (REQ-012 ревизия, excel-import.md §1) — формат реальной выгрузки:
// несколько строк заголовка ОСИ перед шапкой таблицы, шапка ищется ПО НАЗВАНИЯМ колонок,
// не по фиксированной позиции. Фикстуры строим тем же exceljs (writer), не читаем реальный
// файл — образцы Рахима с ПДн в репозиторий не кладутся (excel-import.md).
async function buildRegistryBuffer(rows: (string | number | null)[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Помещенияквартиры");
  for (const row of rows) sheet.addRow(row);
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

const HEADER = [
  "Номер",
  "Собственник",
  "Владелец",
  "ИИН",
  "Телефон",
  "Тип",
  "ЛС ОСИ",
  "ЛС ЕРЦ",
  "Этаж",
  "Площадь",
  "Полезная площадь",
  "Проживает",
  "Зарегистрировано",
];

describe("parseApartmentRegistry (REQ-012 ревизия)", () => {
  it("находит шапку среди строк-заголовков ОСИ и разбирает данные по названиям колонок", async () => {
    const buffer = await buildRegistryBuffer([
      ['"ОСИ "ЦЕНТРАЛЬНЫЙ 2 Б""'],
      ["Адрес: г. Кокшетау"],
      ["Помещения/квартиры"],
      HEADER,
      ["1", "Герасимова ", "Собственник", "720929450231", "+7 707 913 02 01", "Жилое", "43527", "", "1", "65.8", "65.8", "0", "0"],
      ["2", "ЮЛИЯ МАРЧЕНКО", "Собственник", "790902400210", "+7 701 538 46 98", "Жилое", "43526", "", "1", "50.3", "50.3", "0", "0"],
    ]);

    const { rows, skippedRowCount } = await parseApartmentRegistry(buffer);

    expect(skippedRowCount).toBe(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      number: "1",
      ownerName: "Герасимова", // хвостовой пробел обрезан
      iin: "720929450231",
      phone: "+7 707 913 02 01",
      type: "RESIDENTIAL",
      accountNumber: "43527",
      area: 65.8,
    });
    expect(rows[1]!.ownerName).toBe("ЮЛИЯ МАРЧЕНКО");
  });

  it("терпит пустые ИИН/телефон/тип — не ошибка, просто null", async () => {
    const buffer = await buildRegistryBuffer([
      HEADER,
      ["3", "Прфатило Михаил Федорович", "Собственник", "", "", "", "43524", "", "1", "66.8", "66.8", "0", "0"],
    ]);

    const { rows } = await parseApartmentRegistry(buffer);

    expect(rows).toHaveLength(1);
    expect(rows[0]!.iin).toBeNull();
    expect(rows[0]!.phone).toBeNull();
    expect(rows[0]!.type).toBeNull();
  });

  it("строки без «Номер» пропускаются (итоговые/пустые строки), не попадают в rows", async () => {
    const buffer = await buildRegistryBuffer([
      HEADER,
      ["5", "Сарсенбаев", "Арендатор", "", "", "Жилое", "43523", "", "2", "66.4", "66.4", "0", "0"],
      [null, "Общее количество платежей: 1"],
      ["", ""],
    ]);

    const { rows, skippedRowCount } = await parseApartmentRegistry(buffer);

    expect(rows).toHaveLength(1);
    expect(skippedRowCount).toBe(2);
  });

  it("распознаёт парковку/кладовку по тексту типа", async () => {
    const buffer = await buildRegistryBuffer([
      HEADER,
      ["P1", "Иванов", "Собственник", "", "", "Парковочное место", "1", "", "", "", "", "0", "0"],
      ["S1", "Петров", "Собственник", "", "", "Кладовка", "2", "", "", "", "", "0", "0"],
      ["N1", "Сидоров", "Собственник", "", "", "Офис", "3", "", "", "", "", "0", "0"],
    ]);

    const { rows } = await parseApartmentRegistry(buffer);

    expect(rows.find((r) => r.number === "P1")?.type).toBe("PARKING");
    expect(rows.find((r) => r.number === "S1")?.type).toBe("STORAGE");
    expect(rows.find((r) => r.number === "N1")?.type).toBe("NON_RESIDENTIAL");
  });

  it("бросает понятную ошибку, если шапка не распознана", async () => {
    const buffer = await buildRegistryBuffer([
      ["Совсем другой", "формат", "файла"],
      ["a", "b", "c"],
    ]);

    await expect(parseApartmentRegistry(buffer)).rejects.toThrow(/шапк/i);
  });
});
