/* Wedding Ops service worker.
   Precache the shell, cache-first for static assets, network-first for pages with a
   cached fallback, so the app opens with no connection. */
const CACHE = 'wedding-ops-v3';
const ROUTES = [
  './',
  './tasks/',
  './guests/',
  './invitations/',
  './more/',
  './more/settings/',
  './more/backup/',
  './more/storage/',
  './more/about/',
  './more/vendors/',
  './more/expenses/',
  './more/message-template/',
];
const FONTS = ['./fonts/serif.ttf', './fonts/sans.ttf', './fonts/serif-italic.ttf'];
const PRECACHE = [...ROUTES, ...FONTS, './offline.html', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          return (
            (await cache.match(request)) ||
            (await cache.match('./')) ||
            (await cache.match('./offline.html')) ||
            new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
          );
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => new Response('', { status: 504 }));
    })
  );
});
