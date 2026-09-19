/* Kill a stale service worker that cached unstyled HTML. Public path so
   Preview iframes can run it even when Next.js blocks /_next/*. */
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
})();

(function () {
  var flag = "hw-sw-bust-v106";
  var currentShell = "hw-shell-v107";
  try {
    if (localStorage.getItem(flag)) return;
  } catch (e) {}

  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.getRegistrations().then(function (regs) {
    return Promise.all(
      regs.map(function (reg) {
        return reg.unregister();
      }),
    ).then(function (results) {
      var had = results.some(Boolean);
      if (!("caches" in window)) {
        if (had) markAndReload(flag);
        return;
      }
      return caches.keys().then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key.startsWith("hw-shell-") && key !== currentShell;
            })
            .map(function (key) {
              had = true;
              return caches.delete(key);
            }),
        ).then(function () {
          if (!had) {
            try {
              localStorage.setItem(flag, "1");
            } catch (e) {}
            return;
          }
          markAndReload(flag);
        });
      });
    });
  });

  function markAndReload(flag) {
    try {
      localStorage.setItem(flag, "1");
    } catch (e) {}
    location.reload();
  }
})();
