import { maskPhone } from "@/lib/phone";
import { maskEmail } from "@/lib/email";

// Анонимизация на границе «наш сервер → внешний LLM-провайдер» (docs/specs/ai-assistant.md
// §6, ядро Q-061). Два независимых слоя:
//  1. scrubUserInput — регекс-скраббер свободного текста пользователя (телефон/email/ИИН,
//     если он сам их вписал) + safety-net поверх JSON-сериализации tool-результатов.
//  2. PseudonymContext — стабильная в рамках одного диалога замена ФИО на псевдонимы
//     («Житель-1», «Заявитель-2»); tools.ts вызывает pseudonymize() на КОНКРЕТНЫХ известных
//     полях с именами (структурно, не сканированием текста — сканирование ФИО в свободном
//     тексте ненадёжно без NER).
//
// ИИН и подобные реквизиты (Owner.iin) в MVP-tools вообще не выбираются из БД (см. tools.ts) —
// это первый и главный барьер; regex ниже — только safety net на случай, если пользователь сам
// впишет 12-значную последовательность в вопрос.

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// Казахстанский формат (+7/8, далее 10 цифр, опционально с пробелами/дефисами/скобками).
// (?<!\d)/(?!\d) — границы: без них 11-значный префикс матчился бы и внутри более длинной
// 12-значной последовательности (ИИН), откусывая от неё кусок раньше, чем сработает IIN_RE.
const PHONE_RE = /(?<!\d)(?:\+7|8)[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}(?!\d)/g;
// Голая 12-значная последовательность вне телефонного формата — похоже на ИИН/БИН.
const IIN_RE = /(?<!\d)\d{12}(?!\d)/g;

export function scrubUserInput(text: string): string {
  return (
    text
      .replace(EMAIL_RE, (m) => maskEmail(m))
      // ИИН — ДО телефона: 12-значная последовательность иначе частично совпадает с 11-значным
      // телефонным паттерном (см. комментарий у PHONE_RE).
      .replace(IIN_RE, "[ИИН скрыт]")
      .replace(PHONE_RE, (m) => maskPhone(m))
  );
}

// Safety net перед отправкой результата tool-вызова модели: сам объект должен УЖЕ не содержать
// прямых идентификаторов (tools.ts их просто не выбирает из БД), это второй барьер на случай
// ошибки в конкретном tool.
export function scrubToolResultText(text: string): string {
  return scrubUserInput(text);
}

const KIND_PREFIX = { resident: "Житель", requester: "Заявитель" } as const;
export type PseudonymKind = keyof typeof KIND_PREFIX;

// Стабильная в рамках ОДНОГО диалога замена реальных ФИО на псевдонимы. Восстанавливается из
// AssistantConversation.pseudonymMap (real name -> pseudonym) на каждый новый ход диалога, чтобы
// повторное упоминание того же жителя получало тот же псевдоним (и не плодило дубликаты в
// счётчике) — важно и для смысла ответа, и для байт-идентичности префикса (кэш провайдера).
export class PseudonymContext {
  private nameToPseudonym: Map<string, string>;
  private counters: Record<PseudonymKind, number>;

  constructor(stored?: Record<string, string>) {
    this.nameToPseudonym = new Map(Object.entries(stored ?? {}));
    this.counters = { resident: 0, requester: 0 };
    // Досчитываем счётчики из уже сохранённых псевдонимов, чтобы не выдать дубликат номера
    // (например «Житель-1» дважды) при продолжении диалога.
    for (const pseudonym of this.nameToPseudonym.values()) {
      for (const kind of Object.keys(KIND_PREFIX) as PseudonymKind[]) {
        const m = pseudonym.match(new RegExp(`^${KIND_PREFIX[kind]}-(\\d+)$`));
        if (m) this.counters[kind] = Math.max(this.counters[kind], Number(m[1]));
      }
    }
  }

  pseudonymize(realName: string, kind: PseudonymKind = "resident"): string {
    const existing = this.nameToPseudonym.get(realName);
    if (existing) return existing;
    this.counters[kind] += 1;
    const pseudonym = `${KIND_PREFIX[kind]}-${this.counters[kind]}`;
    this.nameToPseudonym.set(realName, pseudonym);
    return pseudonym;
  }

  /** Для сохранения в AssistantConversation.pseudonymMap (real name → псевдоним). */
  toStoredMap(): Record<string, string> {
    return Object.fromEntries(this.nameToPseudonym);
  }

  /** Для де-подстановки ответа модели при рендере клиенту (псевдоним → real name). */
  toRenderMap(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [real, pseudonym] of this.nameToPseudonym) out[pseudonym] = real;
    return out;
  }
}

// Обратная замена псевдонимов на настоящие имена для отображения пользователю (§6.1: «пользователь
// видит настоящие имена, провайдер — нет»). Дольше строк — не проблема, вызывается один раз на
// сообщение при рендере, не в горячем пути модели.
export function depseudonymizeText(text: string, pseudonymToReal: Record<string, string>): string {
  let out = text;
  for (const [pseudonym, real] of Object.entries(pseudonymToReal)) {
    out = out.split(pseudonym).join(real);
  }
  return out;
}
