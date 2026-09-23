// Offline shell for Understory. Everything it reads is its own: the page, the
// engine and the two word lists. Nothing it analyzes ever leaves the device, so
// caching the shell is caching the whole instrument. The fonts come from
// Google and are cached by the browser, not here; offline, it falls back to
// the system serif and mono.
const CACHE = "understory-__VERSION__";
const SHELL = [
  "./", "./index.html", "./engine.js", "./lexicon.txt", "./lexicon-extra.txt",
  "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) {
        // Serve the cached copy now; refresh it so the next open is current.
        fetch(e.request).then((r) => r.ok && caches.open(CACHE).then((c) => c.put(e.request, r))).catch(() => {});
        return hit;
      }
      return fetch(e.request).catch(() => caches.match("./index.html"));
    }),
  );
});
