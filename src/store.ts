import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  password: string;
  login: (pass: string) => void;
  logout: () => void;
}

const ADMIN_PASSWORD = '0504319310_cesar';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      password: '',
      login: (pass: string) => set({ isAuthenticated: pass === ADMIN_PASSWORD, password: pass }),
      logout: () => set({ isAuthenticated: false, password: '' }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
