import { z } from "zod";

export const createPollSchema = z.object({
  question: z.string().min(1, "Введите вопрос"),
  options: z.array(z.string().min(1, "Заполните вариант")).min(2, "Минимум 2 варианта"),
  
  // 1. Делаем необязательным или подставляем дефолт, если поля нет в UI
  buildingId: z.string().optional(), 
  
  // 2. Если требуется дата, а инпута нет — генерируем дефолт (например, +7 дней)
  endDate: z.string().optional().default(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString();
  }),
});