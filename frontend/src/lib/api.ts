export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  // We can't import useAuthStore directly here in an async fetch utility cleanly if it relies on localStorage during SSR,
  // but we are running mostly on client side for this app.
  const authStorageStr = typeof window !== 'undefined' ? localStorage.getItem('phantom-draw-auth') : null;
  let token = null;
  
  if (authStorageStr) {
    try {
      const authStorage = JSON.parse(authStorageStr);
      token = authStorage?.state?.token;
    } catch (e) {}
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
    } catch (e) {}
    throw new Error(errorMsg);
  }

  return response.json();
}

export async function fetchAdminApi(endpoint: string, options: RequestInit = {}) {
  const authStorageStr = typeof window !== 'undefined' ? localStorage.getItem('phantom-draw-admin-auth') : null;
  let token = null;
  
  if (authStorageStr) {
    try {
      const authStorage = JSON.parse(authStorageStr);
      token = authStorage?.state?.token;
    } catch (e) {}
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
    } catch (e) {}
    throw new Error(errorMsg);
  }

  return response.json();
}
