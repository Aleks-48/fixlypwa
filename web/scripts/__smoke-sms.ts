// ВРЕМЕННЫЙ смоук Д3 (удаляется после прогона): реальная отправка SMS через src/lib/sms.ts
// (Mobizon, общая подпись). Env задаётся при запуске, .env не трогаем.
import { sendSms } from "../src/lib/sms";
import { normalizeKzPhone } from "../src/lib/phone";

async function main() {
  const phone = normalizeKzPhone("87713730882");
  if (!phone) throw new Error("номер не нормализовался");
  console.log("отправка на", phone);
  const started = Date.now();
  await sendSms(phone, "Код для входа в ОСИ: 123456. Действует 5 мин. (смоук Д3)");
  console.log(`sent ok in ${Date.now() - started}ms`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("SEND FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
