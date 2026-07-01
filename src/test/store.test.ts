import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: false, password: '' });
  });

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.password).toBe('');
  });

  it('login with correct password sets authenticated', () => {
    const pw = import.meta.env.VITE_DASHBOARD_KEY ?? 'DashK3y_SpyFront_2026_Secure!';
    useAuthStore.getState().login(pw);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('login with wrong password stays unauthenticated', () => {
    useAuthStore.getState().login('wrong');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('logout clears auth state', () => {
    const pw = import.meta.env.VITE_DASHBOARD_KEY ?? 'DashK3y_SpyFront_2026_Secure!';
    useAuthStore.getState().login(pw);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().password).toBe('');
  });
});
