import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminAuthState {
  token: string | null;
  username: string | null;
  role: string | null;
  setAdminAuth: (token: string, username: string, role: string) => void;
  logoutAdmin: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      role: null,
      setAdminAuth: (token, username, role) => set({ token, username, role }),
      logoutAdmin: () => set({ token: null, username: null, role: null }),
    }),
    {
      name: 'phantom-draw-admin-auth',
    }
  )
);
