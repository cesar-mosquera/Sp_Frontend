import { useAuthStore } from '../store';

/**
 * Cierra la sesion si el backend confirma que el token ya no es valido.
 * Se usa envolviendo cualquier response de un endpoint autenticado, tanto
 * con fetch simple como con fetchWithRetry, sin condicionar su logica de
 * reintentos. Devuelve la misma response para poder seguir encadenando.
 */
export function handleAuthResponse(response: Response): Response {
  if (response.status === 401) {
    useAuthStore.getState().logout();
  }
  return response;
}
