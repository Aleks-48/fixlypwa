"use client";

import { usePathname, useRouter } from "next/navigation";

// Переключатель дома в сайдбаре председателя (ui-redesign.md §2). Меняет сегмент
// [buildingId] в текущем пути; вне контекста дома ведёт на страницу выбранного дома.
// Нативный select — единый паттерн с OsiSwitcher (e2e-совместимость selectOption).
export function BuildingSwitcher({
  buildings,
}: {
  buildings: { id: string; address: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  if (buildings.length < 2) return null; // один дом — переключать нечего

  const match = pathname.match(/^\/app\/buildings\/([^/]+)(\/.*)?$/);
  const current = match?.[1] ?? buildings[0]!.id;

  function change(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (match) {
      router.push(`/app/buildings/${next}${match[2] ?? ""}`);
    } else {
      router.push(`/app/buildings/${next}`);
    }
  }

  return (
    <select
      aria-label="Активный дом"
      value={current}
      onChange={change}
      data-testid="building-switcher"
      className="mt-2 h-9 w-full rounded-xl border border-border bg-secondary px-2.5 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {buildings.map((b) => (
        <option key={b.id} value={b.id}>
          {b.address}
        </option>
      ))}
    </select>
  );
}
