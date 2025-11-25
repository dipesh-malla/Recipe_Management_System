/* RecipeShare Service Worker
   - Static cache-first for assets
   - API GET stale-while-revalidate
   - Offline fallback to /offline.html
*/

const STATIC_CACHE = 'rs-static-v1';
const API_CACHE = 'rs-api-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== API_CACHE) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

function isApiRequest(request) {
  try {
    const url = new URL(request.url);
    return url.pathname.startsWith('/api') || url.pathname.startsWith('/v1/');
  } catch (e) {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Handle navigation requests — serve index.html (SPA) or cached offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // API GET requests: stale-while-revalidate
  if (isApiRequest(request)) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) cache.put(request, networkRes.clone());
            return networkRes;
          })
          .catch(() => null);

        // Return cached immediately if present, otherwise wait for network
        return cached || networkPromise.then((res) => res || cached) ;
      })
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((res) => {
        // Put successful responses into static cache for future
        if (res && res.status === 200 && res.type !== 'opaque') {
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, res.clone()));
        }
        return res;
      }).catch(() => {
        // As a last resort for images return offline.html (or nothing)
        if (request.destination === 'image') {
          return caches.match('/offline.html');
        }
        return caches.match('/offline.html');
      })
    )
  );
});

// Listen for SKIP_WAITING messages from the page
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
