// Клиентский помощник для вызова API. Единый разбор формата { data } / { error }.
export async function sendJson<T = Record<string, unknown>>(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  url: string,
  body?: unknown, // 1. Сделали body необязательным
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    // 2. Умное извлечение ошибки (поддерживает и объекты, и обычные строки)
    const errorMessage =
      typeof json?.error === "string"
        ? json.error
        : json?.error?.message ?? json?.message ?? "Что-то пошло не так";

    throw new Error(errorMessage);
  }

  // 3. Если ответ обёрнут в { data: ... }, берем data. Если отдаётся напрямую — берем сам json
  if (json && typeof json === "object" && "data" in json) {
    return json.data as T;
  }

  return json as T;
}

export function postJson<T = Record<string, unknown>>(
  url: string,
  body?: unknown, // 1. Сделали body необязательным
): Promise<T> {
  return sendJson<T>("POST", url, body);
}