const CACHE = "hw-shell-v34";
const TILE_CACHE = "hw-tiles-v3";
const PRECACHE = [
  "/offline.html",
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
    event.respondWith(navigation(req));
    return;
  }

  if (url.pathname === "/sw.js" || url.pathname === "/boot.js") {
    return;
  }

  if (url.pathname.startsWith("/api/admin") || url.pathname.startsWith("/api/houses") || url.pathname.startsWith("/api/address")) {
    return;
  }

  if (url.pathname.startsWith("/api/catalog") || url.pathname === "/catalog.json") {
    event.respondWith(networkFirst(req, CACHE));
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

async function navigation(request) {
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, res.clone());
      const path = new URL(request.url).pathname;
      if (path === "/" || path === "") cache.put("/", res.clone());
    }
    return res;
  } catch {
    const cache = await caches.open(CACHE);
    return (
      (await cache.match(request)) ||
      (await cache.match("/")) ||
      (await cache.match("/offline.html")) ||
      new Response(
        "<!doctype html><meta charset=utf-8><title>לא מקוון</title><p dir=rtl>אין קשר לשרת. פתחו את האפליקציה פעם אחת כשיש רשת כדי לשמור את רשימת הבתים בטלפון.</p>",
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
      )
    );
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (new URL(request.url).pathname === "/api/catalog") {
      const snap = await cache.match("/catalog.json");
      if (snap) return snap;
    }
    return new Response(JSON.stringify({ updatedAt: "", neighborhood: "", houses: [] }), {
      status: 503,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}

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
