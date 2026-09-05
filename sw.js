// Service Worker for مؤسسة الفتح (El Feth)
const CACHE_NAME = 'merchant-ledger-v2';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Always try fresh network fetch first to prevent caching old UI
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
