import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  quota: number;
  multiplier: number;
  apiKey: string | null;
  setAuth: (token: string, apiKey: string, quota: number, multiplier?: number) => void;
  updateQuota: (quota: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      quota: 0,
      multiplier: 10,
      apiKey: null,
      setAuth: (token, apiKey, quota, multiplier = 10) =>
        set({ token, apiKey, quota, multiplier }),
      updateQuota: (quota) => set({ quota }),
      logout: () => set({ token: null, quota: 0, multiplier: 10, apiKey: null }),
    }),
    {
      name: 'phantom-draw-auth',
    }
  )
);
