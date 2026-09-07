/* 动效引擎 —— 词汇表 A1 / A2 / A4 / A5 的实现
 * 参考编号见 docs/03-参考库.md：M-1 SplitText、M-2 AnimatedContent、
 * M-4 延迟表、M-5 滚动 scrub、L-3 DotGrid、M-6 CountUp。
 * 各条的取值理由写在 css/motion.css 顶部那份词汇表里，这里只写实现上的坑。
 *
 * 这个文件不渲染任何内容。页面上的文字全部已经在 index.html 里，
 * 它只负责给已经存在的元素加 class。动效失败最坏结果是「不动」，不是「空白」。
 */
(function () {
  "use strict";

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SWEEP_MS = 1200; // 兜底扫描的间隔

  /* A2 的字间隔。三处必须一致，改一个就得改另外两个：
   *   这里（拆字时写 --cd）
   *   css/motion.css（--cn * 22ms 算强调词着色的时机）
   *   build/render-hero.js（CHAR_STEP，算主张下一行什么时候接上） */
  var CHAR_STEP = 22;

  /* 元素已经滚到视口里（或者已经被滚过去了）——兜底时只补这种。
   * 还在 display:none 面板里的元素宽高都是 0，先留着，等它显示出来再说。 */
  function arrived(el) {
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) return false;
    return r.top <= (window.innerHeight || 0) * 1.02;
  }

  /* 兜底扫描器：标签页在后台时 IntersectionObserver 不回调，
   * 到点把「已经滚过去的」补上，没滚到的一律不碰。
   *
   * 上一版这里是一个 2.5s 的 showAll()——无差别把全页点亮。
   * 结果是页面打开两秒半以后，下面三屏的字早就亮完了，
   * 滚下去只看到静止的成品，整站看起来一个入场动画都没有。
   *
   * 起始透明度这一版从 0.12 收到 0 了（理由见 motion.css），
   * 这层兜底因此是唯一的安全网，pageshow / visibilitychange / load 三个入口都挂上。 */
  function sweeper(els, onShow) {
    var pending = els.slice();
    var timer = setInterval(pass, SWEEP_MS);

    function pass() {
      pending = pending.filter(function (el) {
        if (el.classList.contains("is-in")) return false;
        if (!arrived(el)) return true;
        onShow(el);
        return false;
      });
      if (!pending.length) clearInterval(timer);
    }

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) setTimeout(pass, 200);
    });
    window.addEventListener("pageshow", pass);
    window.addEventListener("load", function () { setTimeout(pass, 60); });
  }

  /* ── A1 序列入场 ──────────────────────────────────────── */
  function reveal() {
    var els = [].slice.call(document.querySelectorAll(".rv"));
    if (!els.length) return;

    function show(el) { el.classList.add("is-in"); }

    // reduced-motion 下不做入场，内容一次到位
    if (REDUCED || !("IntersectionObserver" in window)) {
      els.forEach(show);
      return;
    }

    /* 整段包起来：起始透明度是 0，这里一旦抛错就是一屏空白，
     * 所以任何异常都直接把全页点亮，宁可没有动效也不能没有内容。 */
    try {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            show(e.target);
            io.unobserve(e.target);
          });
        },
        { threshold: 0.1, rootMargin: "0px 0px -6% 0px" } // M-4：进视口一角就开始
      );
      els.forEach(function (el) { io.observe(el); });
      sweeper(els, function (el) { show(el); io.unobserve(el); });
    } catch (err) {
      els.forEach(show);
      return;
    }

    // 跑完把 will-change 摘掉
    document.addEventListener(
      "transitionend",
      function (e) {
        if (e.target.classList && e.target.classList.contains("rv") && e.propertyName === "opacity") {
          e.target.classList.add("is-done");
        }
      },
      true
    );
  }

  /* ── A2 字级揭示（M-1：chars / power3.out） ─────────────
   * 中文按字切，标点跟前一个字一组。<em> 里的字保住颜色。
   * 初始态由 CSS 在 html.js 下给，这里只负责拆和点亮。
   *
   * ⚠ 上一版「拆了字看不出拆过」不是拆得不对，是四个大标题同时挂着
   * class="rv"（整块位移）和 data-split（每个字位移）：两个位移叠在一起，
   * 合成出来就是一次普通渐显。现在由 css/motion.css 里的 .rv.split 让 A1 让位。 */
  function splitOne(root) {
    if (REDUCED) { root.classList.add("split", "is-in"); return; }

    var idx = 0;
    var PUNCT = /[，。、；：！？）】」』·—…,.;:!?)\]}"']/;

    function walk(node) {
      var kids = [].slice.call(node.childNodes);
      kids.forEach(function (n) {
        if (n.nodeType === 3) {
          var text = n.nodeValue;
          var frag = document.createDocumentFragment();
          var buf = "";
          for (var i = 0; i < text.length; i++) {
            var ch = text[i];
            if (PUNCT.test(ch) && buf) { buf += ch; continue; }
            if (buf) { frag.appendChild(mk(buf)); buf = ""; }
            if (ch === " ") { frag.appendChild(document.createTextNode(" ")); continue; }
            buf = ch;
          }
          if (buf) frag.appendChild(mk(buf));
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    }

    function mk(s) {
      var el = document.createElement("span");
      el.className = "split__c";
      el.style.setProperty("--cd", idx * CHAR_STEP + "ms");
      el.textContent = s;
      idx++;
      return el;
    }

    walk(root);
    // 这一行一共几个字。CSS 拿它算「扫完最后一个字之后再点亮强调词」的时机
    root.style.setProperty("--cn", idx);
    root.classList.add("split");
  }

  function splitText() {
    var els = [].slice.call(document.querySelectorAll("[data-split]"));
    if (!els.length) return;

    function on(el) { el.classList.add("is-in"); }

    try {
      els.forEach(splitOne);
    } catch (err) {
      // 拆字这一步如果炸了，整行原样留着并点亮，别留一行拆了一半的字
      els.forEach(function (el) { el.classList.add("split", "is-in"); });
      return;
    }

    if (REDUCED || !("IntersectionObserver" in window)) {
      els.forEach(on);
      return;
    }
    try {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            on(e.target);
            io.unobserve(e.target);
          });
        },
        { threshold: 0.2 }
      );
      els.forEach(function (el) { io.observe(el); });
      sweeper(els, on);
    } catch (err) {
      els.forEach(on);
    }
  }

  /* 把 --ink 这类十六进制变量读成 "r,g,b"，好拼进 canvas 的 rgba()。
   * canvas 里没法直接写 var(--ink)，但颜色仍然只能有 tokens.css 一个出处，
   * 不能在这里硬写一串数字——否则整页翻暗场时这一层会漏。 */
  function inkRGB() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim();
    var m = /^#?([0-9a-f]{6})$/i.exec(raw);
    if (!m) return "12,26,32";
    var n = parseInt(m[1], 16);
    return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
  }

  /* ── A4 等距点阵（L-3 DotGrid 的浅底版） ─────────────────
   * 上一版是满屏 24px 正交网格 + 0.09 透明度：既没有图形，又把剪影的底子搞脏，
   * 两层叠起来只剩一片脏灰。这一版改成 2:1 等距网格——和剪影、和 C 屏那四块板
   * 是同一套投影，所以它读起来是「这张等距工程图所在的那张坐标纸」，不是背景噪点。
   *
   * 网格：沿 u=(1,0.5) 和 v=(-1,0.5) 铺点，等价于「横 STEP、纵 STEP/2、隔行错半格」。
   *
   * 铺多大一片，不写死百分比，直接读剪影自己的位置：以剪影盒子的中心为圆心、
   * 按它的尺寸定半径，往外柔和收掉。这样它天然只在剪影周围有存在感，
   * 主张那一侧自己就淡没了——不需要在这里凭空定一条「左边 36% 不画」的边界，
   * 剪影换位置（比如手机上挪到右下角）也不用回来改这段。 */
  function groundGrid() {
    var cv = document.querySelector("[data-dotfield]");
    if (!cv || REDUCED) return;

    var ctx = cv.getContext("2d");
    var host = cv.parentNode;
    var fig = document.querySelector("[data-hero-figure]");
    var STEP = 30, R = 1.5, PROX = 132;
    var RGB = inkRGB();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, mx = -9999, my = -9999, raf = 0, dirty = true;
    var cx = 0, cy = 0, rad = 1;

    function size() {
      var r = host.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 圆心跟着剪影走；剪影万一不在（别的屏复用这段），退回右侧偏中
      if (fig) {
        var f = fig.getBoundingClientRect();
        cx = f.x - r.x + f.width / 2;
        cy = f.y - r.y + f.height / 2;
        rad = Math.max(f.width, f.height) * 0.78;
      } else {
        cx = w * 0.8; cy = h * 0.5; rad = w * 0.4;
      }
      dirty = true;
    }

    /* smoothstep 收边。线性收边会留下一圈看得出来的硬边 */
    function falloff(d) {
      var k = 1 - d / rad;
      if (k <= 0) return 0;
      if (k >= 1) return 1;
      return k * k * (3 - 2 * k);
    }

    function draw() {
      raf = 0;
      if (!dirty) return;
      dirty = false;
      ctx.clearRect(0, 0, w, h);
      var half = STEP / 2;
      var row = 0;
      for (var y = half; y < h; y += half, row++) {
        // 隔行错半格，正交网格就变成等距菱形网格
        var x0 = row % 2 ? half : 0;
        for (var x = x0; x < w + STEP; x += STEP) {
          var ex = x - cx, ey = y - cy;
          var f = falloff(Math.sqrt(ex * ex + ey * ey));
          if (f <= 0.02) continue;
          // 贴着导航那一条压下去，免得网点顶到吸顶条下沿
          var fy = y < 40 ? y / 40 : 1;
          var dx = x - mx, dy = y - my;
          var d = Math.sqrt(dx * dx + dy * dy);
          var k = d < PROX ? 1 - d / PROX : 0;
          ctx.fillStyle = "rgba(" + RGB + "," + ((0.26 + k * 0.3) * f * fy).toFixed(3) + ")";
          ctx.beginPath();
          ctx.arc(x, y, R + k * 0.8, 0, 6.2832);
          ctx.fill();
        }
      }
    }

    function kick() { dirty = true; if (!raf) raf = requestAnimationFrame(draw); }

    size();
    kick();
    cv.classList.add("is-in");

    window.addEventListener("resize", function () { size(); kick(); });
    host.addEventListener("mousemove", function (e) {
      var r = cv.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
      kick();
    });
    host.addEventListener("mouseleave", function () { mx = my = -9999; kick(); });
  }

  /* ── Hero 那叠板 ───────────────────────────────────────────
   * 入场：自底向上落位（CSS 里的 .iso--hero），1400ms 后 is-settled（摘掉入场延迟，位移只留给 hover），
   * 2200ms 后 is-idle（四层「走一遍」的待机动画）。鼠标进到图上就停掉待机，离开 300ms 后再放——
   * 不用 animation-play-state: paused，暂停会把某一块卡在抬起的状态。
   * 点板：板本身是 <a href="#c">，没有 JS 也能跳；有 JS 时顺手让 C 屏直接停在那一层。 */
  function heroFigure() {
    var host = document.querySelector("[data-hero-figure]");
    var svg = host && host.querySelector(".iso");
    if (!svg) return;

    if (REDUCED) { svg.classList.add("is-in", "is-settled"); return; }

    var done = false, idleTimer = 0;
    function on() {
      if (done) return;
      done = true;
      svg.classList.add("is-in");
      setTimeout(function () { svg.classList.add("is-settled"); }, 1400);
      idleTimer = setTimeout(function () { svg.classList.add("is-idle"); }, 2200);
    }

    host.addEventListener("mouseenter", function () {
      clearTimeout(idleTimer);
      svg.classList.remove("is-idle");
    });
    host.addEventListener("mouseleave", function () {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { if (done) svg.classList.add("is-idle"); }, 300);
    });

    svg.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest(".iso-slab") : null;
      var id = a && a.getAttribute("data-layer");
      if (id && window.FDE_LAYERS) setTimeout(function () { window.FDE_LAYERS.select(id); }, 0);
    });

    /* 三问里指向 C 屏的链接：悬停 / 落焦时物件四块板一起抬一下（hero.css 的 .is-peek） */
    [].forEach.call(document.querySelectorAll(".ask__hit[data-peek]"), function (row) {
      function onp() { svg.classList.add("is-peek"); }
      function offp() { svg.classList.remove("is-peek"); }
      row.addEventListener("mouseenter", onp);
      row.addEventListener("mouseleave", offp);
      row.addEventListener("focus", onp);
      row.addEventListener("blur", offp);
    });

    if (!("IntersectionObserver" in window)) { on(); return; }
    try {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          on();
          io.disconnect();
        });
      }, { threshold: 0.05 });
      io.observe(svg);
      sweeper([svg], on);
    } catch (err) {
      on();
    }
  }

  /* main.js 的 boot() 里只点名调了 reveal / splitText / dotfield / countUp 四个，
   * 而 main.js 本轮不归这里改，所以 Hero 底图这两件事挂在 dotfield 里一起做。
   * 各自带独立的 guard：canvas 掉了不该连剪影一起不动。 */
  function dotfield() {
    groundGrid();
    heroFigure();
  }

  /* ── 数字滚动（M-6 CountUp）：只滚数字，单位和箭头不动 ── */
  function countUp() {
    if (REDUCED || !("IntersectionObserver" in window)) return;
    var els = [].slice.call(document.querySelectorAll("[data-count]"));
    if (!els.length) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          run(e.target);
          io.unobserve(e.target);
        });
      },
      { threshold: 0.4 }
    );
    els.forEach(function (el) { io.observe(el); });

    function run(el) {
      var raw = el.textContent;
      var parts = raw.split(/(\d+(?:\.\d+)?)/);
      if (parts.length < 2) return;
      var spans = [];
      el.textContent = "";
      parts.forEach(function (p) {
        if (/^\d+(\.\d+)?$/.test(p)) {
          var s = document.createElement("span");
          s.textContent = "0";
          el.appendChild(s);
          spans.push({ el: s, to: parseFloat(p), dec: (p.split(".")[1] || "").length });
        } else if (p) {
          el.appendChild(document.createTextNode(p));
        }
      });
      var t0 = performance.now(), DUR = 900;
      (function tick(t) {
        var k = Math.min(1, (t - t0) / DUR);
        var e = 1 - Math.pow(1 - k, 3); // power3.out
        spans.forEach(function (s) {
          s.el.textContent = (s.to * e).toFixed(s.dec);
        });
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    }
  }

  window.FDE_MOTION = { reveal: reveal, splitText: splitText, dotfield: dotfield, countUp: countUp, REDUCED: REDUCED };
})();
