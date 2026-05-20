export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api';

function getApiOrigin() {
  const fallbackOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3005';

  try {
    return new URL(API_URL, fallbackOrigin).origin;
  } catch {
    return fallbackOrigin;
  }
}

export function resolveAssetUrl(imageUrl?: string | null) {
  if (!imageUrl) return null;

  if (imageUrl.startsWith('/api/generate/assets/')) {
    return `${getApiOrigin()}${imageUrl}`;
  }

  try {
    const parsedUrl = new URL(imageUrl);
    if (parsedUrl.pathname.startsWith('/api/generate/assets/')) {
      return `${getApiOrigin()}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }
  } catch {
    return imageUrl;
  }

  return imageUrl;
}

type AuthScope = 'user' | 'admin';

function getStorageKey(scope: AuthScope) {
  return scope === 'admin' ? 'phantom-draw-admin-auth' : 'phantom-draw-auth';
}

function getLoginPath(scope: AuthScope) {
  return scope === 'admin' ? '/admin/login' : '/login';
}

function isLoginRequest(scope: AuthScope, endpoint: string) {
  if (scope === 'admin') {
    return endpoint === '/admin/login';
  }

  return endpoint === '/auth/login' || endpoint === '/auth/generate-key';
}

let isRedirectingAfterUnauthorized = false;

function redirectToLoginAfterUnauthorized(scope: AuthScope, endpoint: string) {
  if (typeof window === 'undefined' || isLoginRequest(scope, endpoint)) return;

  localStorage.removeItem(getStorageKey(scope));

  const loginPath = getLoginPath(scope);
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (window.location.pathname === loginPath) return;

  if (isRedirectingAfterUnauthorized) return;
  isRedirectingAfterUnauthorized = true;

  window.location.replace(`${loginPath}?redirect=${encodeURIComponent(currentPath)}`);
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  // We can't import useAuthStore directly here in an async fetch utility cleanly if it relies on localStorage during SSR,
  // but we are running mostly on client side for this app.
  const authStorageStr = typeof window !== 'undefined' ? localStorage.getItem('phantom-draw-auth') : null;
  let token = null;
  
  if (authStorageStr) {
    try {
      const authStorage = JSON.parse(authStorageStr);
      token = authStorage?.state?.token;
    } catch { /* ignore parse errors */ }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || errorMsg;
    } catch { /* ignore parse errors */ }
    if (response.status === 401) {
      redirectToLoginAfterUnauthorized('user', endpoint);
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAdminApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const authStorageStr = typeof window !== 'undefined' ? localStorage.getItem('phantom-draw-admin-auth') : null;
  let token = null;
  
  if (authStorageStr) {
    try {
      const authStorage = JSON.parse(authStorageStr);
      token = authStorage?.state?.token;
    } catch { /* ignore parse errors */ }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || errorMsg;
    } catch { /* ignore parse errors */ }
    if (response.status === 401) {
      redirectToLoginAfterUnauthorized('admin', endpoint);
    }
    throw new Error(errorMsg);
  }

  return response.json();
}
