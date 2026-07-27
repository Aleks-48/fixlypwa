'use client';

import React, { useState } from 'react';

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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setCommitSuccess(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/bank-import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setItems(data.items || []);
    } catch (err: any) {
      alert(err.message || 'Ошибка загрузки файла');
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
      if (!res.ok) throw new Error(data.error);

      setCommitSuccess(
        `Успешно проведено: ${data.paymentsCreated} платежей, ${data.expensesCreated} расходов. Пропущено дублей: ${data.skippedDuplicates}`
      );
      setItems([]);
      setFile(null);
    } catch (err: any) {
      alert(err.message || 'Ошибка проведения выписки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">Импорт банковской выписки</h1>

      {/* Форма загрузки */}
      <form onSubmit={handleUpload} className="p-4 bg-card text-card-foreground border rounded-2xl shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Выписка (.xlsx, .csv, .txt 1С)</label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
          />
        </div>

        <button
          type="submit"
          disabled={!file || loading}
          className="px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Обработка...' : 'Распознать файл'}
        </button>
      </form>

      {commitSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl">
          {commitSuccess}
        </div>
      )}

      {/* Предпросмотр результатов */}
      {items.length > 0 && (
        <div className="bg-card text-card-foreground border rounded-2xl shadow-sm overflow-hidden p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Предпросмотр транзакций ({items.length})</h2>
            <button
              onClick={handleCommit}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
            >
              Провести выписку
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Сумма</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Контрагент / Назначение</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Квартира</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item, idx) => (
                  <tr key={idx} className={item.isDuplicate ? 'opacity-50 bg-muted/20' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {new Date(item.date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.type === 'INCOME' ? '+' : '-'}{item.amount.toLocaleString()} ₸
                    </td>
                    <td className="px-4 py-3 text-sm max-w-xs">
                      <div className="font-semibold truncate">{item.counterpartyName || '—'}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.purpose}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {item.matchedApartmentNumber ? `Кв. ${item.matchedApartmentNumber}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.status === 'MATCHED' && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-lg">Распознано</span>
                      )}
                      {item.status === 'NEED_ATTENTION' && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-lg">Требует уточнения</span>
                      )}
                      {item.status === 'DUPLICATE' && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-lg">Дубликат (пропуск)</span>
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