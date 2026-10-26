// Offline support. App files are cached on first visit; the church list and pages
// try the network first and fall back to the saved copy. Only this site's own files
// are cached: nothing from other sites, and nothing personal.
const VERSION = "v1";
const CACHE = "mcc-" + VERSION;
const CORE = ["/", "/data/places.json", "/manifest.webmanifest", "/icon.svg", "/icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/assets/")) {
    // Hashed file names never change, so the cached copy is always right.
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const copy = res.clone(); if (res.ok) caches.open(CACHE).then(c => c.put(req, copy)); return res; })));
    return;
  }
  const key = req.mode === "navigate" ? "/" : req;
  e.respondWith(fetch(req).then(res => { const copy = res.clone(); if (res.ok) caches.open(CACHE).then(c => c.put(key, copy)); return res; })
    .catch(() => caches.match(key).then(hit => hit || Response.error())));
});
