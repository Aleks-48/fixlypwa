"use client";

import { ChevronDown,ChevronRight,Columns,Filter,Plus,X } from "lucide-react";
import { Fragment,useMemo,useState } from "react";

export interface CategoryFinanceDetail {
  title: string;
  startBalance: number;
  accrued: number;
  adjustments: number;
  paid: number;
  penalty: number;
}

export interface ApartmentFinanceAccount {
  id: string;
  number: string;
  ownerName: string;
  role?: string;
  categories: CategoryFinanceDetail[];
}

function calcDebt(c: CategoryFinanceDetail) {
  return c.startBalance + c.accrued + c.adjustments + c.penalty - c.paid;
}

function formatNum(val: number) {
  if (val === 0) return "0";
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(val);
}

const ALL_COLUMNS = [
  { key: "number", label: "№ помещения" },
  { key: "ownerName", label: "ФИО собственника" },
  { key: "role", label: "Владелец" },
  { key: "accrued", label: "Начислено за всё время" },
  { key: "paid", label: "Оплачено" },
  { key: "debt", label: "Долг" },
];

interface FilterRule {
  id: string;
  column: string;
  operator: "contains" | "equals";
  value: string;
}

export function ApartmentsDebtTable({
  data = [],
}: {
  data?: ApartmentFinanceAccount[];
}) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [selectAll, setSelectAll] = useState(false);

  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    number: true,
    ownerName: true,
    role: true,
    startBalance: true,
    accrued: true,
    adjustments: true,
    paid: true,
    penalty: true,
    debt: true,
  });
  const [showColMenu, setShowColMenu] = useState(false);
  const [colSearch, setColSearch] = useState("");

  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filters, setFilters] = useState<FilterRule[]>([]);

  const toggleCol = (key: string) => {
    setVisibleCols((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const showAllCols = () => {
    const updated: Record<string, boolean> = {};
    ALL_COLUMNS.forEach((c) => (updated[c.key] = true));
    setVisibleCols(updated);
  };

  const hideAllCols = () => {
    const updated: Record<string, boolean> = {};
    ALL_COLUMNS.forEach((c) => (updated[c.key] = false));
    setVisibleCols(updated);
  };

  const filteredData = useMemo(() => {
    if (filters.length === 0) return data;
    return data.filter((item) => {
      return filters.every((f) => {
        if (!f.value.trim()) return true;
        let val = "";
        if (f.column === "number") val = item.number;
        if (f.column === "ownerName") val = item.ownerName;
        if (f.column === "role") val = item.role || "Собственник";

        const valLower = val.toLowerCase();
        const searchLower = f.value.toLowerCase();

        if (f.operator === "equals") return valLower === searchLower;
        return valLower.includes(searchLower);
      });
    });
  }, [data, filters]);

  const totals = useMemo(() => {
    let start = 0, accrued = 0, adj = 0, paid = 0, penalty = 0, debt = 0;
    filteredData.forEach((acc) => {
      acc.categories.forEach((cat) => {
        start += cat.startBalance;
        accrued += cat.accrued;
        adj += cat.adjustments;
        paid += cat.paid;
        penalty += cat.penalty;
        debt += calcDebt(cat);
      });
    });
    return { start, accrued, adj, paid, penalty, debt };
  }, [filteredData]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectAll = () => {
    const next = !selectAll;
    setSelectAll(next);
    const updated: Record<string, boolean> = {};
    filteredData.forEach((item) => {
      updated[item.id] = next;
    });
    setSelectedIds(updated);
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addFilterRule = () => {
    setFilters((prev) => [
      ...prev,
      { id: String(Date.now()), column: "number", operator: "contains", value: "" },
    ]);
  };

  const removeFilterRule = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  };

  // Общий CSS класс для option с поддержкой темного режима
  const optionClass = "bg-popover text-popover-foreground dark:bg-zinc-900 dark:text-zinc-100";

  return (
    <div className="w-full rounded-2xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
      {/* Панель инструментов */}
      <div className="relative flex items-center justify-between border-b border-border px-4 py-2.5 text-sm bg-muted/20">
        <div className="flex items-center gap-4">
          {/* Меню Столбцы */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowColMenu(!showColMenu);
                setShowFilterMenu(false);
              }}
              className="flex items-center gap-1.5 font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              <Columns className="h-4 w-4" />
              Столбцы
            </button>

            {showColMenu && (
              <div className="absolute left-0 top-8 z-30 w-64 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg dark:bg-zinc-900 dark:border-zinc-800">
                <p className="text-xs text-muted-foreground mb-1">Найти столбец</p>
                <input
                  type="text"
                  value={colSearch}
                  onChange={(e) => setColSearch(e.target.value)}
                  placeholder="Заголовок столбца"
                  className="w-full border-b border-emerald-600 bg-transparent py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none mb-2"
                />
                <div className="max-h-48 overflow-y-auto space-y-1.5 py-1">
                  {ALL_COLUMNS.filter((c) =>
                    c.label.toLowerCase().includes(colSearch.toLowerCase())
                  ).map((col) => (
                    <label key={col.key} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!visibleCols[col.key]}
                        onChange={() => toggleCol(col.key)}
                        className="h-3.5 w-3.5 rounded accent-emerald-600 cursor-pointer"
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-border flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <button type="button" onClick={hideAllCols} className="hover:underline">
                    Скрыть все
                  </button>
                  <button type="button" onClick={showAllCols} className="hover:underline">
                    Показать все
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Меню Фильтры */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowFilterMenu(!showFilterMenu);
                setShowColMenu(false);
              }}
              className="flex items-center gap-1.5 font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              <Filter className="h-4 w-4" />
              Фильтры {filters.length > 0 && `(${filters.length})`}
            </button>

            {showFilterMenu && (
              <div className="absolute left-0 top-8 z-30 min-w-[360px] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg dark:bg-zinc-900 dark:border-zinc-800">
                {filters.length === 0 ? (
                  <p className="text-xs text-muted-foreground mb-2">Фильтры не добавлены</p>
                ) : (
                  <div className="space-y-2 mb-3">
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-[11px] text-muted-foreground font-medium">
                      <span>Столбцы</span>
                      <span>Операторы</span>
                      <span>Значение</span>
                      <span></span>
                    </div>
                    {filters.map((f) => (
                      <div key={f.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                        <select
                          value={f.column}
                          onChange={(e) =>
                            setFilters((prev) =>
                              prev.map((item) =>
                                item.id === f.id ? { ...item, column: e.target.value } : item
                              )
                            )
                          }
                          className="bg-transparent text-xs text-foreground border-b border-border outline-none cursor-pointer py-0.5"
                        >
                          <option value="number" className={optionClass}>№ помещения</option>
                          <option value="ownerName" className={optionClass}>ФИО собственника</option>
                          <option value="role" className={optionClass}>Владелец</option>
                        </select>
                        <select
                          value={f.operator}
                          onChange={(e) =>
                            setFilters((prev) =>
                              prev.map((item) =>
                                item.id === f.id
                                  ? { ...item, operator: e.target.value === "equals" ? "equals" : "contains" }
                                  : item
                              )
                            )
                          }
                          className="bg-transparent text-xs text-foreground border-b border-border outline-none cursor-pointer py-0.5"
                        >
                          <option value="contains" className={optionClass}>содержит</option>
                          <option value="equals" className={optionClass}>равно</option>
                        </select>
                        <input
                          type="text"
                          value={f.value}
                          onChange={(e) =>
                            setFilters((prev) =>
                              prev.map((item) =>
                                item.id === f.id ? { ...item, value: e.target.value } : item
                              )
                            )
                          }
                          placeholder="Значение"
                          className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground border-b border-emerald-600 outline-none py-0.5"
                        />
                        <button
                          type="button"
                          onClick={() => removeFilterRule(f.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={addFilterRule}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Добавить фильтр
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Квартир: {filteredData.length}
        </div>
      </div>

      {/* Таблица */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
              <th className="w-10 px-3 py-2.5 text-center">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-input accent-emerald-600 cursor-pointer"
                />
              </th>
              <th className="w-8 px-1 py-2.5"></th>
              {visibleCols.number && <th className="w-24 px-3 py-2.5">№ помещ.</th>}
              {visibleCols.ownerName && <th className="min-w-[160px] px-3 py-2.5">ФИО собственника</th>}
              {visibleCols.role && <th className="w-28 px-3 py-2.5">Владелец</th>}
              {visibleCols.startBalance && <th className="w-28 px-3 py-2.5 text-right">Сальдо на начало</th>}
              {visibleCols.accrued && <th className="w-28 px-3 py-2.5 text-right">Начислено</th>}
              {visibleCols.adjustments && <th className="w-28 px-3 py-2.5 text-right">Корректировки</th>}
              {visibleCols.paid && <th className="w-28 px-3 py-2.5 text-right">Оплачено</th>}
              {visibleCols.penalty && <th className="w-24 px-3 py-2.5 text-right">Пеня</th>}
              {visibleCols.debt && <th className="w-28 px-3 py-2.5 text-right font-semibold">Долг</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredData.map((acc) => {
              const isExpanded = !!expandedIds[acc.id];
              const isSelected = !!selectedIds[acc.id];

              const totalStart = acc.categories.reduce((s, c) => s + c.startBalance, 0);
              const totalAccrued = acc.categories.reduce((s, c) => s + c.accrued, 0);
              const totalAdj = acc.categories.reduce((s, c) => s + c.adjustments, 0);
              const totalPaid = acc.categories.reduce((s, c) => s + c.paid, 0);
              const totalPenalty = acc.categories.reduce((s, c) => s + c.penalty, 0);
              const totalDebt = acc.categories.reduce((s, c) => s + calcDebt(c), 0);

              const visibleColsCount = Object.values(visibleCols).filter(Boolean).length;

              return (
                <Fragment key={acc.id}>
                  <tr
                    className={`group transition-colors hover:bg-muted/30 ${
                      isExpanded ? "bg-muted/20" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(acc.id)}
                        className="h-4 w-4 rounded border-input accent-emerald-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-1 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleExpand(acc.id)}
                        className="p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    {visibleCols.number && (
                      <td className="px-3 py-2.5 font-semibold text-foreground">
                        {acc.number}
                      </td>
                    )}
                    {visibleCols.ownerName && (
                      <td className="px-3 py-2.5 text-foreground">
                        {acc.ownerName}
                      </td>
                    )}
                    {visibleCols.role && (
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {acc.role || "Собственник"}
                      </td>
                    )}
                    {visibleCols.startBalance && (
                      <td className="px-3 py-2.5 text-right">{formatNum(totalStart)}</td>
                    )}
                    {visibleCols.accrued && (
                      <td className="px-3 py-2.5 text-right">{formatNum(totalAccrued)}</td>
                    )}
                    {visibleCols.adjustments && (
                      <td className="px-3 py-2.5 text-right">{formatNum(totalAdj)}</td>
                    )}
                    {visibleCols.paid && (
                      <td className="px-3 py-2.5 text-right">{formatNum(totalPaid)}</td>
                    )}
                    {visibleCols.penalty && (
                      <td className="px-3 py-2.5 text-right">{formatNum(totalPenalty)}</td>
                    )}
                    {visibleCols.debt && (
                      <td
                        className={`px-3 py-2.5 text-right font-semibold ${
                          totalDebt > 0 ? "text-destructive" : "text-foreground"
                        }`}
                      >
                        {formatNum(totalDebt)}
                      </td>
                    )}
                  </tr>

                  {/* Вложенные строки подкатегорий */}
                  {isExpanded &&
                    acc.categories.map((cat, idx) => {
                      const debt = calcDebt(cat);
                      return (
                        <tr
                          key={`${acc.id}-cat-${idx}`}
                          className="bg-blue-50/50 dark:bg-zinc-900/60 text-xs border-b border-blue-100/60 dark:border-zinc-800"
                        >
                          <td colSpan={2} className="px-3 py-2"></td>
                          <td
                            colSpan={Math.max(1, visibleColsCount - 6)}
                            className="px-3 py-2 font-medium text-blue-900 dark:text-blue-300"
                          >
                            {cat.title}
                          </td>
                          {visibleCols.startBalance && (
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {formatNum(cat.startBalance)}
                            </td>
                          )}
                          {visibleCols.accrued && (
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {formatNum(cat.accrued)}
                            </td>
                          )}
                          {visibleCols.adjustments && (
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {formatNum(cat.adjustments)}
                            </td>
                          )}
                          {visibleCols.paid && (
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {formatNum(cat.paid)}
                            </td>
                          )}
                          {visibleCols.penalty && (
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {formatNum(cat.penalty)}
                            </td>
                          )}
                          {visibleCols.debt && (
                            <td
                              className={`px-3 py-2 text-right font-medium ${
                                debt > 0 ? "text-destructive" : "text-muted-foreground"
                              }`}
                            >
                              {formatNum(debt)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Итоговый подвал */}
      <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 border-t border-border bg-muted/30 dark:bg-zinc-900/40 px-4 py-3 text-xs text-muted-foreground font-medium">
        {visibleCols.startBalance && (
          <div>
            Сальдо на начало: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatNum(totals.start)}</span>
          </div>
        )}
        {visibleCols.accrued && (
          <div>
            Начислено: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatNum(totals.accrued)}</span>
          </div>
        )}
        {visibleCols.adjustments && (
          <div>
            Корректировки: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatNum(totals.adj)}</span>
          </div>
        )}
        {visibleCols.paid && (
          <div>
            Оплачено: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatNum(totals.paid)}</span>
          </div>
        )}
        {visibleCols.debt && (
          <div>
            Долг: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatNum(totals.debt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
