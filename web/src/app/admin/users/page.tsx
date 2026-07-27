import { requireSuperadminPage } from "@/lib/auth/adminPage";
import { searchUsers } from "@/lib/admin/service";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import Form from "next/form";

export const dynamic = "force-dynamic";

const MASTER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Мастер (на проверке)",
  APPROVED: "Мастер (одобрен)",
  REJECTED: "Мастер (отклонён)",
  BLOCKED: "Мастер (заблокирован)",
};

// Экран поиска и просмотра пользователей (срез 27).
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  await requireSuperadminPage();
  const { query } = await searchParams;
  const users = await searchUsers(query);

  return (
    <>
      <h1 className="mb-4 mt-0 text-xl font-bold">Пользователи</h1>

      {/* Поиск пользователей с использованием next/form (серверный переход без JS) */}
      <Form action="/admin/users" className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            name="query"
            placeholder="Поиск по ФИО, телефону или email..."
            defaultValue={query || ""}
            className="pl-9 rounded-full"
            data-testid="users-search-input"
          />
        </div>
        <Button type="submit" className="rounded-full font-semibold">
          Найти
        </Button>
      </Form>

      {users.length === 0 && (
        <p className="text-sm text-muted-foreground">Пользователи не найдены.</p>
      )}

      <div className="grid gap-3">
        {users.map((u) => (
          <Card key={u.id} className="rounded-2xl shadow-sm" data-testid="admin-user-card">
            <CardContent className="pt-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <strong className="text-[15px] font-bold">
                    {u.fullName || "Без имени"}
                  </strong>
                  <p className="m-0 mt-1 text-sm text-muted-foreground">
                    {u.phone || "Нет телефона"}
                    {u.email ? ` · ${u.email}` : ""}
                  </p>
                  <p className="m-0 mt-1 text-xs text-muted-foreground">
                    Зарегистрирован: {u.createdAt.toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <div className="text-right">
                  {u.master && (
                    <span className="inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground mb-1.5">
                      {MASTER_STATUS_LABELS[u.master.status] ?? u.master.status}
                    </span>
                  )}
                  <div className="flex flex-col items-end gap-1">
                    {u.roles.map((r) => (
                      <span
                        key={r.osiId}
                        className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                      >
                        {r.osi.name} · {r.role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
