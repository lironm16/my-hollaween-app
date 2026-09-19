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

/* Drop stale service workers left from broken builds (no reload loop). */
(function () {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistrations().then(function (regs) {
    regs.forEach(function (reg) {
      void reg.unregister();
    });
  });
})();
