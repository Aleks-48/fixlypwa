import { chairmanContext } from "@/lib/auth/context";
import {
analyzeDocumentWithAi,
analyzeHouseDocumentationAi,
} from "@/lib/documents/aiAnalysis";
import { Errors } from "@/lib/http";
import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  const { osiId } = ctx;
  const parsed = z.object({ documentId: z.string().uuid().optional(), buildingId: z.string().uuid().optional() })
    .refine((value) => Boolean(value.documentId) !== Boolean(value.buildingId))
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation("Укажите документ или дом");
  const body = parsed.data;

  try {
    if (body.documentId) {
      const result = await analyzeDocumentWithAi(osiId, body.documentId);
      return NextResponse.json(result);
    }

    if (body.buildingId) {
      const result = await analyzeHouseDocumentationAi(osiId, body.buildingId);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "documentId или buildingId обязателен" },
      { status: 400 },
    );
  } catch (caughtError) {
const err = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

    console.error("[api/documents/ai-analyze] Error:", err);
    return NextResponse.json(
      { error: err.message ?? " Ошибка AI анализа" },
      { status: 500 },
    );
  }
}
