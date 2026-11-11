// Offline play for the web version. The page is fetched fresh when there is a network and from the cache when
// there is none; every other file of the game is served from the cache once it has been loaded.
// shortcut: files whose name never changes (fonts, icon) are never refreshed; bump CACHE when one of them changes.
const CACHE = "game-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request);
      const fresh = () =>
        fetch(e.request).then((r) => {
          if (r.ok) cache.put(e.request, r.clone());
          return r;
        });
      if (e.request.mode === "navigate") return fresh().catch(() => cached ?? cache.match("./"));
      return cached ?? fresh();
    }),
  );
});
