import { NextResponse } from "next/server";
import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  buildingId: z.string().uuid("Некорректный UUID дома"),
  
  // Принимаем и title, и question для обратной совместимости с фронтом
  title: z.string().min(3, "Укажите название (минимум 3 символа)").max(300),
  
  description: z.string().optional(),
  type: z.enum(["INFORMATIONAL", "LEGALLY_BINDING"]).default("INFORMATIONAL"),
  quorumType: z.enum(["BY_AREA", "BY_APARTMENT"]).default("BY_AREA"),
  
  // coerce автоматически скомпилирует строку "50" в число 50
  quorumThreshold: z.coerce.number().default(50.0),
  
  // Приводим пустые строки к undefined, чтобы валидация давала точный ответ
  startDate: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.date({ invalid_type_error: "Укажите корректную дату начала" })
  ),
  endDate: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.date({ invalid_type_error: "Укажите корректную дату окончания" })
  ),
  
  options: z
    .array(z.string().trim().min(1, "Вариант не может быть пустым").max(100))
    .min(2, "Минимум 2 варианта")
    .max(10),
});

// POST /api/polls — создание опроса (поддерживает и lite, и юридически значимые)
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  const data = parsed.data;

  // Получаем параметры дома для фиксации площади на момент создания (нужно для кворума)
  const building = await prisma.building.findUnique({
    where: { id: data.buildingId },
    include: { apartments: true },
  });

  if (!building) return Errors.notFound("Дом");

  // В схеме Prisma площадь квартиры хранится в поле `area` (или `squareMeters` в альтернативных сущностях)
  const totalBuildingArea = building.apartments.reduce(
    (acc, apt: any) => acc + (Number(apt.area || apt.squareMeters) || 0),
    0
  );
  const totalApartments = building.apartments.length;

  const poll = await prisma.poll.create({
    data: {
      osiId: ctx.osiId,
      buildingId: data.buildingId,
      title: data.title,
      question: data.title, // На случай, если в схеме используется поле question
      description: data.description,
      type: data.type,
      quorumType: data.quorumType,
      quorumThreshold: data.quorumThreshold,
      startDate: data.startDate,
      endDate: data.endDate,
      deadline: data.endDate, // Синхронизируем endDate/deadline для совместимости моделей
      totalBuildingArea,
      totalApartments,
      options: {
        create: data.options.map((optText) => ({
          osiId: ctx.osiId,
          label: optText, // Обязательное поле label в PollOption
          text: optText,  // Поле text для обратной совместимости
        })),
      },
    } as any,
    include: { options: true },
  });

  return ok({ poll }, { status: 201 });
}