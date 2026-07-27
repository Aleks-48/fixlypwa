// Smart Bridge (sb.egov.kz) — интеграционная платформа госсервисов РК. НЕ публичный API:
// доступ по договору (регистрация на sb.egov.kz, подключение от ~500 тыс. ₸, сервис-ключи,
// планируется mTLS — проверено 2026-07-02). Здесь — контракт слоя: интерфейс + честная
// заглушка NOT_CONFIGURED. Реальная реализация подключается после договора без изменения
// вызывающего кода (gov-integrations.md, ADR-0007).

export type OwnershipCheck =
  | { status: "verified"; share?: number }
  | { status: "not_owner" }
  | { status: "not_configured" };

export type LegalEntity = { bin: string; name: string; status: string } | null;

export interface SmartBridgeClient {
  /** Верификация собственности по регистру недвижимости (по согласию пользователя). */
  verifyPropertyOwnership(iin: string, cadastreNumber: string): Promise<OwnershipCheck>;
  /** Данные юрлица по БИН (ГБД ЮЛ) — для проверки контрагентов расходов. */
  getLegalEntity(bin: string): Promise<LegalEntity>;
}

class NotConfiguredSmartBridge implements SmartBridgeClient {
  async verifyPropertyOwnership(): Promise<OwnershipCheck> {
    return { status: "not_configured" };
  }
  async getLegalEntity(): Promise<LegalEntity> {
    return null;
  }
}

export function smartBridgeConfigured(): boolean {
  return Boolean(process.env.SMARTBRIDGE_SERVICE_KEY);
}

// Фабрика: пока договора нет — заглушка. После договора здесь появится реальный клиент
// (сервис-ключ + mTLS), интерфейс не меняется.
export function getSmartBridge(): SmartBridgeClient {
  return new NotConfiguredSmartBridge();
}
