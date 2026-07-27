import type { LucideIcon } from "lucide-react";
import { Droplet, Lightbulb, MoveVertical, Trash2, Wrench } from "lucide-react";

// Иконка + тон плитки по категории заявки (макет: цветные IconTile у заявок).
// Тон — только визуальный акцент; статусные цвета остаются за бейджем статуса.
const MAP: Record<string, { icon: LucideIcon; tile: string }> = {
  PLUMBING: { icon: Droplet, tile: "bg-destructive-soft text-destructive" },
  ELECTRICITY: { icon: Lightbulb, tile: "bg-warning-soft text-warning" },
  ELEVATOR: { icon: MoveVertical, tile: "bg-accent text-accent-foreground" },
  CLEANING: { icon: Trash2, tile: "bg-warning-soft text-warning" },
  OTHER: { icon: Wrench, tile: "bg-secondary text-muted-foreground" },
};

export function categoryVisual(category: string) {
  return MAP[category] ?? MAP.OTHER!;
}

// Цветная плитка-иконка категории (макет: 38–40px, radius 11px).
export function CategoryTile({ category, size = 38 }: { category: string; size?: number }) {
  const { icon: Icon, tile } = categoryVisual(category);
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl ${tile}`}
      style={{ width: size, height: size }}
    >
      <Icon aria-hidden size={Math.round(size * 0.47)} />
    </span>
  );
}
