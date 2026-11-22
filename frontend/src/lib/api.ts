import { readRefresh, writeRefresh } from "./session-store";
export const API = (
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");
export const client = process.env.EXPO_OS === "web" ? "web" : "native";
export type User = {
  id: string;
  email: string;
  fullName: string;
  role: "USER" | "ADMIN";
  locale: "FR" | "AR";
};
export type Session = {
  user: User;
  accessToken: string;
  refreshToken?: string;
};
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
let accessToken: string | null = null;
let listener: ((user: User | null) => void) | undefined;
let refreshing: Promise<Session> | null = null;
export const onSession = (value: typeof listener) => {
  listener = value;
};
export async function acceptSession(session: Session) {
  await writeRefresh(session.refreshToken || null);
  accessToken = session.accessToken;
  listener?.(session.user);
  return session;
}
export async function clearSession() {
  accessToken = null;
  await writeRefresh(null);
  listener?.(null);
}
async function raw<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${API}${path}`, {
      ...options,
      signal: controller.signal,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });
    const body = await response.json();
    if (!response.ok)
      throw new ApiError(
        response.status,
        body.code || "REQUEST_FAILED",
        Array.isArray(body.message)
          ? body.message.join("\n")
          : body.message || "Request failed",
      );
    return body as T;
  } finally {
    clearTimeout(timeout);
  }
}
export async function refreshSession() {
  if (!refreshing)
    refreshing = (async () => {
      try {
        const refreshToken = await readRefresh();
        if (client === "native" && !refreshToken)
          throw new ApiError(401, "UNAUTHORIZED", "No session");
        return await acceptSession(
          await raw<Session>("/auth/refresh", {
            method: "POST",
            body: JSON.stringify({
              client,
              ...(refreshToken ? { refreshToken } : {}),
            }),
          }),
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401)
          await clearSession();
        throw error;
      } finally {
        refreshing = null;
      }
    })();
  return refreshing;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  try {
    return await raw<T>(path, options);
  } catch (error) {
    if (
      retry &&
      error instanceof ApiError &&
      error.status === 401 &&
      (!path.startsWith("/auth/") ||
        path.startsWith("/auth/me") ||
        path === "/auth/google/link")
    ) {
      await refreshSession();
      return raw<T>(path, options);
    }
    throw error;
  }
}
export const post = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) });
export async function signOut() {
  const refreshToken = await readRefresh();
  await post("/auth/logout", {
    client,
    ...(refreshToken ? { refreshToken } : {}),
  });
  await clearSession();
}
