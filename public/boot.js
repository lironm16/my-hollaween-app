/* Kill a stale service worker that cached unstyled HTML. Public path so
   Preview iframes can run it even when Next.js blocks /_next/*. */
(function () {
  var flag = "hw-sw-bust-v28";
  try {
    if (sessionStorage.getItem(flag)) return;
  } catch (e) {}

  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.getRegistrations().then(function (regs) {
    return Promise.all(regs.map(function (reg) {
      return reg.unregister();
    })).then(function (results) {
      var had = results.some(Boolean);
      var clear = Promise.resolve();
      if ("caches" in window) {
        clear = caches.keys().then(function (keys) {
          had = had || keys.length > 0;
          return Promise.all(keys.map(function (key) {
            return caches.delete(key);
          }));
        });
      }
      return clear.then(function () {
        if (!had) return;
        try {
          sessionStorage.setItem(flag, "1");
        } catch (e) {}
        location.reload();
      });
    });
  });
})();
