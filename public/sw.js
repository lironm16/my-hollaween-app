importScripts("/sw-map-tiles.js");

const APP_VERSION = "0.1.131";
const CACHE = "hw-shell-0.1.131";
const TILE_CACHE = MapTileCache.TILE_CACHE;
const PRECACHE = [
  "/offline.html",
  "/catalog.json",
  "/shell.css",
  "/app.css",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-192-maskable.png",
  "/icon-512-maskable.png",
  "/icon-ios-192.png",
  "/icon-ios-512.png",
  "/apple-touch-icon.png",
  "/apple-touch-icon-167.png",
  "/apple-touch-icon-152.png",
  "/icons/brand-mark.png",
  "/icons/pin-candy.png",
  "/icons/pin-scare-mild.png",
  "/images/banner.jpg",
  "/images/pumpkin-marker.png",
  "/images/stubs/pumpkin-porch.jpg",
  "/images/stubs/purple-lights.jpg",
  "/images/stubs/skeleton-yard.jpg",
  "/images/stubs/spider-door.jpg",
  "/images/stubs/graveyard-lawn.jpg",
  "/images/stubs/witch-cauldron.jpg",
  "/images/stubs/candy-bowl.jpg",
  "/images/stubs/green-monster.jpg",
  "/images/stubs/ghost-trees.jpg",
  "/images/stubs/lantern-path.jpg",
  "/images/stubs/black-cat.jpg",
  "/images/stubs/bats-moon.jpg",
  "/gem-monsters/dragon-poster.png",
  "/gem-monsters/pumpkin-poster.png",
  "/gem-monsters/ghost-poster.png",
];

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "MAP_TILE_BOUNDS") {
    MapTileCache.setConfig(event.data);
  }
  if (event.data?.type === "PRECACHE_SHELL") {
    event.waitUntil(precacheShell());
  }
});

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

  if (url.pathname === "/sw.js" || url.pathname === "/boot.js" || url.pathname === "/sw-map-tiles.js") {
    return;
  }

  /* Version probe must always hit the network — never serve a stale semver from cache. */
  if (url.pathname === "/app-version.txt") {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req, CACHE));
    return;
  }

  if (url.pathname.startsWith("/_next/")) {
    return;
  }

  if (url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/catalog")) {
    return;
  }

  if (
    url.pathname.startsWith("/api/catalog") ||
    url.pathname === "/catalog.json" ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(networkFirst(req, CACHE));
    return;
  }

  if (MapTileCache.isMapTileHost(url.hostname)) {
    if (MapTileCache.shouldCacheUrl(url)) {
      event.respondWith(MapTileCache.respondWithCachedTile(req));
    }
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, CACHE));
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "HallowHood", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {
    try {
      const text = event.data && event.data.text();
      if (text) data.body = text;
    } catch (__) {
      /* ignore */
    }
  }
  const title = data.title || "HallowHood";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      lang: "he",
      dir: "rtl",
      tag: data.topic === "admin" ? "admin-broadcast" : "hw-alert",
      renotify: true,
      vibrate: [180, 90, 180],
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) return client.navigate(target);
          return undefined;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    }),
  );
});

/** Cache home HTML after a successful online visit so reopen works offline. */
async function precacheShell() {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch("/");
    if (res && res.ok) {
      await cache.put("/", res.clone());
      await cache.put(new Request("/"), res.clone());
    }
  } catch {
    /* offline */
  }
}

async function cachedDocument(cache, request) {
  const matched = await cache.match(request);
  if (matched) return matched;
  const path = new URL(request.url).pathname;
  if (path === "/" || path === "") return cache.match("/");
  return undefined;
}

async function offlineDocument(cache) {
  return (
    (await cache.match("/offline.html")) ||
    new Response(
      "<!doctype html><meta charset=utf-8><title>לא מקוון</title><p dir=rtl>אין קשר לשרת. פתחו את האפליקציה פעם אחת כשיש רשת כדי לשמור את רשימת הבתים בטלפון.</p>",
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
    )
  );
}

function isPreviewNavigation(url) {
  const path = url.pathname;
  return path === "/preview" || path.startsWith("/preview/");
}

function isHelpNavigation(url) {
  return url.pathname === "/help" || url.pathname.startsWith("/help/");
}

/** Help Q&A must always prefer fresh HTML — stale chips/instructions confuse users after deploy. */
async function networkFirstDocument(request, cache) {
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      await cache.put(request, res.clone());
      const path = new URL(request.url).pathname;
      if (path === "/" || path === "") await cache.put("/", res.clone());
      return res;
    }
  } catch {
    /* fall through */
  }

  const cached = await cachedDocument(cache, request);
  if (cached) return cached;
  return offlineDocument(cache);
}

/** Cache-first for HTML: instant PWA reopen; refresh in background when online. */
async function navigation(request) {
  const url = new URL(request.url);

  if (isHelpNavigation(url)) {
    const cache = await caches.open(CACHE);
    return networkFirstDocument(request, cache);
  }

  if (isPreviewNavigation(url)) {
    try {
      const res = await fetch(request);
      if (res && res.ok) return res;
    } catch {
      /* fall through */
    }
    const cache = await caches.open(CACHE);
    return offlineDocument(cache);
  }

  const cache = await caches.open(CACHE);
  const cached = await cachedDocument(cache, request);

  const refresh = fetch(request)
    .then(async (res) => {
      if (res && res.ok) {
        await cache.put(request, res.clone());
        const path = new URL(request.url).pathname;
        if (path === "/" || path === "") await cache.put("/", res.clone());
      }
      return res;
    })
    .catch(() => null);

  if (cached) {
    void refresh;
    return cached;
  }

  try {
    const res = await refresh;
    if (res && res.ok) return res;
  } catch {
    /* fall through */
  }

  return offlineDocument(cache);
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    if (res && res.ok) return res;
  } catch {
    /* fall through */
  }
  const cached = await cache.match(request);
  if (cached) return cached;
  if (new URL(request.url).pathname === "/api/catalog") {
    const snap = await cache.match("/catalog.json");
    if (snap) return snap;
  }
  return new Response(JSON.stringify({ updatedAt: "", neighborhood: "", houses: [] }), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
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
  if (cached) {
    void network;
    return cached;
  }
  const res = await network;
  if (res) return res;
  return new Response("לא מקוון", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      cache.put(request, res.clone());
      return res;
    }
  } catch {
    /* fall through */
  }
  return cached || new Response("", { status: 200, headers: { "Content-Type": "application/javascript" } });
}
