// CSS-гистограмма по макету (без chart-библиотек): колонки-подложки + заливка primary.
export function BarChart({
  bars,
  height = 140,
}: {
  bars: { label: string; value: number }[];
  height?: number;
}) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="flex items-end gap-3 px-1 sm:gap-5" style={{ height: height + 24 }}>
      {bars.map((b, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2">
          <div
            className="flex w-full max-w-12 items-end overflow-hidden rounded-lg bg-secondary"
            style={{ height }}
            title={`${b.label}: ${b.value.toLocaleString("ru-RU")} ₸`}
          >
            <div
              className="w-full rounded-lg bg-primary"
              style={{ height: `${Math.round((b.value / max) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
