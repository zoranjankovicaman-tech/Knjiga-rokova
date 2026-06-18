// Knjiga Rokova — Service Worker v4
// Network-first za HTML, cache-first za ostale resurse

const CACHE = 'knjiga-rokova-v4';
const STATIC = [
  '/Knjiga-rokova/manifest.json',
  '/Knjiga-rokova/icon-192.png',
  '/Knjiga-rokova/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC.map(u => new Request(u, {mode:'no-cors'}))))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Firebase — uvek mreža
  if (url.hostname.includes('firebase') || url.hostname.includes('firebaseio')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status:503})));
    return;
  }

  // index.html — NETWORK FIRST
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Ostalo — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => null);
    })
  );
});
