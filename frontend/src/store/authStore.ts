import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  quota: number;
  apiKey: string | null;
  setAuth: (token: string, apiKey: string, quota: number) => void;
  updateQuota: (quota: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      quota: 0,
      apiKey: null,
      setAuth: (token, apiKey, quota) => set({ token, apiKey, quota }),
      updateQuota: (quota) => set({ quota }),
      logout: () => set({ token: null, quota: 0, apiKey: null }),
    }),
    {
      name: 'phantom-draw-auth',
    }
  )
);
