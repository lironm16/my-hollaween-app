const CACHE = "hw-shell-v28";
const TILE_CACHE = "hw-tiles-v3";
const PRECACHE = [
  "/catalog.json",
  "/manifest.webmanifest",
  "/shell.css",
  "/app.css",
  "/icon-192.png",
  "/icon-512.png",
  "/images/banner.jpg",
  "/images/pumpkin-marker.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE && key !== TILE_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req).catch(
        () =>
          new Response("לא מקוון", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
      ),
    );
    return;
  }

  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/__next") ||
    url.pathname.endsWith(".css") ||
    url.pathname === "/sw.js" ||
    url.pathname === "/boot.js" ||
    url.pathname === "/app.css" ||
    url.pathname.startsWith("/api/admin") ||
    url.pathname.startsWith("/api/houses") ||
    url.pathname.startsWith("/api/address") ||
    url.pathname.startsWith("/api/catalog")
  ) {
    return;
  }

  if (url.pathname === "/catalog.json") {
    event.respondWith(staleWhileRevalidate(req, CACHE));
    return;
  }

  if (
    url.hostname.includes("basemaps.cartocdn.com") ||
    url.hostname.includes("tile.openstreetmap.org")
  ) {
    event.respondWith(cacheFirst(req, TILE_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, CACHE));
  }
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => undefined);
  return cached || network || new Response("לא מקוון", { status: 503, statusText: "Offline" });
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}
