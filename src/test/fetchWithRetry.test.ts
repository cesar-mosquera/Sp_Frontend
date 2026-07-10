import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from '../utils/fetchWithRetry';

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('devuelve la respuesta directamente si el primer intento es exitoso', async () => {
    const okResponse = new Response('{}', { status: 200 });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(okResponse);

    const res = await fetchWithRetry('/api/x', { retryDelayMs: 1 });

    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('no reintenta ante un 401 (respuesta valida del servidor)', async () => {
    const unauthorized = new Response('{}', { status: 401 });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(unauthorized);

    const res = await fetchWithRetry('/api/x', { retries: 3, retryDelayMs: 1 });

    expect(res.status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reintenta ante un 500 hasta agotar los intentos o tener exito', async () => {
    const serverError = new Response('{}', { status: 500 });
    const ok = new Response('{}', { status: 200 });
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(serverError)
      .mockResolvedValueOnce(serverError)
      .mockResolvedValueOnce(ok);

    const res = await fetchWithRetry('/api/x', { retries: 3, retryDelayMs: 1 });

    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('reintenta ante un fallo de red y finalmente propaga el error si nunca tiene exito', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchWithRetry('/api/x', { retries: 2, retryDelayMs: 1 })).rejects.toThrow('Failed to fetch');
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
