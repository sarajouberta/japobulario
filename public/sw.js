/* SERVICE WORKER: pantalla de espera mientras el servidor de Render despierta.
   El plan gratuito de Render duerme el servidor tras ~15 min sin visitas, y la primera carga tarda
   30-50 s. Mientras tanto la página se quedaría en blanco. Para evitarlo:
   - Al instalarse, guarda en caché la pantalla de espera (/waking) y el logo.
   - Al abrir una página: si el servidor no responde en WAIT_MS, enseña la pantalla de espera, que
     pregunta a /ping cada poco y recarga la página en cuanto el servidor contesta.
   - Las respuestas de la app llevan la cabecera X-Japobulario (app.js): si una respuesta no la
     tiene, no viene de la app (p. ej. una página de aviso de Render) y también se enseña la espera.
   Solo actúa al abrir páginas (GET) y con el logo; los css, js, imágenes y formularios van a la red.
   Se instala en la primera visita, así que la pantalla de espera sale a partir de la segunda. */

//al cambiar /waking o el logo, subir la versión para que se vuelvan a guardar
const CACHE = 'japobulario-v2';
const WAKING_URL = '/waking';
const LOGO_URL = '/icons/icon-192.png';
const WAIT_MS = 4000;  //lo que se espera al servidor antes de enseñar la pantalla de espera

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll([WAKING_URL, LOGO_URL]))
      .then(() => self.skipWaiting())  //la versión nueva se activa sin esperar a cerrar las pestañas
  );
});

//borrar las cachés de versiones anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  //el logo de la pantalla de espera sale de la caché (con el servidor dormido no llegaría)
  if (new URL(request.url).pathname === LOGO_URL) {
    event.respondWith(caches.match(LOGO_URL).then((cached) => cached || fetch(request)));
    return;
  }
  if (request.mode !== 'navigate') return;  //css, js, datos...: sin tocar
  event.respondWith(openPage(request));
});

//cuándo se enseñó la pantalla de espera por última vez
let wakingShownAt = 0;

async function openPage(request) {
  const network = fetch(request)
    .then((response) => (response.headers.has('X-Japobulario') ? response : null))
    .catch(() => null);  //sin conexión: también la pantalla de espera, que entra cuando vuelva

  //justo después de la pantalla de espera el servidor ya contestó a /ping: se le espera lo que haga
  //falta, sin límite de tiempo (si no, una página lenta volvería a la espera una y otra vez)
  const justWoken = Date.now() - wakingShownAt < 2 * 60 * 1000;
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), WAIT_MS));
  const response = await (justWoken ? network : Promise.race([network, timeout]));
  if (response) return response;

  const waking = await caches.match(WAKING_URL);
  if (!waking) return fetch(request);  //sin la pantalla guardada, se espera a la red sin más
  wakingShownAt = Date.now();
  return waking;
}
