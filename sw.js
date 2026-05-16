// Knjiga Rokova — Service Worker v2
// Network-first za HTML, cache-first za ostale resurse

const CACHE = 'knjiga-rokova-v2';
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
  self.skipWaiting(); // odmah aktiviraj novu verziju
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

  // Firebase — uvek mreža (nikad keš)
  if (url.hostname.includes('firebase') || url.hostname.includes('firebaseio')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status:503})));
    return;
  }

  // index.html — NETWORK FIRST (uvek provjeri novu verziju)
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.ok) {
            // Sačuvaj novu verziju u keš
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request)) // fallback na keš ako nema interneta
    );
    return;
  }

  // Sve ostalo — CACHE FIRST (keš, pa mreža)
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
