const CACHE = 'fumi-v20260529c';
const BASE = self.location.pathname.replace('sw.js', '');
const ASSETS = [
  BASE, BASE + 'index.html', BASE + 'styles.css', BASE + 'manifest.json',
  BASE + 'js/storage.js', BASE + 'js/characters.js', BASE + 'js/notifications.js',
  BASE + 'js/notifList.js', BASE + 'js/timeline.js', BASE + 'js/reactions.js',
  BASE + 'js/app.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ナビゲーション（HTMLページ）はネットワーク優先、失敗時キャッシュ
// その他のアセット（JS/CSS）はキャッシュ優先
self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return r;
      }).catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
  }
});
