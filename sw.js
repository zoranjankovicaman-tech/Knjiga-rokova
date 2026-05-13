// Knjiga Rokova — Service Worker v1
const CACHE = 'knjiga-rokova-v1';
const STATIC = [
  '/Knjiga-rokova/',
  '/Knjiga-rokova/index.html',
  '/Knjiga-rokova/manifest.json',
  '/Knjiga-rokova/icon-192.png',
  '/Knjiga-rokova/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@300;400;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC.map(u => new Request(u, {mode:'no-cors'}))))
      .catch(() => {}) // ne blokiraj install ako CDN ne odgovori
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
  // Firebase i Google Fonts API — uvek mreža
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis.com') && url.pathname.includes('css')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('', {status: 503}))
    );
    return;
  }
  // Sve ostalo — keš prvo, pa mreža
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/Knjiga-rokova/'));
    })
  );
});
