import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi, activeMemberOsi } from "@/lib/auth/guards";
import { PageBody, PageHeader } from "../_components/PageHeader";
import { AssistantChat } from "../_components/AssistantChat";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Sparkles, ShieldCheck, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

// Страница AI-помощника (/app/assistant) — доступна жителю и председателю
export default async function AssistantPage() {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");

  const isChairman = Boolean(activeChairmanOsi(auth));
  const isMember = Boolean(activeMemberOsi(auth));

  if (!isChairman && !isMember) redirect("/app");

  const role = isChairman ? "chairman" : "resident";

  return (
    <>
      <PageHeader
        title="AI-помощник"
        subtitle="Интеллектуальный ассистент по вопросам ОСИ, заявкам, финансам и документам"
      />
      <PageBody>
        <div className="grid gap-6">
          <Card className="rounded-2xl shadow-sm border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                  <Bot size={28} />
                </div>
                <div>
                  <h3 className="m-0 text-lg font-bold">Чем я могу помочь?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Задавайте любые вопросы по работе ОСИ, нормам ЖКХ РК, начислениям или вашим заявкам.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-xs">
                  <div className="flex items-center gap-2 font-semibold text-xs text-primary mb-1">
                    <Sparkles size={14} /> Умный поиск
                  </div>
                  <p className="m-0 text-xs text-muted-foreground">
                    Быстрые ответы по протоколам, уставу и законам
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-xs">
                  <div className="flex items-center gap-2 font-semibold text-xs text-primary mb-1">
                    <Zap size={14} /> Оперативные статусы
                  </div>
                  <p className="m-0 text-xs text-muted-foreground">
                    Проверка задолженностей и состояния текущих заявок
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-xs">
                  <div className="flex items-center gap-2 font-semibold text-xs text-primary mb-1">
                    <ShieldCheck size={14} /> Приватность
                  </div>
                  <p className="m-0 text-xs text-muted-foreground">
                    Все личные данные перед отправкой обезличиваются
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Плавающий виджет ассистента будет активен на странице */}
          <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-secondary/20">
            <p className="m-0 font-medium text-sm text-foreground">
              Нажмите на синюю кнопку <Bot className="inline size-4 text-primary" /> в правом нижнем углу, чтобы открыть диалог с ассистентом.
            </p>
          </div>
        </div>
      </PageBody>

      <AssistantChat role={role} />
    </>
  );
}
