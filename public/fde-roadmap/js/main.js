/* 引导 + A5 滚动接管 + 导航状态
 *
 * A5（docs/03-参考库.md M-5）：progress 用 lerp 0.12 平滑，
 * 直接拿 scrollY 驱动会跟着滚轮一顿一顿，加了这层惯性才像「页面跟着你走」。
 * Hero 的四板剪影靠这个 progress 位移 + 缩放 + 淡出，交给下一屏的真板。
 * 交接就在 Hero 自己的滚动高度里跑完，两屏之间不再留空段——
 * 上一版的 22vh .handoff 让 Hero 和 C 屏之间空出一整屏，老板点名要收掉。
 */
(function () {
  "use strict";

  var M = window.FDE_MOTION;

  function boot() {
    if (M) {
      M.reveal();
      M.splitText();
      M.dotfield();
      M.countUp();
    }
    handoff();
    navState();
    deepLinks();
  }

  /* ── 指向 C 屏的深链：跳转后停在指定层，必要时打开指定 tab ──
   * 锚点跳转本身交给浏览器（没有 JS 也能跳），这里只在跳完以后把层和 tab 摆对。 */
  function deepLinks() {
    document.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest("[data-go-layer]") : null;
      if (!a || !window.FDE_LAYERS) return;
      var layer = a.getAttribute("data-go-layer");
      var tab = a.getAttribute("data-go-tab") || "desc";
      setTimeout(function () {
        window.FDE_LAYERS.select(layer);
        window.FDE_LAYERS.openTab(layer, tab);
      }, 0);
    });
  }

  /* ── A5 滚动接管 ─────────────────────────────────────────
   * 只写一个变量 --hk（0 → 1，滚过 60vh 走完）到 .hero 上，
   * css/motion.css 用它让四块板收紧、接触阴影消失、点阵变淡。 */
  function handoff() {
    var hero = document.querySelector(".hero");
    var bar = document.querySelector("[data-page-prog]");
    if (!hero && !bar) return;

    var target = 0, smooth = 0, raf = 0;
    var drive = hero && !(M && M.REDUCED);

    function read() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var page = max > 0 ? window.scrollY / max : 0;
      if (bar) bar.style.setProperty("--pp", page.toFixed(4));

      if (!drive) return;
      target = Math.max(0, Math.min(1, window.scrollY / (window.innerHeight * 0.6)));
    }

    function tick() {
      smooth += (target - smooth) * 0.12; // M-5：lerp 0.12
      if (drive) hero.style.setProperty("--hk", smooth.toFixed(3));
      if (Math.abs(target - smooth) > 0.0005) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    }

    function kick() {
      read();
      if (!raf) raf = requestAnimationFrame(tick);
    }

    kick();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
  }

  /* ── 导航当前项 ──────────────────────────────────────── */
  function navState() {
    var items = [].slice.call(document.querySelectorAll("[data-nav]"));
    if (!items.length || !("IntersectionObserver" in window)) return;

    var map = {};
    items.forEach(function (a) {
      var sec = document.getElementById(a.getAttribute("data-nav"));
      if (sec) map[sec.id] = a;
    });

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          items.forEach(function (a) { a.classList.remove("is-current"); });
          if (map[e.target.id]) map[e.target.id].classList.add("is-current");
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
