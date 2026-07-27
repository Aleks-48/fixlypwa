// Остаток дизайн-моста после переезда на shadcn/ui (срез 11): все экраны используют
// компоненты из "@/components/ui". Здесь живёт только стиль нативного <select>.
//
// Нативный <select> вместо Radix Select — осознанно: e2e (communication.spec.ts) вызывает
// selectOption(), который работает только с настоящим <select>; один паттерн на весь проект.
// Классы повторяют shadcn Input (высота/радиус/фокус-ринг).
export const selectClassName =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground " +
  "outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 " +
  "disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30";
