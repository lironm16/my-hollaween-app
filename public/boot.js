/* Viewport height sync for mobile browsers / PWA safe areas. */
(function () {
  function syncAppH() {
    var vv = window.visualViewport;
    var h = vv ? vv.height : window.innerHeight;
    var inset = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    var root = document.documentElement;
    root.style.setProperty("--app-h", Math.round(h) + "px");
    root.style.setProperty("--vv-bottom-inset", Math.round(inset) + "px");
  }
  syncAppH();
  window.addEventListener("resize", syncAppH);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncAppH);
    window.visualViewport.addEventListener("scroll", syncAppH);
  }

  /* v110: service worker cached blank map tiles — purge SW + all hw-* caches once. */
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      for (var i = 0; i < regs.length; i++) {
        regs[i].unregister();
      }
    });
  }
  if ("caches" in window) {
    caches.keys().then(function (keys) {
      keys.forEach(function (key) {
        if (key.indexOf("hw-") === 0) caches.delete(key);
      });
    });
  }
})();
