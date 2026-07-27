"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Send, X } from "lucide-react";
import { postJson, sendJson } from "@/lib/apiClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Самообслуживание жителя (REQ-151/154, docs/specs/osi-join-request.md): вместо инструкции
// «сообщите председателю телефон/email» — поиск своей ОСИ и заявка на подключение. Привязку
// к квартире делает председатель (REQ-013/153) — это карточка только заявляет о намерении.

type OsiResult = { id: string; name: string; address: string | null };
type MyRequest = {
  id: string;
  note: string | null;
  osi: { name: string; address: string | null };
};

export function JoinOsiCard() {
  const [loading, setLoading] = useState(true);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OsiResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<OsiResult | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/osi/join-request");
        const json = (await res.json().catch(() => null)) as {
          data?: { requests: MyRequest[] };
        } | null;
        setMyRequests(json?.data?.requests ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Debounce поиска (300мс) — не долбим API на каждое нажатие клавиши.
  function onQueryChange(v: string) {
    setQuery(v);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => void runSearch(v.trim()), 300);
  }

  async function runSearch(q: string) {
    setSearching(true);
    try {
      const res = await fetch(`/api/osi/search?q=${encodeURIComponent(q)}`);
      const json = (await res.json().catch(() => null)) as {
        data?: { results: OsiResult[] };
      } | null;
      setResults(json?.data?.results ?? []);
    } finally {
      setSearching(false);
    }
  }

  async function submit() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const { request } = await postJson<{ request: { id: string } }>(
        "/api/osi/join-request",
        { osiId: selected.id, note: note.trim() || undefined },
      );
      setMyRequests((prev) => [
        { id: request.id, note: note.trim() || null, osi: selected },
        ...prev,
      ]);
      setSelected(null);
      setQuery("");
      setResults([]);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel(id: string) {
    setError(null);
    try {
      await sendJson("DELETE", `/api/osi/join-request/${id}`, {});
      setMyRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-sm" data-testid="resident-welcome">
        <CardContent className="pt-6">
          <p className="m-0 text-sm text-muted-foreground">Загрузка…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm" data-testid="resident-welcome">
      <CardContent className="pt-6">
        <h2 className="m-0 mb-2 text-base font-bold">Вы житель? Найдите свою ОСИ</h2>

        {myRequests.length > 0 ? (
          <div className="grid gap-3">
            {myRequests.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-border bg-secondary p-3"
                data-testid="join-request-pending"
              >
                <p className="m-0 text-sm font-semibold">{r.osi.name}</p>
                {r.osi.address && (
                  <p className="m-0 text-xs text-muted-foreground">{r.osi.address}</p>
                )}
                {r.note && <p className="m-0 mt-1 text-sm">Ваша пометка: {r.note}</p>}
                <p className="m-0 mt-1.5 text-xs text-muted-foreground">
                  Заявка отправлена, ожидайте — председатель подключит вас к квартире.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 gap-1 px-2 text-muted-foreground"
                  onClick={() => void cancel(r.id)}
                  data-testid="join-request-cancel"
                >
                  <X aria-hidden size={13} /> Отменить заявку
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-2.5">
            <p className="m-0 text-sm text-muted-foreground">
              Найдите ОСИ вашего дома по названию или адресу и отправьте заявку — председатель
              увидит её и подключит вас к вашей квартире.
            </p>
            <div className="relative">
              <Search
                aria-hidden
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Название или адрес ОСИ"
                className="pl-9"
                data-testid="osi-search-input"
              />
            </div>
            {searching && <p className="m-0 text-xs text-muted-foreground">Ищем…</p>}
            {results.length > 0 && !selected && (
              <ul className="m-0 grid list-none gap-1.5 p-0">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(r);
                        setResults([]);
                      }}
                      data-testid="osi-search-result"
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-left text-sm hover:bg-muted/50"
                    >
                      <span className="block font-semibold">{r.name}</span>
                      {r.address && (
                        <span className="block text-xs text-muted-foreground">{r.address}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!searching && query.trim().length >= 2 && results.length === 0 && !selected && (
              <p className="m-0 text-xs text-muted-foreground">Ничего не нашли — проверьте название.</p>
            )}
            {selected && (
              <div className="rounded-xl border border-primary/40 bg-accent p-3">
                <p className="m-0 text-sm font-semibold">{selected.name}</p>
                {selected.address && (
                  <p className="m-0 text-xs text-muted-foreground">{selected.address}</p>
                )}
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Дом/квартира (необязательно) — напр. Абая 1, кв. 5"
                  className="mt-2"
                  data-testid="join-request-note"
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={submitting}
                    onClick={() => void submit()}
                    data-testid="join-request-submit"
                  >
                    <Send aria-hidden size={13} /> {submitting ? "Отправляем…" : "Отправить заявку"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelected(null)}>
                    Отмена
                  </Button>
                </div>
              </div>
            )}
            {error && (
              <p role="alert" data-testid="error" className="m-0 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
