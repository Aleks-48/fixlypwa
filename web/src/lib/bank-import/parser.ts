import { parseStatementDate } from "./date";
import ExcelJS from 'exceljs';
import { Readable } from 'node:stream';

export interface ParsedBankTransaction {
  bankRef: string;
  date: Date;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  counterpartyName: string;
  counterpartyIinBin?: string;
  purpose: string;
  detectedApartmentNumber?: string;
}

/**
 * Извлекает номер квартиры из назначения платежа
 * Примеры: "кв 45", "кв.45", "квартира 120", "кв-12"
 */
export function extractApartmentNumber(purpose: string): string | undefined {
  if (!purpose) return undefined;
  
  // Регулярное выражение для поиска номера квартиры
  const match = purpose.match(/(?:кв|кв\.|квартира|кв-ра)\s*[\#№]?\s*(\d+)/i);
  return match ? match[1] : undefined;
}

/**
 * Парсинг выписок в формате TXT (1C:Предприятие / Выгрузка для банков)
 */
export function parse1CTxt(content: string): ParsedBankTransaction[] {
  const lines = content.split(/\r?\n/);
  const transactions: ParsedBankTransaction[] = [];
  let currentTx: Partial<ParsedBankTransaction> = {};
  let isSectionDocument = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'СекцияДокумент=Платежное поручение' || trimmed === 'СекцияДокумент=Банковская выписка') {
      isSectionDocument = true;
      currentTx = {};
      continue;
    }

    if (trimmed === 'КонецДокумента' && isSectionDocument) {
      if (currentTx.bankRef && currentTx.amount && currentTx.date) {
        currentTx.detectedApartmentNumber = extractApartmentNumber(currentTx.purpose || '');
        transactions.push(currentTx as ParsedBankTransaction);
      }
      isSectionDocument = false;
      continue;
    }

    if (!isSectionDocument) continue;

    const [key, ...valParts] = trimmed.split('=');
    const value = valParts.join('=').trim();

    switch (key) {
      case 'Номер':
      case 'НомерДокумента':
        currentTx.bankRef = value;
        break;
      case 'Дата':
        // Формат 1С: ДД.ММ.ГГГГ
        currentTx.date = parseStatementDate(value);
        break;
      case 'Сумма':
        currentTx.amount = parseFloat(value.replace(',', '.'));
        break;
      case 'НазначениеПлатежа':
        currentTx.purpose = value;
        break;
      case 'Плательщик':
        currentTx.counterpartyName = value;
        currentTx.type = 'INCOME'; // По умолчанию входящий
        break;
      case 'ПлательщикИИН':
      case 'ПлательщикИНН':
        currentTx.counterpartyIinBin = value;
        break;
      case 'Получатель':
        // Если получатель указан, проверяем расход/доход
        break;
    }
  }

  return transactions;
}

/**
 * Универсальный парсер файлов (XLSX, CSV, TXT)
 */
export async function parseBankStatement(fileBuffer: Buffer, fileName: string): Promise<ParsedBankTransaction[]> {
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'txt') {
    const textContent = fileBuffer.toString('utf-8'); // или windows-1251 для старых 1С
    return parse1CTxt(textContent);
  }

  if (ext === 'xls') throw new Error('Сохраните старый файл .xls в формате .xlsx или CSV и загрузите повторно.');
  if (ext === 'xlsx' || ext === 'csv') {
    if (fileBuffer.length > 15 * 1024 * 1024) throw new Error('Максимальный размер выписки — 15 МБ');
    const workbook = new ExcelJS.Workbook();
    if (ext === 'csv') {
      const firstLine = fileBuffer.toString('utf8').split(/\r?\n/, 1)[0] ?? '';
      const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
      await workbook.csv.read(Readable.from([fileBuffer]), { parserOptions: { delimiter, trim: true }, map: value => value });
    } else {
      await workbook.xlsx.load(new Uint8Array(fileBuffer) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    }
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error('Файл не содержит листов');
    if (worksheet.rowCount > 50000) throw new Error('В выписке больше 50 000 строк');
    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell, number) => { headers[number] = cell.text.replace(/^\uFEFF/, '').trim(); });
    const rawRows: Record<string, unknown>[] = [];
    worksheet.eachRow((row, number) => {
      if (number === 1) return;
      const result: Record<string, unknown> = Object.create(null);
      for (let column = 1; column < headers.length; column++) {
        const key = headers[column];
        if (!key) continue;
        const cell = row.getCell(column);
        result[key] = cell.value instanceof Date || typeof cell.value === "number" ? cell.value : cell.text;
      }
      rawRows.push(result);
    });
    const transactions: ParsedBankTransaction[] = [];

    // Эвристический парсинг строк Excel
    for (const row of rawRows) {
      const keys = Object.keys(row);
      
      const k0 = keys[0];
      const k1 = keys[1];
      const k2 = keys[2];
      const k3 = keys[3];

      // Поиск нужных колонок по ключевым словам с безопасным доступом
      const bankRef = row['№ документа'] || row['Номер'] || row['ID'] || row['Reference'] || String((k0 ? row[k0] : '') || '');
      const dateVal = row['Дата'] || row['Дата операции'] || (k1 ? row[k1] : undefined);
      const amountVal = row['Сумма'] || row['Сумма операции'] || (k2 ? row[k2] : undefined);
      const purpose = row['Назначение'] || row['Назначение платежа'] || row['Детали'] || String((k3 ? row[k3] : '') || '');
      const counterparty = row['Отправитель'] || row['Плательщик'] || row['Контрагент'] || '';
      const iin = row['ИИН/БИН'] || row['ИИН'] || row['БИН'] || '';

      if (!amountVal || isNaN(parseFloat(String(amountVal).replace(',', '.')))) {
        continue; // Пропускаем шапки и служебные строки
      }

      const amount = Math.abs(parseFloat(String(amountVal).replace(',', '.')));
      const type = parseFloat(String(amountVal)) < 0 ? 'EXPENSE' : 'INCOME';

      transactions.push({
        bankRef: String(bankRef).trim(),
        date: parseStatementDate(dateVal),
        amount,
        type,
        counterpartyName: String(counterparty).trim(),
        counterpartyIinBin: String(iin).trim() || undefined,
        purpose: String(purpose).trim(),
        detectedApartmentNumber: extractApartmentNumber(String(purpose)),
      });
    }

    return transactions;
  }

  throw new Error(`Неподдерживаемый формат файла: .${ext}`);
}
