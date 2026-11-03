'use client';

import { CheckCircle2,FileSpreadsheet,RefreshCw,Upload } from 'lucide-react';
import React,{ useEffect,useState } from 'react';

interface BankImportItem {
  bankRef: string;
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  counterpartyName: string;
  purpose: string;
  status: 'MATCHED' | 'NEED_ATTENTION' | 'DUPLICATE' | 'EXPENSE';
  matchedApartmentNumber?: string;
  matchedAccountId?: string;
  isDuplicate: boolean;
}

export default function BankImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<BankImportItem[]>([]);
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<{ id: string; address: string }[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    let active = true;
    fetch('/api/buildings').then(async (response) => {
      if (!response.ok) throw new Error('Импорт доступен председателю ОСИ');
      const result = await response.json();
      if (active) setBuildings(result.data?.buildings ?? []);
    }).catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить дома'); });
    return () => { active = false; };
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !buildingId) return;

    setLoading(true);
    setCommitSuccess(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('buildingId', buildingId);

    try {
      const res = await fetch('/api/bank-import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Ошибка распознавания');

      setItems(data.items || []);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка загрузки файла');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bank-import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Ошибка проведения');

      setCommitSuccess(
        `Проведено: ${data.paymentsCreated} платежей, ${data.expensesCreated} расходов. Дубликатов: ${data.skippedDuplicates}. Не проведено (нужен ручной ввод): ${data.skippedUnmatched}`
      );
      setItems(items.filter((item) => !item.matchedAccountId && !item.isDuplicate));
      setFile(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка проведения выписки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
          <FileSpreadsheet className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Импорт банковской выписки</h1>
          <p className="text-sm text-muted-foreground">
            Предпросмотр выписки и сопоставление платежей. Проверьте каждую строку перед сохранением.
          </p>
        </div>
      </div>

      {/* Форма загрузки */}
      <form onSubmit={handleUpload} className="p-6 bg-card border rounded-2xl shadow-sm space-y-4">
        {loadError && <p role="alert">{loadError}</p>}
        <label className="block text-sm font-medium">Дом
          <select required value={buildingId} onChange={(event) => { setBuildingId(event.target.value); setItems([]); setCommitSuccess(null); }} className="block w-full border rounded-xl p-2 mt-2">
            <option value="">Выберите дом</option>
            {buildings.map((building) => <option key={building.id} value={building.id}>{building.address}</option>)}
          </select>
        </label>
        <p className="text-sm text-muted-foreground">Несопоставленные поступления и расходы внесите вручную в разделе финансов. Они не будут проведены автоматически.</p>
        <div>
          <label className="block text-sm font-medium mb-2">
            Загрузите выписку (.xlsx, .csv, .txt 1С)
          </label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
          />
        </div>

        <button
          type="submit"
          disabled={!file || !buildingId || loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {loading ? (
            <>
              <RefreshCw className="size-4 animate-spin" />
              Распознавание...
            </>
          ) : (
            <>
              <Upload className="size-4" />
              Распознать файл
            </>
          )}
        </button>
      </form>

      {commitSuccess && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
          <span>{commitSuccess}</span>
        </div>
      )}

      {/* Предпросмотр результатов */}
      {items.length > 0 && (
        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Найдено транзакций: {items.length}</h2>
            <button
              onClick={handleCommit}
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              Провести выписку в базу
            </button>
          </div>

          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-left text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Дата</th>
                  <th className="px-4 py-3 font-semibold">Сумма</th>
                  <th className="px-4 py-3 font-semibold">Контрагент / Назначение</th>
                  <th className="px-4 py-3 font-semibold">Квартира</th>
                  <th className="px-4 py-3 font-semibold">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {items.map((item, idx) => (
                  <tr key={idx} className={item.isDuplicate ? 'opacity-50 bg-muted/20' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(item.date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap font-bold ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.type === 'INCOME' ? '+' : '-'}{item.amount.toLocaleString()} ₸
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-semibold truncate">{item.counterpartyName || '—'}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.purpose}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {item.matchedApartmentNumber ? `Кв. ${item.matchedApartmentNumber}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.status === 'MATCHED' && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-lg">Распознано</span>
                      )}
                      {item.status === 'NEED_ATTENTION' && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-lg">Требует внимания</span>
                      )}
                      {item.status === 'DUPLICATE' && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-lg">Дубликат</span>
                      )}
                      {item.status === 'EXPENSE' && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-lg">Расход</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
