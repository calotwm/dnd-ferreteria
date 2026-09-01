export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class AuthError extends Error {
  constructor(message = "Sesión expirada") {
    super(message);
    this.name = "AuthError";
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const doFetch = async (): Promise<Response> => {
    const headers = new Headers(options.headers);
    if (options.body && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(path, { ...options, headers, credentials: "include" });
  };

  let res = await doFetch();

  if (res.status === 401) {
    const refreshRes = await fetch("/auth/refresh", { method: "POST", credentials: "include" });
    if (refreshRes.ok) {
      const data = (await refreshRes.json()) as { accessToken: string };
      setAccessToken(data.accessToken);
      res = await doFetch();
    } else {
      setAccessToken(null);
      throw new AuthError();
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new ApiError(body?.error?.message ?? res.statusText, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
