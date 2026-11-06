import type { AuthResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// الـ access token في الذاكرة بس (مش localStorage) عشان أي XSS ماياخدوش
let accessToken: string | null = null;
let onSessionLost: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setSessionLostHandler(handler: (() => void) | null) {
  onSessionLost = handler;
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string; details?: unknown };
    };
    return new ApiError(
      res.status,
      body.error?.code ?? "ERROR",
      body.error?.message ?? "حدث خطأ غير متوقع",
      body.error?.details,
    );
  } catch {
    return new ApiError(res.status, "ERROR", "حدث خطأ غير متوقع");
  }
}

async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "NETWORK", "تعذّر الاتصال بالخادم، تحقق من الإنترنت");
  }
}

function jsonInit(method: string, body?: unknown): RequestInit {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  return {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

// ---- تجديد الجلسة ----
// طلب واحد فقط في نفس الوقت (single-flight)، وقفل بين التابات (Web Locks)،
// لأن السيرفر بيلغي الجلسة لو نفس الـ refresh token اتستخدم مرتين.
let refreshing: Promise<AuthResponse | null> | null = null;

async function doRefresh(): Promise<AuthResponse | null> {
  const res = await send("/auth/refresh", { method: "POST" });
  if (res.status === 401) {
    accessToken = null;
    return null;
  }
  if (!res.ok) throw await parseError(res);
  const data = (await res.json()) as AuthResponse;
  accessToken = data.accessToken;
  return data;
}

export function refreshSession(): Promise<AuthResponse | null> {
  if (!refreshing) {
    const run: () => Promise<AuthResponse | null> =
      typeof navigator !== "undefined" && navigator.locks
        ? async () => await navigator.locks.request("nabtety-refresh", doRefresh)
        : doRefresh;
    const promise = run().finally(() => {
      refreshing = null;
    });
    refreshing = promise;
    return promise;
  }
  return refreshing;
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  let res = await send(path, jsonInit(method, options.body));

  if (res.status === 401 && !path.startsWith("/auth/")) {
    const session = await refreshSession();
    if (!session) {
      onSessionLost?.();
      throw await parseError(res);
    }
    res = await send(path, jsonInit(method, options.body));
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function authRequest(
  path: "/auth/login" | "/auth/register",
  body: unknown,
): Promise<AuthResponse> {
  const res = await send(path, jsonInit("POST", body));
  if (!res.ok) throw await parseError(res);
  const data = (await res.json()) as AuthResponse;
  accessToken = data.accessToken;
  return data;
}

export async function logoutRequest(): Promise<void> {
  try {
    await send("/auth/logout", jsonInit("POST"));
  } finally {
    accessToken = null;
  }
}
export async function uploadRequest<T>(path: string, form: FormData): Promise<T> {
  const doSend = () => {
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    return send(path, { method: "POST", headers, body: form });
  };

  let res = await doSend();
  if (res.status === 401) {
    const session = await refreshSession();
    if (!session) {
      onSessionLost?.();
      throw await parseError(res);
    }
    res = await doSend();
  }
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}