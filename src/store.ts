import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  role: 'admin' | 'user' | null;
  username: string | null;
  deviceId: string | null;
  loginAsAdmin: () => void;
  loginAsUser: (token: string, username: string, deviceId: string, role?: 'admin' | 'user') => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      role: null,
      username: null,
      deviceId: null,
      loginAsAdmin: () => set({ 
        isAuthenticated: true, 
        role: 'admin', 
        token: null, 
        username: 'admin',
        deviceId: null
      }),
  loginAsUser: (token: string, username: string, deviceId: string, role?: 'admin' | 'user') => set({ 
    isAuthenticated: true, 
    role: role ?? 'user', 
    token, 
    username,
    deviceId 
  }),
      logout: () => set({ 
        isAuthenticated: false, 
        token: null, 
        role: null, 
        username: null,
        deviceId: null 
      }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
