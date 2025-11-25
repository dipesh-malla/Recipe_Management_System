// Service Worker: caches static assets and GET API requests.
// Strategy:
// - Static assets (CSS/JS/HTML/images): Cache First, with max-age control via SW and cache versioning.
// - API GET requests to /api or /v1: Stale-While-Revalidate (serve cached response immediately, update in background).
// - On activate: clean up old caches.

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-cache-${CACHE_VERSION}`;
const API_CACHE = `api-cache-${CACHE_VERSION}`;
const FALLBACK_HTML = '/offline.html'; // optionally provide an offline HTML in public

const STATIC_URLS = [
  '/',
  // You can add other known static routes to pre-cache (landing page, fonts, icons)
];

self.addEventListener('install', (event) => {
  // Pre-cache static assets shell. Keep fast install.
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_URLS.map((u) => new Request(u, { cache: 'reload' }))).catch(() => {
        // ignore failures
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== STATIC_CACHE && k !== API_CACHE).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Helper: is GET API request
function isApiGet(req) {
  try {
    if (req.method !== 'GET') return false;
    const url = new URL(req.url);
    return url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/') || url.pathname.startsWith('/messages') || url.pathname.startsWith('/notifications') || url.pathname.startsWith('/posts');
  } catch (e) {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // 1) API GET requests -> stale-while-revalidate from API_CACHE
  if (isApiGet(req)) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const networkFetch = fetch(req).then((res) => {
          // clone and put in cache (only if ok)
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => null);

        // Serve cached if available, otherwise wait for network
        return cached || networkFetch.then((r) => r || cached) || new Response(null, { status: 503 });
      })
    );
    return;
  }

  // 2) Static assets: try cache first, then network and update cache
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Only cache successful responses and same-origin resources
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        caches.open(STATIC_CACHE).then((cache) => cache.put(req, res.clone()));
        return res;
      }).catch(() => {
        // If fetch fails, optionally return fallback page/image
        if (req.destination === 'document') {
          return caches.match(FALLBACK_HTML);
        }
        return new Response(null, { status: 504 });
      });
    })
  );
});

// Optional: listen for messages to skipWaiting or clear caches
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHES') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});
