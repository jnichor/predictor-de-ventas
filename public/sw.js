// Service Worker — Sistema de tienda
// Cache-first para assets estáticos de Next, network-first con fallback para navegación.
// Si querés actualizar la versión del cache, incrementá CACHE_VERSION.

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `tienda-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `tienda-runtime-${CACHE_VERSION}`;

// Assets que precacheamos al instalar (shell mínimo)
const PRECACHE_URLS = ['/login', '/dashboard'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.endsWith(CACHE_VERSION))
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo cacheamos GET same-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // API calls → siempre network (datos en vivo, no caché)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Assets de Next (/_next/static/*) → cache-first (son immutable por hash)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      }),
    );
    return;
  }

  // Navegación HTML → network-first con fallback a caché
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached ?? caches.match('/dashboard'))),
    );
    return;
  }

  // Otros recursos (imágenes, fonts) → stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
