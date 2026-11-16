/* Taller Torque: funciona sin internet una vez instalado. */
const CACHE = 'taller-torque-v7';
const FILES = ['./', './index.html', './estilos.css', './datos.js', './motor.js', './audio.js', './dibujo.js', './lib/three.min.js',
  './render3d.js', './negocio.js', './carrera.js', './mundo.js', './juego.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
