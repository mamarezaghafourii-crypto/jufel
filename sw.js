// نسخه را با هر تغییر در فایل‌ها یکی بالا ببر تا آیفون نسخه‌ی تازه را بگیرد
const CACHE = 'jufel-v4';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'flowers.js', 'manifest.webmanifest',
  'fonts/Vazirmatn.woff2', 'icons/apple-touch-icon.png', 'icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // درخواست‌های گوگل شیت از کش رد نمی‌شوند
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
