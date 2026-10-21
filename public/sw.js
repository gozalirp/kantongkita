/* Service Worker untuk PWA SavingDuit (Offline-first & Installable) */
const CACHE_NAME = 'savingduit-v25-money-planner';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/util.js',
  './js/store.js',
  './js/gdrive.js',
  './js/keluarga-mode.js',
  './js/uiGerbang.js',
  './js/views.js',
  './js/app.js',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  // Hanya tangani request GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(function () {
      return caches.match(event.request).then(function (cached) {
        if (cached) return cached;
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});