const API_BASE = import.meta.env.VITE_API_URL || "/api";

const TOKEN_KEY = "hypercore_admin_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown) {
    super(`API error ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
}

async function request<T>(
  endpoint: string,
  { body, auth = false, headers: customHeaders, ...init }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((customHeaders as Record<string, string>) ?? {}),
  };

  if (auth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...init,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    // Global 401 handling: clear stale token and redirect to login
    if (response.status === 401 && auth) {
      clearToken();
      window.location.href = "/admin/login";
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }
    throw new ApiError(response.status, data);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function downloadUrl(endpoint: string): string {
  return `${API_BASE}${endpoint}`;
}

export const api = {
  get<T>(endpoint: string, auth = false) {
    return request<T>(endpoint, { method: "GET", auth });
  },

  post<T>(endpoint: string, body?: unknown, auth = false) {
    return request<T>(endpoint, { method: "POST", body, auth });
  },

  patch<T>(endpoint: string, body?: unknown, auth = false) {
    return request<T>(endpoint, { method: "PATCH", body, auth });
  },

  delete<T>(endpoint: string, auth = false) {
    return request<T>(endpoint, { method: "DELETE", auth });
  },
};
