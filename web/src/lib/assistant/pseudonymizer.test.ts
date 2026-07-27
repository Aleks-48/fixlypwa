import { describe, it, expect } from "vitest";
import { scrubUserInput, PseudonymContext, depseudonymizeText } from "./pseudonymizer";

// Главный риск-модуль AI-ассистента (docs/specs/ai-assistant.md §6, ядро Q-061) — единственный
// барьер между «текст с ПДн» и «текст, уходящий во внешний LLM API». Таблица кейсов по спеке:
// ФИО/телефоны/ИИН/смешанный текст.

describe("scrubUserInput — скраббер входа пользователя", () => {
  it("маскирует казахстанский номер телефона (+7)", () => {
    const out = scrubUserInput("мой номер +77011234567, перезвоните");
    expect(out).not.toContain("77011234567");
    expect(out).toContain("***");
  });

  it("маскирует номер телефона в формате 8XXX", () => {
    const out = scrubUserInput("звоните на 8 701 123 45 67 после обеда");
    expect(out).not.toContain("701 123 45 67");
  });

  it("маскирует email", () => {
    const out = scrubUserInput("напишите на ivan.petrov@example.kz по вопросу");
    expect(out).not.toContain("ivan.petrov@example.kz");
    expect(out).toContain("@example.kz");
  });

  it("маскирует голую 12-значную последовательность (похоже на ИИН)", () => {
    const out = scrubUserInput("мой ИИН 850101300123 для справки");
    expect(out).not.toContain("850101300123");
    expect(out).toContain("[ИИН скрыт]");
  });

  it("смешанный текст: маскирует все типы одновременно, остальной текст не трогает", () => {
    const out = scrubUserInput(
      "Здравствуйте! Меня зовут Иван, телефон +77011234567, email ivan@test.kz, ИИН 850101300123. " +
        "Вопрос про начисление за июль на 5000 тенге.",
    );
    expect(out).not.toContain("77011234567");
    expect(out).not.toContain("ivan@test.kz");
    expect(out).not.toContain("850101300123");
    // Обычные числа (сумма, месяц) не должны пострадать — false positive был бы хуже, чем
    // пропущенный редкий кейс, для смысла ответа модели.
    expect(out).toContain("5000 тенге");
    expect(out).toContain("Иван");
  });

  it("не трогает обычный текст без ПДн (нет ложных срабатываний на суммах/датах)", () => {
    const text = "Долг по квартире 5 — 25000 тенге за июль 2026, площадь 48.5 м2";
    expect(scrubUserInput(text)).toBe(text);
  });
});

describe("PseudonymContext — стабильные псевдонимы ФИО в рамках диалога", () => {
  it("одно и то же имя всегда получает один и тот же псевдоним", () => {
    const ctx = new PseudonymContext();
    const first = ctx.pseudonymize("Иван Жилец", "resident");
    const second = ctx.pseudonymize("Иван Жилец", "resident");
    expect(first).toBe(second);
    expect(first).toBe("Житель-1");
  });

  it("разные имена получают разные последовательные номера", () => {
    const ctx = new PseudonymContext();
    expect(ctx.pseudonymize("Иван Жилец")).toBe("Житель-1");
    expect(ctx.pseudonymize("Петр Соседов")).toBe("Житель-2");
    expect(ctx.pseudonymize("Иван Жилец")).toBe("Житель-1"); // повторное упоминание — тот же
  });

  it("счётчики отдельные для 'resident' и 'requester'", () => {
    const ctx = new PseudonymContext();
    expect(ctx.pseudonymize("Иван Жилец", "resident")).toBe("Житель-1");
    expect(ctx.pseudonymize("Петр Заявитель", "requester")).toBe("Заявитель-1");
  });

  it("восстанавливается из сохранённого словаря без коллизий номеров", () => {
    const stored = { "Иван Жилец": "Житель-1", "Петр Соседов": "Житель-2" };
    const ctx = new PseudonymContext(stored);
    // Новое имя должно продолжить нумерацию с 3, не начать заново с 1 (иначе коллизия с уже
    // отправленным ранее в модель "Житель-1").
    expect(ctx.pseudonymize("Новый Житель")).toBe("Житель-3");
    // Уже известное имя возвращает сохранённый псевдоним, не создаёт новый.
    expect(ctx.pseudonymize("Иван Жилец")).toBe("Житель-1");
  });

  it("toStoredMap/toRenderMap — согласованные прямой и обратный словари", () => {
    const ctx = new PseudonymContext();
    ctx.pseudonymize("Иван Жилец");
    ctx.pseudonymize("Петр Соседов");
    expect(ctx.toStoredMap()).toEqual({ "Иван Жилец": "Житель-1", "Петр Соседов": "Житель-2" });
    expect(ctx.toRenderMap()).toEqual({ "Житель-1": "Иван Жилец", "Житель-2": "Петр Соседов" });
  });
});

describe("depseudonymizeText — обратная замена при рендере пользователю", () => {
  it("заменяет псевдонимы на настоящие имена", () => {
    const rendered = depseudonymizeText("У Житель-1 долг больше, чем у Житель-2.", {
      "Житель-1": "Иван Жилец",
      "Житель-2": "Петр Соседов",
    });
    expect(rendered).toBe("У Иван Жилец долг больше, чем у Петр Соседов.");
  });

  it("текст без псевдонимов не меняется", () => {
    const text = "У всех жителей задолженность отсутствует.";
    expect(depseudonymizeText(text, { "Житель-1": "Иван Жилец" })).toBe(text);
  });
});
