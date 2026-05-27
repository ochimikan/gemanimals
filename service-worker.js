// キラキラほうせきどうぶつ Service Worker
const CACHE_VERSION = 'v1';
const CACHE_NAME = 'gemanimals-' + CACHE_VERSION;

// インストール時にプリキャッシュするファイル
const PRECACHE_FILES = [
  './',
  './index.html',
  './game.js',
  './data.js',
  './manifest.json',
  // 動物本体
  './img/usagi.png',
  './img/neko.png',
  './img/hiyoko.png',
  './img/kuma.png',
  './img/kitsune.png',
  './img/shika.png',
  './img/pengin.png',
  './img/hamu.png',
  './img/azarashi.png',
  './img/panda.png',
  // 宝石パーツ (10動物 × 3)
  './img/usagi001.png','./img/usagi002.png','./img/usagi003.png',
  './img/neko001.png','./img/neko002.png','./img/neko003.png',
  './img/hiyoko001.png','./img/hiyoko002.png','./img/hiyoko003.png',
  './img/kuma001.png','./img/kuma002.png','./img/kuma003.png',
  './img/kitsune001.png','./img/kitsune002.png','./img/kitsune003.png',
  './img/kojika001.png','./img/kojika002.png','./img/kojika003.png',
  './img/pengin001.png','./img/pengin002.png','./img/pengin003.png',
  './img/hamu001.png','./img/hamu002.png','./img/hamu003.png',
  './img/azarashi001.png','./img/azarashi002.png','./img/azarashi003.png',
  './img/panda001.png','./img/panda002.png','./img/panda003.png',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // 失敗してもインストール継続 (個別にfetch)
      Promise.allSettled(PRECACHE_FILES.map(url =>
        fetch(url, { cache: 'no-cache' })
          .then(res => res.ok ? cache.put(url, res) : null)
          .catch(() => null)
      ))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// stale-while-revalidate 風: キャッシュがあれば即返し、裏で更新
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // chrome-extension などは無視
  if (!['http:','https:'].includes(url.protocol)) return;

  e.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(res => {
          // ok or opaque(CORS) のみキャッシュ
          if (res && (res.ok || res.type === 'opaque')) {
            cache.put(e.request, res.clone()).catch(() => {});
          }
          return res;
        }).catch(() => cached);
        // キャッシュがあれば即返し、なければネット待ち
        return cached || networkFetch;
      })
    )
  );
});
