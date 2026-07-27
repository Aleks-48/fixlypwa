import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Стат-карточка дашборда по макету: цветная плитка-иконка, подпись, крупное число.
export function StatCard({
  icon: Icon,
  tile,
  label,
  value,
  valueClassName = "",
  testid,
}: {
  icon: LucideIcon;
  tile: string; // классы плитки, напр. "bg-accent text-accent-foreground"
  label: string;
  value: string | number;
  valueClassName?: string;
  testid?: string;
}) {
  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardContent className="px-4 py-4 lg:px-5 lg:py-5">
        <span className={`mb-3 flex size-9 items-center justify-center rounded-xl lg:size-10 ${tile}`}>
          <Icon aria-hidden size={19} />
        </span>
        <p className="m-0 text-xs text-muted-foreground lg:text-[13px]">{label}</p>
        <p
          className={`m-0 mt-0.5 text-2xl font-extrabold tracking-tight lg:text-3xl ${valueClassName}`}
          data-testid={testid}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
