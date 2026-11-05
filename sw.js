/* Evidencias D29 · service worker: la app abre aunque no haya señal.
   La página se busca primero en internet (para tener siempre la última versión) y, si no hay señal,
   se usa la copia guardada. Las librerías se guardan en el teléfono. El servicio de Google nunca se guarda. */
const CACHE = 'd29-v2026-11-04';
const LOCALES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const LIBRERIAS = [
  'https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(LOCALES).catch(() => {});
    await Promise.all(LIBRERIAS.map(async u => {
      try { const r = await fetch(new Request(u, { mode: 'no-cors' })); await c.put(u, r); } catch (err) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Servicio de Google (datos y fotos): siempre por internet
  if (/script\.google(usercontent)?\.com$|drive\.google\.com$|googleusercontent\.com$/.test(url.hostname)) return;

  // Librerías: primero la copia guardada
  if (LIBRERIAS.includes(req.url)) {
    e.respondWith(caches.match(req.url).then(r => r || fetch(req).then(res => { caches.open(CACHE).then(c => c.put(req.url, res.clone())); return res; })));
    return;
  }
  // Archivos de la app (mismo sitio): primero internet, si no hay señal la copia guardada
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return res;
    }).catch(async () => (await caches.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
  }
});
