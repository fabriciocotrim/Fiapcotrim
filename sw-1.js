// Service Worker — Vestibulares 2026/2 Cronograma
// Estratégia:
// - network-first para o app principal (HTML): sempre busca a versão mais nova,
//   cai pro cache se offline. Isso permite atualizações automáticas.
// - cache-first para o resto (ícones, fontes Google): mais rápido, atualiza sob demanda.

const CACHE = 'vest-cronograma-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Network-first para navegação e index.html
  const isAppHtml =
    req.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html');

  if (isAppHtml) {
    e.respondWith(
      fetch(req)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
          return resp;
        })
        .catch(() =>
          caches.match(req).then(r => r || caches.match('./index.html') || caches.match('./'))
        )
    );
    return;
  }

  // Cache-first para tudo o mais
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        if (resp && resp.ok && (resp.type === 'basic' || resp.type === 'cors')) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
