/* Viewport height sync for mobile browsers / PWA safe areas. */
(function () {
  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean(window.navigator.standalone)
    );
  }

  function syncAppH() {
    var vv = window.visualViewport;
    var h = vv ? vv.height : window.innerHeight;
    var top = vv ? vv.offsetTop : 0;
    var inset = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    var root = document.documentElement;
    root.style.setProperty("--app-h", Math.round(h) + "px");
    root.style.setProperty("--vv-top-offset", Math.round(top) + "px");
    root.style.setProperty("--vv-bottom-inset", Math.round(inset) + "px");
  }

  if (!isStandalone()) {
    document.documentElement.classList.add("hw-mobile-browser");
  }

  syncAppH();
  window.addEventListener("resize", syncAppH);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncAppH);
    window.visualViewport.addEventListener("scroll", syncAppH);
  }
})();
