/** Tiny JSON client for the app's own API. Throws with the server's message. */
export class ApiClientError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const hasBody = init?.body !== undefined;
  const res = await fetch(path, {
    method: init?.method ?? (hasBody ? "POST" : "GET"),
    headers: hasBody ? { "content-type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(init?.body) : undefined,
    credentials: "same-origin",
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message = data && typeof data === "object" && "error" in data ? String((data as { error: unknown }).error) : res.statusText;
    throw new ApiClientError(res.status, message || "request failed");
  }
  return data as T;
}
