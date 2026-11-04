/* =========================================================
   馬上有錢 — 共用程式
   股市資料來自 data/market.js（window.MARKET_DATA），
   由 GitHub Actions 每個交易日自動更新。
   ========================================================= */
(function () {
  "use strict";

  var DATA = window.MARKET_DATA || null;
  var page = document.body.getAttribute("data-page");

  /* ---------- 小工具 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function fmt(n, digits) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    return Number(n).toLocaleString("zh-TW", { minimumFractionDigits: digits || 0, maximumFractionDigits: digits || 0 });
  }
  function price(n) { return fmt(n, n >= 1000 ? 0 : 2); }
  function cls(n) { return n > 0 ? "up" : n < 0 ? "down" : "flat"; }
  function sign(n) { return n > 0 ? "▲ " : n < 0 ? "▼ " : ""; }
  function lots(shares) { return fmt(Math.round(shares / 1000)) + " 張"; }   // 1 張 = 1,000 股
  function yi(v) { return fmt(v / 1e8, v >= 1e10 ? 0 : 1) + " 億"; }        // 1 億 = 100,000,000 元

  var WEEK = "日一二三四五六";
  function dateText(d) {
    var t = new Date(d + "T00:00:00");
    return d.replace(/-/g, ".") + "（" + WEEK.charAt(t.getDay()) + "）";
  }

  /* 把每一檔股票的陣列轉成物件，順便算出漲跌幅 */
  function stocks() {
    if (!DATA) return [];
    if (stocks.cache) return stocks.cache;
    stocks.cache = DATA.stocks.map(function (r) {
      var prev = r[5] - r[6];
      return {
        code: r[0], name: r[1], open: r[2], high: r[3], low: r[4], close: r[5], change: r[6],
        volume: r[7], value: r[8], pct: prev > 0 ? (r[6] / prev) * 100 : 0,
        etf: /^00/.test(r[0])
      };
    });
    return stocks.cache;
  }
  function find(q) {
    q = String(q || "").trim().toUpperCase();
    if (!q) return null;
    var list = stocks();
    for (var i = 0; i < list.length; i++) if (list[i].code === q) return list[i];
    for (i = 0; i < list.length; i++) if (list[i].name.toUpperCase() === q) return list[i];
    for (i = 0; i < list.length; i++) if (list[i].name.toUpperCase().indexOf(q) > -1) return list[i];
    return null;
  }
  function ranked(kind, filter) {
    var list = stocks().filter(function (s) {
      if (filter === "stock") return !s.etf;
      if (filter === "etf") return s.etf;
      return true;
    });
    var key = { up: function (a, b) { return b.pct - a.pct; },
                down: function (a, b) { return a.pct - b.pct; },
                volume: function (a, b) { return b.volume - a.volume; } }[kind];
    return list.slice().sort(key);
  }

  /* ---------- 頁首：捲動變色、手機選單 ---------- */
  var header = $(".site-header");
  var solidAlways = !$(".hero") && !$(".page-hero");
  function onScroll() {
    if (!header) return;
    header.classList.toggle("solid", solidAlways || window.scrollY > window.innerHeight * 0.5);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var menuBtn = $(".menu-btn");
  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      var open = document.body.classList.toggle("menu-open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $all(".nav a").forEach(function (a) {
      a.addEventListener("click", function () { document.body.classList.remove("menu-open"); });
    });
  }

  /* ---------- 慢慢浮現的動畫 ---------- */
  function reveal() {
    var els = $all(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -10% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  /* 所有頁面：填入資料日期 */
  $all("[data-date]").forEach(function (el) {
    el.textContent = DATA ? dateText(DATA.date) : "尚無資料";
  });
  $all("[data-generated]").forEach(function (el) {
    el.textContent = DATA ? DATA.generatedAt : "—";
  });

  if (!DATA) {
    $all("[data-needs-data]").forEach(function (el) {
      el.innerHTML = '<p class="empty">目前讀不到股市資料（data/market.js）。請確認檔案存在，或等待自動更新。</p>';
    });
    reveal();
    return;
  }

  /* ---------- 首頁 ---------- */
  function sparkline(el, hist) {
    if (!el || hist.length < 2) return;
    var W = 520, H = 180, P = 8;
    var vals = hist.map(function (h) { return h.close; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var span = max - min || 1;
    var pts = vals.map(function (v, i) {
      return [P + (i / (vals.length - 1)) * (W - P * 2), P + (1 - (v - min) / span) * (H - P * 2)];
    });
    var line = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    var area = line + " L" + pts[pts.length - 1][0].toFixed(1) + " " + H + " L" + pts[0][0].toFixed(1) + " " + H + " Z";
    var last = pts[pts.length - 1];
    el.innerHTML =
      '<svg class="spark" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="加權指數近期走勢圖">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9805a" stop-opacity=".22"/><stop offset="1" stop-color="#a9805a" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#g)"/>' +
      '<path d="' + line + '" fill="none" stroke="#a9805a" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="4" fill="#a9805a"/>' +
      "</svg>" +
      '<div class="spark-cap"><span>' + hist[0].date.replace(/-/g, ".") + "</span><span>" + hist[hist.length - 1].date.replace(/-/g, ".") + "</span></div>" +
      '<div class="spark-cap"><span>近 ' + hist.length + " 個交易日走勢</span><span>最高 " + fmt(max, 0) + "／最低 " + fmt(min, 0) + "</span></div>";
  }

  function topList(el, list, kind) {
    el.innerHTML = list.slice(0, 3).map(function (s, i) {
      var v = kind === "volume"
        ? '<span class="num">' + lots(s.volume) + "</span>"
        : '<span class="num ' + cls(s.change) + '">' + (s.pct > 0 ? "+" : "") + fmt(s.pct, 2) + "%</span>";
      return '<li><a href="stock.html?code=' + encodeURIComponent(s.code) + '"><span class="rk">' + (i + 1) +
        '</span><span class="nm">' + esc(s.name) + "<small>" + esc(s.code) + "　收 " + price(s.close) + '</small></span><span class="v">' + v + "</span></a></li>";
    }).join("");
  }

  if (page === "home") {
    var t = DATA.taiex;
    $("#hero-taiex").textContent = fmt(t.close, 2);
    var hc = $("#hero-chg");
    hc.className = "num " + cls(t.change);
    hc.style.color = "#fff";
    hc.textContent = sign(t.change) + fmt(Math.abs(t.change), 2) + "（" + fmt(t.pct, 2) + "%）";

    $("#taiex").textContent = fmt(t.close, 2);
    var c = $("#taiex-chg");
    c.className = "chg num " + cls(t.change);
    c.textContent = sign(t.change) + fmt(Math.abs(t.change), 2) + " 點　" + (t.pct > 0 ? "+" : "") + fmt(t.pct, 2) + "%";
    $("#t-value").textContent = yi(t.value);
    $("#t-volume").textContent = fmt(t.volume / 1e8, 1) + " 億股";
    $("#t-trans").textContent = fmt(t.transactions / 1e4, 0) + " 萬筆";
    sparkline($("#spark"), DATA.history || []);

    $("#indices").innerHTML = (DATA.indices || []).map(function (x) {
      return '<div><div class="name">' + esc(x.name.replace("指數", "")) + '</div><div class="val num">' + fmt(x.close, 2) +
        '</div><div class="chg num ' + cls(x.change) + '">' + sign(x.change) + fmt(Math.abs(x.change), 2) + "（" + fmt(x.pct, 2) + "%）</div></div>";
    }).join("");

    topList($("#top-up"), ranked("up", "all"), "up");
    topList($("#top-down"), ranked("down", "all"), "down");
    topList($("#top-vol"), ranked("volume", "all"), "volume");
  }

  /* ---------- 排行榜 ---------- */
  if (page === "rank") {
    var state = { kind: "up", filter: "all" };
    var hashKind = location.hash.replace("#", "");
    if (["up", "down", "volume"].indexOf(hashKind) > -1) state.kind = hashKind;

    var draw = function () {
      $all(".tabs button").forEach(function (b) {
        b.setAttribute("aria-selected", b.getAttribute("data-kind") === state.kind ? "true" : "false");
      });
      var rows = ranked(state.kind, state.filter).slice(0, 10);
      $("#rank-body").innerHTML = rows.map(function (s, i) {
        return '<tr data-code="' + esc(s.code) + '"><td>' + (i + 1) + '</td><td class="nm">' + esc(s.name) + "<small>" + esc(s.code) +
          '</small></td><td class="num">' + price(s.close) + '</td><td class="num ' + cls(s.change) + '">' + sign(s.change) + price(Math.abs(s.change)) +
          '</td><td class="num ' + cls(s.change) + '">' + (s.pct > 0 ? "+" : "") + fmt(s.pct, 2) + '%</td><td class="num">' + lots(s.volume) + "</td></tr>";
      }).join("");
    };
    $all(".tabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        state.kind = b.getAttribute("data-kind");
        history.replaceState(null, "", "#" + state.kind);
        draw();
      });
    });
    $all('.filter input[name="f"]').forEach(function (r) {
      r.addEventListener("change", function () { state.filter = r.value; draw(); });
    });
    $("#rank-body").addEventListener("click", function (e) {
      var tr = e.target.closest("tr");
      if (tr) location.href = "stock.html?code=" + encodeURIComponent(tr.getAttribute("data-code"));
    });
    draw();
  }

  /* ---------- 個股查詢＋觀察清單 ---------- */
  if (page === "stock") {
    var KEY = "mashang-watchlist";
    var getWatch = function () {
      try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
    };
    var setWatch = function (list) {
      try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* 瀏覽器不允許儲存時就略過 */ }
    };
    var current = null;

    // 輸入框的自動完成選單
    $("#stock-list").innerHTML = stocks().map(function (s) {
      return '<option value="' + esc(s.code) + '">' + esc(s.name) + "</option>";
    }).join("");

    var show = function (s) {
      var box = $("#quote");
      current = s;
      if (!s) {
        box.innerHTML = '<p class="empty">找不到這檔股票。請輸入股票代號（例如 2330）或名稱（例如 台積電）。</p>';
        return;
      }
      var pos = s.high > s.low ? ((s.close - s.low) / (s.high - s.low)) * 100 : 50;
      var inList = getWatch().indexOf(s.code) > -1;
      box.innerHTML =
        '<div class="quote reveal in"><div class="id">' + esc(s.code) + (s.etf ? "　ETF" : "") + "</div><h2>" + esc(s.name) + "</h2>" +
        '<div class="big num">' + price(s.close) + '</div><div class="chg num ' + cls(s.change) + '">' + sign(s.change) +
        price(Math.abs(s.change)) + "　" + (s.pct > 0 ? "+" : "") + fmt(s.pct, 2) + "%</div>" +
        "<dl><div><dt>開盤價</dt><dd class=\"num\">" + price(s.open) + "</dd></div><div><dt>最高價</dt><dd class=\"num\">" + price(s.high) +
        "</dd></div><div><dt>最低價</dt><dd class=\"num\">" + price(s.low) + "</dd></div><div><dt>前一日收盤</dt><dd class=\"num\">" + price(s.close - s.change) +
        "</dd></div><div><dt>成交量</dt><dd class=\"num\">" + lots(s.volume) + "</dd></div><div><dt>成交金額</dt><dd class=\"num\">" + yi(s.value) + "</dd></div></dl>" +
        '<div class="range"><div class="bar"><span class="mark" style="left:' + pos.toFixed(1) + '%"></span></div>' +
        '<div class="ends"><span>當日最低 ' + price(s.low) + "</span><span>收盤位置</span><span>當日最高 " + price(s.high) + "</span></div></div>" +
        '<button class="btn' + (inList ? " on" : "") + '" id="watch-btn" type="button">' + (inList ? "✓ 已在觀察清單" : "＋ 加入觀察清單") + "</button></div>";
      $("#watch-btn").addEventListener("click", function () {
        var list = getWatch();
        var i = list.indexOf(s.code);
        if (i > -1) list.splice(i, 1); else list.push(s.code);
        setWatch(list);
        show(s);
        drawWatch();
      });
    };

    var drawWatch = function () {
      var list = getWatch();
      var ul = $("#watch-list");
      if (!list.length) {
        ul.innerHTML = '<li class="empty" style="display:block">還沒有加入任何股票。查詢後按「加入觀察清單」，下次打開就會記得。</li>';
        return;
      }
      ul.innerHTML = list.map(function (code) {
        var s = find(code);
        if (!s) return "";
        return '<li><button class="go" type="button" data-code="' + esc(code) + '">' + esc(s.name) + "<small>" + esc(code) +
          '</small></button><span class="num ' + cls(s.change) + '">' + price(s.close) + "　" + (s.pct > 0 ? "+" : "") + fmt(s.pct, 2) +
          '%</span><button class="rm" type="button" data-rm="' + esc(code) + '" aria-label="從清單移除 ' + esc(s.name) + '">×</button></li>';
      }).join("");
    };
    $("#watch-list").addEventListener("click", function (e) {
      var go = e.target.closest("[data-code]");
      var rm = e.target.closest("[data-rm]");
      if (rm) {
        setWatch(getWatch().filter(function (c) { return c !== rm.getAttribute("data-rm"); }));
        drawWatch();
        if (current) show(current);
      } else if (go) {
        search(go.getAttribute("data-code"));
      }
    });

    var search = function (q) {
      $("#q").value = q;
      var s = find(q);
      show(s);
      if (s) history.replaceState(null, "", "?code=" + encodeURIComponent(s.code));
    };
    $("#search-form").addEventListener("submit", function (e) { e.preventDefault(); search($("#q").value); });
    $all(".chips button").forEach(function (b) {
      b.addEventListener("click", function () { search(b.getAttribute("data-q")); });
    });

    var m = location.search.match(/code=([^&]+)/);
    search(m ? decodeURIComponent(m[1]) : "2330");
    drawWatch();
  }

  reveal();
})();
