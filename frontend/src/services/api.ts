export type JwtResponse = {
  token: string;
  type: string;
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function buildUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

function authHeader(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || response.statusText || "Request failed.";
    throw new Error(message);
  }

  return data as T;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(buildUrl(path), {
    credentials: "include",
    ...options,
  });
  return handleResponse<T>(response);
}

export async function loginRequest(email: string, password: string): Promise<JwtResponse> {
  return apiFetch<JwtResponse>("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
}

export async function getDashboardSummary(token: string) {
  return apiFetch<ApiResponse<{ totalTransactions: number; totalAlerts: number; totalAccounts: number }>>("/api/analytics/summary", {
    headers: {
      "Content-Type": "application/json",
      ...authHeader(token),
    },
  });
}

export async function getAlerts(token: string) {
  return apiFetch<ApiResponse<Array<{ id: number; userId: number; transactionId: number; status: string; description: string; riskLevel: string }>>>("/api/alerts", {
    headers: {
      "Content-Type": "application/json",
      ...authHeader(token),
    },
  });
}

export async function getMyAccounts(token: string) {
  return apiFetch<ApiResponse<Array<{ id: number; accountNumber: string; balance: string; status: string; createdAt: string }>>>("/api/accounts", {
    headers: {
      "Content-Type": "application/json",
      ...authHeader(token),
    },
  });
}

export async function getAllAccounts(token: string) {
  return apiFetch<ApiResponse<Array<{ id: number; accountNumber: string; balance: string; status: string; createdAt: string }>>>("/api/accounts/all", {
    headers: {
      "Content-Type": "application/json",
      ...authHeader(token),
    },
  });
}

export async function getAccountHistory(token: string, accountId: number) {
  return apiFetch<ApiResponse<Array<{ id: number; accountId: number; type: string; amount: string; targetAccountId: number | null; status: string; timestamp: string }>>>(
    `/api/transactions/account/${accountId}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...authHeader(token),
      },
    }
  );
}

export async function getAllUsers(token: string) {
  return apiFetch<ApiResponse<Array<{ id: number; email: string; firstName: string; lastName: string }>>>("/api/users", {
    headers: {
      "Content-Type": "application/json",
      ...authHeader(token),
    },
  });
}

export async function adminCreateAccount(token: string, userId: number, initialDeposit: number) {
  return apiFetch<ApiResponse<{ id: number; accountNumber: string; balance: string; status: string; createdAt: string }>>("/api/accounts/admin/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(token),
    },
    body: JSON.stringify({ userId, initialDeposit }),
  });
}
