// 離線快取：先回快取，同時背景更新（下次開啟就是新版）
const CACHE = 'gz70-v5';
const ASSETS = [
  './',
  './index.html',
  './dmgz.html',
  './pengz.html',
  './penc.html',
  './dm20.html',
  './app.css',
  './app.js',
  './data/dmgz.js',
  './data/pengz.js',
  './data/penc.js',
  './data/dm20.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const network = fetch(e.request)
      .then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; })
      .catch(() => cached);
    if (cached) { e.waitUntil(network); return cached; }
    return network;
  }));
});
