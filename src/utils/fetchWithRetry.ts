export interface FetchWithRetryOptions extends RequestInit {
  /** Numero de reintentos adicionales tras el primer intento fallido. */
  retries?: number;
  /** Retraso base en ms; crece exponencialmente entre reintentos. */
  retryDelayMs?: number;
  /** Tiempo maximo por intento antes de abortar. */
  timeoutMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrapper de fetch con timeout y reintentos con backoff exponencial.
 *
 * Solo reintenta ante fallos de red (backend inalcanzable, timeout) o
 * respuestas 5xx (error transitorio del servidor). Respuestas 4xx
 * (401, 403, 404, etc.) se devuelven tal cual en el primer intento,
 * porque son respuestas validas del servidor, no fallos transitorios.
 */
export async function fetchWithRetry(url: string, options: FetchWithRetryOptions = {}): Promise<Response> {
  const { retries = 2, retryDelayMs = 800, timeoutMs = 8000, signal: externalSignal, ...init } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener('abort', onExternalAbort);
    }
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
      if (response.status >= 500 && attempt < retries) {
        await sleep(retryDelayMs * Math.pow(2, attempt));
        continue;
      }
      return response;
    } catch (err) {
      clearTimeout(timer);
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
      lastError = err;
      // Si quien llama cancelo explicitamente (ej. unmount), no tiene sentido reintentar.
      if (externalSignal?.aborted) throw err;
      if (attempt < retries) {
        await sleep(retryDelayMs * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw lastError;
}
