// Клиентский помощник для вызова API. Единый разбор формата { data } / { error }.
export async function sendJson<T = Record<string, unknown>>(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  url: string,
  body?: unknown, // 1. Сделан необязательным (решает ошибку "Required")
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  // 2. Добавляем body только если он передан (убирает красное подчеркивание fetch)
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    // 3. Извлекаем сообщение об ошибке в любом формате (строка, объект или Zod)
    const errorMessage =
      typeof json?.error === "string"
        ? json.error
        : json?.error?.message ?? json?.message ?? "Что-то пошло не так";

    throw new Error(errorMessage);
  }

  // 4. Поддержка ответов как в обёртке { data: ... }, так и без нее
  if (json && typeof json === "object" && "data" in json) {
    return json.data as T;
  }

  return json as T;
}

export function postJson<T = Record<string, unknown>>(
  url: string,
  body?: unknown,
): Promise<T> {
  return sendJson<T>("POST", url, body);
}