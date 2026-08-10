export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

const TOKEN_KEY = "orbit.token";

export type Status = "LEAD" | "ACTIVE" | "AT_RISK";

export type Customer = {
  id: string;
  name: string;
  company: string;
  email: string;
  status: Status;
  value: number;
  lastContact: string;
  createdAt: string;
};

export type PageResult<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type Summary = {
  customers: number;
  pipeline: number;
  activeAccounts: number;
  conversionRate: number;
  byStatus: { status: Status; count: number; value: number }[];
  revenue: { month: string; value: number }[];
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  organizationName: string;
};

export type AuthResponse = { accessToken: string; user: AuthUser };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * The token lives in localStorage so the demo stays a static frontend against a
 * separately deployed API. An httpOnly cookie would be the stronger choice for
 * production; it needs the API and the site to share a registrable domain.
 */
export const tokenStore = {
  read(): string | null {
    return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
  },
  write(token: string): void {
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear(): void {
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokenStore.read();

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/** Nest returns `{ message: string | string[] }`; surface the first line of it. */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    return message ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}
