/* P1—P5 数轴 —— 屏 3
 * 参考 P-1（React Bits Pro How It Works 6）：滚动推进进度、节点到达时脉冲一次。
 * 点击可以强制跳，和滚动共用同一个 --p，互不打架。
 * 默认停在 P1——空轴会让人不知道要点。
 *
 * ⚠ --p 写在 .pstage__pin 上。进度条和面板上的开口 / 引线都要用这个值定位，
 * 自定义属性会往下继承，挂在共同祖先上各取所需，JS 只需要写一处。
 *
 * ⚠⚠ apply() 的入口条件：索引没变就直接 return。
 * 滚动处理器每一帧都会调 apply，如果同一个节点也重跑一遍，is-pulse 被反复摘下重挂，
 * 到达动画永远停在第 0 帧。想在原地再放一次涟漪走 ping()，不要放宽这个条件。
 *
 * 滚动推进（桌面端）：.pstage 加 is-scrub，pin 粘住，下面一段 4 × --pstep 的行程；
 * 行程走过的比例 k 分成五桶，桶号 + 偏移 = 当前节点，换桶带 1.2% 的死区，慢滚不抖。
 * 点击：立刻到位，并把「点的节点 − 滚动算出来的桶」记成偏移——页面一像素都不动，
 * 接着往下滚就从点的那一格继续推进；往回滚也从那一格往回退。离开这一屏偏移清零。
 * （上一版是点击后把页面滚到那一桶的中央，视觉上是「点一下整块跳到导航底下」，被盘点点名。）
 */
(function () {
  "use strict";

  function init() {
    var stage = document.querySelector("[data-axis]");
    if (!stage) return;

    var pin = stage.querySelector("[data-pin]") || stage;
    var rail = stage.querySelector("[data-rail]") || stage.querySelector(".paxis__rail");
    var wrap = stage.querySelector("[data-cards]") || stage.querySelector(".ppanel");
    var nodes = [].slice.call(stage.querySelectorAll(".pnode"));
    var cards = [].slice.call(stage.querySelectorAll(".pcard"));
    if (!nodes.length || !rail) return;

    var last = nodes.length - 1;
    var idx = -1;            // 故意从 -1 起步，好让 apply(0) 真的跑一次初始化
    var REDUCED = window.FDE_MOTION && window.FDE_MOTION.REDUCED;
    var PIN_TOP = 76;        // 和 css/stages.css 里 sticky 的 top 一致；setScrub() 会读实际值
    var scrub = false, ticking = false;
    var offset = 0;          // 点击留下的偏移：节点 = 滚动桶 + offset

    /* 原地再放一次到达涟漪。摘掉再挂之间必须强制回流，
     * 否则浏览器会把「删了又加」合并成没变过，动画不重启。 */
    function ping(i) {
      var n = nodes[i];
      if (!n) return;
      n.classList.remove("is-pulse");
      void n.offsetWidth;
      n.classList.add("is-pulse");
    }

    function apply(i, pulse) {
      i = Math.max(0, Math.min(last, i));
      if (i === idx) return;           // 见文件头 ⚠⚠
      var from = idx;
      idx = i;

      /* 往回走时整条胶片反向平移。第一次初始化（from < 0）当成往后走。 */
      if (wrap) wrap.classList.toggle("is-back", from > i);

      nodes.forEach(function (n, k) {
        var on = k === i;
        n.classList.toggle("is-active", on);
        n.classList.toggle("is-passed", k < i);
        n.setAttribute("aria-selected", on ? "true" : "false");
        /* roving tabindex：一组 tab 在 Tab 序列里只占一个位置，进到组里以后用方向键走。
         * 属性是 JS 加的，HTML 里没有——关掉 JS 时五个按钮各自都还是能 Tab 到的普通按钮。 */
        n.tabIndex = on ? 0 : -1;
      });

      cards.forEach(function (c, k) {
        var on = k === i;
        c.classList.toggle("is-active", on);
        /* 只有这一次真正退场的那张挂 is-leaving，上一次退场的就地摘掉。 */
        c.classList.toggle("is-leaving", !on && k === from);
      });

      pin.style.setProperty("--p", (i / last).toFixed(4));
      if (pulse) ping(i);
    }

    /* ── 滚动推进 ───────────────────────────────────────── */
    function setScrub() {
      var can = !REDUCED && window.matchMedia("(min-width: 901px)").matches && pin !== stage;
      stage.classList.toggle("is-scrub", can);
      if (can) {
        var cs = getComputedStyle(pin);
        PIN_TOP = parseFloat(cs.top) || PIN_TOP;
        // 任何一层祖先加了 overflow 都会让 sticky 静默失效；矮视口整块放不下也不钉。两种情况都退回纯点击
        can = cs.position === "sticky" && window.innerHeight >= pin.offsetHeight + PIN_TOP + 24;
      }
      scrub = can;
      stage.classList.toggle("is-scrub", can);
    }
    function progress() {
      var s = stage.getBoundingClientRect();
      var range = s.height - pin.offsetHeight;            // == 4 × --pstep
      return range > 0 ? Math.max(0, Math.min(1, (PIN_TOP - s.top) / range)) : 0;
    }
    var rawBin = -1;         // 上一次滚动算出来的桶（不含偏移），死区用
    function binOf(k) {
      var i = Math.min(last, Math.floor(k * (last + 1)));
      if (i > rawBin && k < i / (last + 1) + 0.012) i = rawBin;          // 1.2% 死区
      else if (i < rawBin && k > (i + 1) / (last + 1) - 0.012) i = rawBin;
      rawBin = i;
      return i;
    }

    /* 手动选中：立刻到位，页面不动；把和滚动桶的差记成偏移 */
    function pick(i, focus) {
      /* 点已经选中的那一个也要有回应——只放涟漪，不重排内容。 */
      if (i === idx) ping(i);
      else apply(i, true);
      if (scrub) offset = i - Math.max(0, binOf(progress()));
      if (focus && nodes[i]) nodes[i].focus({ preventScroll: true });
    }

    nodes.forEach(function (n, i) {
      n.addEventListener("click", function () { pick(i, false); });
    });

    /* 键盘：这是一组 role=tab，左右上下 / Home / End 是这类控件的既定操作。 */
    rail.addEventListener("keydown", function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var here = nodes.indexOf(e.target.closest ? e.target.closest(".pnode") : null);
      if (here < 0) return;
      var to = -1;
      switch (e.key) {
        case "ArrowRight": case "ArrowDown": to = here + 1; break;
        case "ArrowLeft":  case "ArrowUp":   to = here - 1; break;
        case "Home": to = 0; break;
        case "End":  to = last; break;
        default: return;
      }
      if (to < 0 || to > last) return;
      e.preventDefault();
      pick(to, true);
    });

    window.addEventListener("scroll", function () {
      if (!scrub || ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var s = stage.getBoundingClientRect();
        // 整屏在视口外：偏移清零，下次进来从头算
        if (s.bottom < 0 || s.top > window.innerHeight) { offset = 0; rawBin = -1; return; }
        apply(Math.max(0, Math.min(last, binOf(progress()) + offset)), true);
      });
    }, { passive: true });
    window.addEventListener("resize", setScrub);

    setScrub();
    apply(0, false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
