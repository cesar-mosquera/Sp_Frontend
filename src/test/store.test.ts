import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: false, token: null, role: null, username: null, deviceId: null });
  });

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.role).toBe(null);
  });

  it('loginAsAdmin sets admin role', () => {
    useAuthStore.getState().loginAsAdmin();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().role).toBe('admin');
  });

  it('loginAsUser sets user role and token', () => {
    useAuthStore.getState().loginAsUser('my-token', 'client1', 'dev-123');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().role).toBe('user');
    expect(useAuthStore.getState().token).toBe('my-token');
  });

  it('logout clears auth state', () => {
    useAuthStore.getState().loginAsAdmin();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().role).toBe(null);
  });
});
