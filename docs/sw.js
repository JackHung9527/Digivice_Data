// 離線快取：先回快取，同時背景更新（下次開啟就是新版）
const CACHE = 'gz70-v10';
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

// Google 字型另外放一個快取，換版本時不刪（字型檔網址含版本，不會變舊）
const FONT_CACHE = 'gz-fonts-v1';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// 字型 CSS 是 no-cors 請求，回應是不透明的（status 0、ok 為 false），也要存
const storable = res => res.ok || res.type === 'opaque';
function fontFetch(e) {
  const css = new URL(e.request.url).hostname === 'fonts.googleapis.com';
  e.respondWith(caches.open(FONT_CACHE).then(async cache => {
    const cached = await cache.match(e.request);
    // 字型檔（gstatic）網址不會變，有快取就直接用；CSS 先回快取、背景更新
    if (cached && !css) return cached;
    const network = fetch(e.request)
      .then(res => { if (storable(res)) cache.put(e.request, res.clone()); return res; })
      .catch(() => cached || Response.error());
    if (cached) { e.waitUntil(network); return cached; }
    return network;
  }));
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (FONT_HOSTS.includes(url.hostname)) { fontFetch(e); return; }
  if (url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const network = fetch(e.request)
      .then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; })
      .catch(() => cached);
    if (cached) { e.waitUntil(network); return cached; }
    return network;
  }));
});
