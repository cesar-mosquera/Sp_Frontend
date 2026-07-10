import { describe, it, expect, beforeEach } from 'vitest';
import { handleAuthResponse } from '../utils/authResponse';
import { useAuthStore } from '../store';

describe('handleAuthResponse', () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: true, token: 'tok', role: 'admin', username: 'admin', deviceId: null });
  });

  it('cierra la sesion si la respuesta es 401', () => {
    const res = new Response('{}', { status: 401 });
    handleAuthResponse(res);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('no toca la sesion ante cualquier otro status', () => {
    for (const status of [200, 404, 500]) {
      useAuthStore.setState({ isAuthenticated: true, token: 'tok', role: 'admin', username: 'admin', deviceId: null });
      handleAuthResponse(new Response('{}', { status }));
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    }
  });

  it('devuelve la misma response para poder encadenar', () => {
    const res = new Response('{}', { status: 200 });
    expect(handleAuthResponse(res)).toBe(res);
  });
});
