import { infoTypeLabels } from "@/lib/comms/labels";
import { Card, CardContent } from "@/components/ui/card";

type Item = { id: string; type: string; title: string; content: string };

// Список инфо-раздела (общий для председателя и жителя).
export function InfoList({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Пока пусто.</p>;
  }
  return (
    <ul className="m-0 grid list-none gap-3 p-0">
      {items.map((i) => (
        <li key={i.id} data-testid="info-row">
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <span className="text-xs text-muted-foreground">
                {infoTypeLabels[i.type] ?? i.type}
              </span>
              <strong className="block text-sm font-semibold">{i.title}</strong>
              <p className="m-0 mt-1 whitespace-pre-wrap text-sm">{i.content}</p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
