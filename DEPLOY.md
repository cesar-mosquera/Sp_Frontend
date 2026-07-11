# Despliegue y arquitectura frontend/backend

Este frontend (Vite + React, desplegado en Vercel) y el backend (FastAPI u
similar, corriendo en una instancia EC2) viven en repos/infraestructura
separados. Esta guía documenta cómo están conectados hoy y qué hacer cuando
algo del lado del backend cambie.

## Cómo se conectan hoy

1. El frontend nunca llama directo a `http://<ip-backend>:5000` desde el
   navegador. Si lo hiciera, el navegador bloquearía la llamada por
   "mixed content" (la app se sirve por HTTPS, el backend solo habla HTTP).
2. En su lugar, `vercel.json` define **rewrites** que proxean rutas como
   `/api/*`, `/devices`, `/register_device`, `/docs`, etc. hacia el backend.
   Esto pasa en el edge de Vercel (servidor a servidor), no en el navegador,
   así que el mixed content no aplica ahí.
3. `VITE_API_URL` (variable de entorno en Vercel) está vacía a propósito, para
   que el frontend use rutas relativas (`/api/...`) que caen en esos
   rewrites, en vez de apuntar directo al backend.

## Si cambia la IP/host del backend

El origen del backend (`https://3.19.5.169.sslip.io` hoy) aparece **literalmente
repetido 11 veces** dentro de `vercel.json`, porque Vercel no soporta
interpolar variables de entorno dentro de sus reglas de `rewrites` (es JSON
estático, evaluado por su capa de enrutamiento, no por el build).

Para actualizarlo todo de una vez, sin tener que buscar manualmente cada
línea:

```bash
./scripts/update-backend-origin.sh https://3.19.5.169.sslip.io https://nuevo-origen.com
```

El script reemplaza todas las ocurrencias, verifica que el conteo cuadre, y
te recuerda hacer commit + push para que Vercel redeploye con las reglas
nuevas.

**Recomendación**: en vez de seguir apuntando a una IP cruda de EC2, asigna
una **Elastic IP** a la instancia (así no cambia si la reinicias) o mejor aún
un subdominio propio (`api.tudominio.com`) apuntando a esa IP por DNS. Así el
día que migres de instancia, solo actualizas el DNS — no vuelves a tocar
`vercel.json` para nada.

## Pendientes recomendados del lado del backend

Estos cambios no se pueden hacer desde este repo (viven en el backend), pero
quedan documentados acá porque afectan directamente la fiabilidad de esta
conexión:

- **TLS real en el backend.** Hoy el tráfico Vercel↔EC2 va sin cifrar por la
  red pública (incluye tokens de sesión, credenciales de dispositivos). Con
  un dominio propio (punto anterior) se puede poner Let's Encrypt/Caddy
  delante del backend.
- **Eliminar el "master key" estático como mecanismo de autorización de
  admin.** Hoy `X-Master-Key` es un valor fijo que vive en el JS público del
  frontend — cualquiera puede extraerlo del bundle y llamar los endpoints de
  admin sin loguearse. El backend debería validar el token de sesión
  (`X-Session-Token`) y el rol `admin` en cada endpoint privilegiado, no
  aceptar una clave estática.
- **Reinicio automático del proceso backend** (systemd, pm2, o
  `restart: always` en Docker) ante un crash u OOM kill.
- **Si algún día se corre más de una instancia del backend**, el mecanismo
  actual de SSE (difundido en memoria de un solo proceso) no escala
  horizontalmente: un cliente conectado a la instancia A nunca vería un
  evento emitido desde la instancia B. Para eso se necesitaría un bus de
  eventos compartido (Redis pub/sub u equivalente).
