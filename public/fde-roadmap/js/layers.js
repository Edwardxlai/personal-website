/* C1—C4 交互 —— 屏 2
 * 点击是一等公民（老板会乱点），滚动联动只是辅助。
 * 选中 C4 时给 .cfig 加 is-c4，回流弧线开始流动。
 *
 * 几组联动：
 *   板 ↔ 右栏面板          点板（或板外的中文标注、或回流弧线）切面板；点已经选中的板，板上的立方体依次弹一下
 *   tab                    两个 tab 之间一条滑动的指示线；←/→ 可走
 *   工具行 → 板上的立方体    悬停工具行，对应那颗立方体抬起并标出名字；点一下钉住（再点松开）
   *   Hero / 三问 → 这里       window.FDE_LAYERS.select(id) / openTab(id, key)：
   *                           点 Hero 的板或指向 C 屏的问题后直接停在对应层
 */
(function () {
  "use strict";

  function init() {
    var fig = document.querySelector("[data-c-figure]");
    var panels = document.querySelector("[data-panels]");
    if (!fig || !panels) return;

    var slabs = [].slice.call(fig.querySelectorAll(".iso-slab"));
    var cards = [].slice.call(panels.querySelectorAll(".lpanel"));
    var iso = fig.querySelector(".iso");
    if (!slabs.length || !cards.length) return;

    // DOM 里 C1 最后画（绘制顺序即层叠顺序），所以 slabs 是 C4→C1。
    // 逻辑顺序以右侧面板为准：C1、C2、C3、C4。
    var order = cards.map(function (c) { return c.getAttribute("data-panel"); });
    var byId = {}, cardById = {}, tabsById = {};
    slabs.forEach(function (s) { byId[s.getAttribute("data-layer")] = s; });
    cards.forEach(function (c) { cardById[c.getAttribute("data-panel")] = c; });
    var ordered = order.map(function (id) { return byId[id]; }).filter(Boolean);
    var current = order[0];
    var settled = false;
    var booted = false;

    /* 强制重启一个 CSS 动画：摘掉再挂之间必须回流，否则浏览器把「删了又加」合并掉 */
    function replay(el, cls) {
      el.classList.remove(cls);
      void el.getBoundingClientRect();
      el.classList.add(cls);
    }

    function pingCubes(slab) {
      [].slice.call(slab.querySelectorAll(".iso-cube")).forEach(function (cube, k) {
        setTimeout(function () { replay(cube, "is-ping"); }, k * 45);
      });
    }

    function select(id) {
      if (!id || !byId[id]) return;
      // 入场还没跑完就点了：立刻把延迟摘掉，切换不能等（首屏初始化那一次不算）
      if (booted && !settled) settleNow();
      if (id === current && booted) { pingCubes(byId[id]); return; }   // 点已选中的板：再确认一次，不哑火
      current = id;
      slabs.forEach(function (s) {
        var on = s.getAttribute("data-layer") === id;
        s.classList.toggle("is-active", on);
        s.setAttribute("aria-selected", on ? "true" : "false");
        s.tabIndex = on ? 0 : -1;
        if (!on) clearPins(s);
      });
      cards.forEach(function (c) {
        c.classList.toggle("is-active", c.getAttribute("data-panel") === id);
      });
      fig.classList.toggle("is-c4", id === "C4");
      /* 隐藏面板初始化时量到的 tab 宽度是 0，显示以后必须重新定位指示线 */
      var activeTabs = tabsById[id];
      if (activeTabs) activeTabs.tabs.forEach(function (tab) {
        if (tab.classList.contains("is-active")) placeBar(activeTabs.el, tab);
      });
    }

    slabs.forEach(function (s) {
      s.addEventListener("click", function () { select(s.getAttribute("data-layer")); });
      s.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select(s.getAttribute("data-layer"));
        }
        var d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1
              : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
        if (d) {
          e.preventDefault();
          var i = ordered.indexOf(s);
          var n = ordered[Math.max(0, Math.min(ordered.length - 1, i + d))];
          if (n) { n.focus(); select(n.getAttribute("data-layer")); }
        }
      });
    });

    /* 回流弧线也是 C4 的入口 */
    var arc = fig.querySelector(".iso-return");
    if (arc) arc.addEventListener("click", function () { select("C4"); });

    /* ── tab：滑动指示线 + 键盘 ── */
    function placeBar(tabsEl, tab) {
      var bar = tabsEl.querySelector(".ltab__bar");
      if (!bar) return;
      tabsEl.classList.add("has-bar");
      bar.style.setProperty("--x", tab.offsetLeft + "px");
      bar.style.setProperty("--w", tab.offsetWidth + "px");
    }

    function openTab(id, key) {
      var t = tabsById[id];
      if (!t) return;
      t.tabs.forEach(function (x) {
        var on = x.getAttribute("data-tab") === key;
        x.classList.toggle("is-active", on);
        x.setAttribute("aria-selected", on ? "true" : "false");
        x.tabIndex = on ? 0 : -1;
        if (on) placeBar(t.el, x);
      });
      t.bodies.forEach(function (b) {
        b.classList.toggle("is-active", b.getAttribute("data-tabpanel") === key);
      });
      if (key !== "tools") clearPins(byId[id]);
    }

    /* 工具行 ↔ 立方体 */
    function clearPins(slab) {
      if (!slab) return;
      [].slice.call(slab.querySelectorAll(".iso-cube.is-on")).forEach(function (c) { c.classList.remove("is-on"); });
      var card = cardById[slab.getAttribute("data-layer")];
      if (card) [].slice.call(card.querySelectorAll(".tool.is-on")).forEach(function (r) {
        r.classList.remove("is-on");
        r.setAttribute("aria-pressed", "false");
      });
      syncHot(slab);
    }
    function syncHot(slab) {
      var cubes = slab.querySelector(".iso-cubes");
      if (cubes) cubes.classList.toggle("has-hot", !!slab.querySelector(".iso-cube.is-hot, .iso-cube.is-on"));
    }

    cards.forEach(function (card) {
      var id = card.getAttribute("data-panel");
      var tabsEl = card.querySelector(".lpanel__tabs");
      var tabs = [].slice.call(card.querySelectorAll(".ltab"));
      var bodies = [].slice.call(card.querySelectorAll(".lpanel__body"));
      tabsById[id] = { el: tabsEl, tabs: tabs, bodies: bodies };

      tabs.forEach(function (t, k) {
        t.addEventListener("click", function () { openTab(id, t.getAttribute("data-tab")); });
        t.addEventListener("keydown", function (e) {
          var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
                : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          var n = tabs[Math.max(0, Math.min(tabs.length - 1, k + d))];
          if (n) { n.focus(); openTab(id, n.getAttribute("data-tab")); }
        });
      });

      var slab = byId[id];
      if (!slab) return;
      var cubes = [].slice.call(slab.querySelectorAll(".iso-cube"));
      [].slice.call(card.querySelectorAll(".tool")).forEach(function (row, k) {
        var cube = cubes[k];
        if (!cube) return;
        row.addEventListener("mouseenter", function () { cube.classList.add("is-hot"); syncHot(slab); });
        row.addEventListener("mouseleave", function () { cube.classList.remove("is-hot"); syncHot(slab); });
        row.addEventListener("click", function () {
          // 有 href 的行是链接，开新页就够了，不钉
          if (row.tagName === "A") return;
          var on = !row.classList.contains("is-on");
          clearPins(slab);
          row.classList.toggle("is-on", on);
          row.setAttribute("aria-pressed", on ? "true" : "false");
          cube.classList.toggle("is-on", on);
          syncHot(slab);
          replay(cube, "is-ping");
        });
        cube.addEventListener("animationend", function () { cube.classList.remove("is-ping"); });
      });
    });

    /* 入场落位：图进视口时自底向上搭起来，跑完切成短过渡。
     * 1600ms = css/motion.css A3 那段的总长（220 + 3×130 + 640 + 弧线），改那边要同步改这里。 */
    var settleTimer = 0;
    function settleNow() {
      settled = true;
      clearTimeout(settleTimer);
      iso.classList.add("is-in", "is-settled");
    }
    function settle() {
      iso.classList.add("is-in");
      var wait = window.FDE_MOTION && window.FDE_MOTION.REDUCED ? 0 : 1600;
      settleTimer = setTimeout(settleNow, wait);
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { settle(); io.disconnect(); } });
      }, { threshold: 0.18 });
      io.observe(fig);
      setTimeout(settle, 2500); // 兜底
    } else {
      settle();
    }

    select(current);
    Object.keys(tabsById).forEach(function (id) { openTab(id, "desc"); });
    booted = true;
    window.addEventListener("resize", function () {
      var t = tabsById[current];
      if (t) t.tabs.forEach(function (x) { if (x.classList.contains("is-active")) placeBar(t.el, x); });
    });

    /* 给 Hero 和三问用 */
    window.FDE_LAYERS = { select: select, openTab: openTab };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
