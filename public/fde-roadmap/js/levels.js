/* L1—L5 交互 —— 屏 4
 * 五列是一组 tab：点哪一列，下面就只显示那一级的说明。
 * 没有 JS 时五段说明全部显示、列不可点（tabindex 是这里补的，HTML 里没有）。
 *
 * 和 C 屏 / P 屏同一套规矩：点击是一等公民，键盘左右方向键可走，
 * 再点当前列不是哑火——说明块会重放一次入场（和 P 屏点当前节点放涟漪是同一个道理）。
 */
(function () {
  "use strict";

  function init() {
    var list = document.querySelector("[data-levels]");
    var box = document.querySelector("[data-level-details]");
    if (!list || !box) return;

    var cols = [].slice.call(list.querySelectorAll(".lv__col"));
    var details = [].slice.call(box.querySelectorAll(".lvd"));
    if (!cols.length || !details.length) return;

    var current = -1;

    function show(i, replay) {
      i = Math.max(0, Math.min(cols.length - 1, i));
      if (i === current && !replay) return;
      current = i;
      cols.forEach(function (c, k) {
        var on = k === i;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-selected", on ? "true" : "false");
        c.tabIndex = on ? 0 : -1;
      });
      details.forEach(function (d, k) {
        var on = k === i;
        if (on && replay) {
          // 摘掉再挂之间强制回流，否则浏览器会把「删了又加」合并掉，动画不重启
          d.classList.remove("is-active");
          void d.offsetWidth;
        }
        d.classList.toggle("is-active", on);
      });
      /* 说明块在视口外（矮屏上常见）：轻轻滚到刚好露出来，不然点了看不到变化 */
      if (replay !== null && current >= 0) {
        var b = box.getBoundingClientRect();
        if (b.bottom > window.innerHeight || b.top < 62) {
          box.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
    }

    cols.forEach(function (c, i) {
      c.addEventListener("click", function () { show(i, i === current); });
      c.addEventListener("keydown", function (e) {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        var to = -1;
        switch (e.key) {
          case "Enter": case " ": e.preventDefault(); show(i, true); return;
          case "ArrowRight": case "ArrowDown": to = i + 1; break;
          case "ArrowLeft":  case "ArrowUp":   to = i - 1; break;
          case "Home": to = 0; break;
          case "End":  to = cols.length - 1; break;
          default: return;
        }
        if (to < 0 || to >= cols.length) return;
        e.preventDefault();
        show(to, false);
        cols[to].focus();
      });
    });

    show(0, null);   // 初始化：null = 不滚页面
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
