import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { memberContext } from "@/lib/auth/context";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { Errors, fail } from "@/lib/http";
import { isAssistantEnabled } from "@/lib/assistant/providers";
import { checkAssistantMessageAllowed } from "@/lib/assistant/rateLimit";
import { resolveBuildingContext, runAssistantChat } from "@/lib/assistant/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
});

// POST /api/assistant/chat — SSE-стрим ответа AI-ассистента (срез 30, REQ-155..160).
// Та же авторизация, что у остальных API (cookie у браузера, Authorization: Bearer у
// мобильного клиента) — memberContext() пускает и жителя, и председателя; набор
// инструментов и системный промпт различаются по роли (service.ts/tools.ts).
export async function POST(req: Request) {
  if (!isAssistantEnabled()) {
    return fail("ASSISTANT_DISABLED", "AI-ассистент временно недоступен", 503);
  }

  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;
  const { auth, osiId } = ctx;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Errors.validation("Некорректное сообщение");

  const rate = await checkAssistantMessageAllowed(osiId, auth.user.id);
  if (!rate.allowed) {
    return fail(
      "RATE_LIMITED",
      rate.reason === "user"
        ? "Дневной лимит сообщений ассистенту исчерпан — попробуйте завтра"
        : "Дневной лимит сообщений ассистенту на дом исчерпан — попробуйте завтра",
      429,
    );
  }

  const role: "resident" | "chairman" = activeChairmanOsi(auth) === osiId ? "chairman" : "resident";
  const [osi, building] = await Promise.all([
    prisma.osi.findUnique({ where: { id: osiId }, select: { name: true } }),
    resolveBuildingContext(osiId, auth.user.id, role),
  ]);

  const encoder = new TextEncoder();
  const controllerAbort = new AbortController();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Контроллер уже закрыт (клиент отвалился раньше конца генерации) — событие теряется.
        }
      };

      try {
        for await (const evt of runAssistantChat({
          osiId,
          userId: auth.user.id,
          role,
          buildingId: building.buildingId,
          osiName: osi?.name ?? "ОСИ",
          buildingAddress: building.buildingAddress,
          conversationId: parsed.data.conversationId,
          userText: parsed.data.message,
          signal: controllerAbort.signal,
        })) {
          if (evt.type === "text") send("text", { text: evt.text });
          else if (evt.type === "done") send("done", { conversationId: evt.conversationId });
          else if (evt.type === "error") send("error", { code: evt.code, message: evt.message });
        }
      } catch (err) {
        console.error("[api/assistant/chat] неожиданная ошибка стрима:", err);
        send("error", { code: "INTERNAL", message: "Внутренняя ошибка ассистента" });
      } finally {
        try {
          controller.close();
        } catch {
          // уже закрыт
        }
      }
    },
    cancel() {
      controllerAbort.abort();
    },
  });

  req.signal.addEventListener("abort", () => controllerAbort.abort());

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
