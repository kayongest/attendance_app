/* aBility Manager — Service Worker (Offline Shell + Static Asset Cache) */
const CACHE_NAME = 'ability-pwa-v20261122-28';
const CORE_ASSETS = [
  './styles.css?v=20261122_v28',
  './app.js?v=20261122_v28',
  './assets/vendor/qrcode.js',
  './assets/vendor/driver/driver.css',
  './assets/vendor/driver/driver.js.iife.js',
  './assets/rwanda-events-logo.png',
  './assets/brand-mark.svg',
  './assets/nav-overview-active.svg',
  './assets/nav-overview-inactive.svg',
  './assets/nav-events-active.svg',
  './assets/nav-events-inactive.svg',
  './assets/nav-attendees-active.svg',
  './assets/nav-attendees-inactive.svg',
  './assets/nav-team-members.svg',
  './assets/nav-settings.svg',
  './assets/scan-line-13.svg',
  './assets/sliders-horizontal-13.svg',
  './assets/icons/favicon-64.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon-180.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (!req || req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache dynamic API writes or auth endpoints
  if (url.pathname.endsWith('/api.php') || url.pathname.endsWith('api.php')) {
    return;
  }

  // Network-First for HTML/PHP documents so session state & branding update live
  if (req.mode === 'navigate' || url.pathname.endsWith('.php') || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // Cache-First with background refresh for static assets (CSS, JS, SVG, PNG, Fonts)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
