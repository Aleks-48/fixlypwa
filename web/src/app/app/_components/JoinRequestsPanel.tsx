"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, UserCheck } from "lucide-react";
import { postJson } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Заявки на подключение (REQ-152/153, docs/specs/osi-join-request.md) — председатель видит
// контакт заявителя и его пометку, привязывает через карточку дома (AddResidentForm) как
// раньше, здесь только отмечает заявку обработанной.

type JoinRequest = {
  id: string;
  note: string | null;
  user: { email: string | null; phone: string | null; fullName: string | null };
};

export function JoinRequestsPanel({ requests }: { requests: JoinRequest[] }) {
  const router = useRouter();
  const [resolving, setResolving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (requests.length === 0) return null;

  async function resolve(id: string) {
    setResolving(id);
    setError(null);
    try {
      await postJson(`/api/osi/join-requests/${id}/resolve`, {});
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setResolving(null);
    }
  }

  return (
    <Card className="rounded-2xl shadow-sm" data-testid="join-requests-panel">
      <CardContent className="pt-6">
        <div className="mb-3 flex items-center gap-2">
          <UserCheck aria-hidden size={17} className="text-primary" />
          <h2 className="m-0 text-base font-bold">Заявки на подключение ({requests.length})</h2>
        </div>
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {requests.map((r) => {
            const contact = r.user.email ?? r.user.phone ?? "—";
            return (
              <li
                key={r.id}
                data-testid="join-request-row"
                className="rounded-xl border border-border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-semibold">{r.user.fullName ?? contact}</p>
                    {r.user.fullName && (
                      <p className="m-0 text-xs text-muted-foreground">{contact}</p>
                    )}
                    {r.note && <p className="m-0 mt-1 text-sm">{r.note}</p>}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={resolving === r.id}
                    onClick={() => void resolve(r.id)}
                    data-testid="join-request-resolve"
                    className="shrink-0 gap-1"
                  >
                    <CheckCircle2 aria-hidden size={13} />
                    {resolving === r.id ? "…" : "Обработано"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="m-0 mt-3 text-xs text-muted-foreground">
          Подключите жителя к нужной квартире через карточку дома (кнопка «Житель», поиск по
          телефону/email) — заявка сама привязку не делает.
        </p>
        {error && (
          <p role="alert" data-testid="error" className="m-0 mt-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
