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
})();

/* One-time SW self-heal for phones stuck on a broken cached shell (no reinstall). */
(function () {
  var RECOVER = "hw-recover-v109";
  var TARGET_SHELL = "hw-shell-v109";
  var force = /[?&]hw-recover=1(?:&|$)/.test(location.search);

  try {
    if (!force && localStorage.getItem(RECOVER) === "done") return;
  } catch (e) {}

  if (!("serviceWorker" in navigator)) return;

  Promise.resolve()
    .then(function () {
      if (!("caches" in window)) return;
      return caches.keys().then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key.startsWith("hw-shell-") && key !== TARGET_SHELL;
            })
            .map(function (key) {
              return caches.delete(key);
            }),
        );
      });
    })
    .then(function () {
      return navigator.serviceWorker.getRegistration("/");
    })
    .then(function (reg) {
      if (!reg) {
        return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      }
      return reg.update().then(function () {
        return reg;
      });
    })
    .then(function (reg) {
      if (reg && reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      try {
        localStorage.setItem(RECOVER, "done");
      } catch (e) {}
      if (force && reg && (reg.waiting || reg.installing)) {
        location.reload();
      }
    })
    .catch(function () {
      try {
        localStorage.setItem(RECOVER, "done");
      } catch (e) {}
    });
})();
