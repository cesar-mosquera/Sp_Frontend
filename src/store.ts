import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  password: string;
  login: (pass: string) => void;
  logout: () => void;
}

const ADMIN_PASSWORD = import.meta.env.VITE_DASHBOARD_KEY ?? 'DashK3y_SpyFront_2026_Secure!';

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  password: '',
  login: (pass: string) => set({ isAuthenticated: pass === ADMIN_PASSWORD, password: pass }),
  logout: () => set({ isAuthenticated: false, password: '' }),
}));
