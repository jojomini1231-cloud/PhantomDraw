import { fetchAdminApi } from "@/lib/api";

export type AccountType = "Free" | "Plus" | "Pro" | "Team";
export type AccountStatus = "正常" | "限流" | "异常" | "禁用";

export type Account = {
  id: string;
  accessToken: string;
  type: AccountType;
  status: AccountStatus;
  quota: number;
  email?: string | null;
  userId?: string | null;
  limitsProgress?: Array<Record<string, unknown>>;
  defaultModelSlug?: string | null;
  restoreAt?: string | null;
  success: number;
  fail: number;
  lastUsedAt: string | null;
};

type AccountListResponse = {
  items: Account[];
};

type AccountMutationResponse = {
  items: Account[];
  added?: number;
  skipped?: number;
  removed?: number;
  refreshed?: number;
  errors?: Array<{ access_token: string; error: string }>;
};

export async function fetchAccounts() {
  return fetchAdminApi<AccountListResponse>("/admin/accounts");
}

export async function createAccounts(tokens: string[]) {
  return fetchAdminApi<AccountMutationResponse>("/admin/accounts", {
    method: "POST",
    body: JSON.stringify({ tokens }),
  });
}

export async function deleteAccounts(tokens: string[]) {
  return fetchAdminApi<AccountMutationResponse>("/admin/accounts", {
    method: "DELETE",
    body: JSON.stringify({ tokens }),
  });
}

export async function refreshAccounts(accessTokens: string[]) {
  return fetchAdminApi<AccountMutationResponse>("/admin/accounts/refresh", {
    method: "POST",
    body: JSON.stringify({ tokens: accessTokens }),
  });
}

export async function updateAccount(
  accessToken: string,
  updates: {
    type?: AccountType;
    status?: AccountStatus;
    quota?: number;
  }
) {
  return fetchAdminApi<{ items: Account[] }>(`/admin/accounts/${accessToken}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}
