const CACHE_NAME = 'password-manager-v1';
const ASSETS = [
  '/',
  '/static/css/style.css',
  '/static/logo.png',
  '/static/js/auth.js',
  '/static/js/pin.js',
  '/static/js/profile.js',
  '/static/js/admin.js',
  '/static/js/categories.js',
  '/static/js/entries.js',
  '/static/js/export.js',
  '/static/js/app.js'
];

// Install — cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch — network-first for API, cache-first for static
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls — network only
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});
