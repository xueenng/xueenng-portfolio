/* ============================================================
   present.js v2 - "Chapters of the valley".
   Press P (or the play button): the page chrome steps aside and
   the painted valley stays LIVE behind the deck, dimmed by a
   scrim (--present-dim, default .6) - words sit on parchment
   panels so they stay crisp at any hour. Presentation progress
   drives the sky: dawn on the title, night on the closing
   letter (PORTFOLIO_WORLD.holdTime). Suu walks a painted road
   in the HUD as the progress bar; station dots jump chapters
   (also number keys 1-9). Autoplay chip = kiosk loop (8s).
   Presenter clock in the HUD. Exhibits stay interactive.
   Esc exits and hands the sky back to the scroll.
   ============================================================ */
(function () {
  "use strict";

  var AUTO_MS = 8000;

  var App, open = false, idx = 0, slides = [], stations = [];
  var autoOn = false, autoTimer = null;
  var clockIv = null, clockT0 = 0;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function suuSVG() { return App && App.suuSprite ? App.suuSprite() : ""; }
  /* every slide panel is a letter: airmail frame (CSS) + postage stamp */
  function panelEl(cls) {
    var p = el("div", "ps-panel" + (cls ? " " + cls : ""));
    p.appendChild(el("span", "ps-stamp", (App.content.identity.monogram || "XE")));
    return p;
  }
  function firstSentence(s) {
    var m = (s || "").match(/^[\s\S]*?[.!?](?=\s|$)/);
    return m ? m[0].trim() : (s || "");
  }
  function holdTime(t) {
    if (window.PORTFOLIO_WORLD && window.PORTFOLIO_WORLD.holdTime) window.PORTFOLIO_WORLD.holdTime(t);
  }
  function releaseTime() {
    if (window.PORTFOLIO_WORLD && window.PORTFOLIO_WORLD.release) window.PORTFOLIO_WORLD.release();
  }

  /* ---------- painted pieces ---------- */
  function bannerSVG(label) {
    return '<svg viewBox="0 0 640 240" aria-hidden="true">' +
      '<ellipse cx="320" cy="224" rx="180" ry="10" fill="rgba(60,50,30,.18)"/>' +
      '<rect x="308" y="60" width="24" height="164" fill="#8a6242" stroke="#5d4a33" stroke-width="3"/>' +
      '<path d="M60 36 H580 L612 84 L580 132 H60 L28 84 Z" fill="#f7ecd2" stroke="#5d4a33" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M76 50 H564" stroke="#5d4a33" stroke-width="1.6" opacity=".25"/>' +
      '<path d="M76 118 H564" stroke="#5d4a33" stroke-width="1.6" opacity=".25"/>' +
      '<text x="320" y="96" text-anchor="middle" font-size="34" font-weight="800" fill="#4a3a26" letter-spacing="2">' + label + "</text>" +
      "</svg>";
  }

  /* ---------- slide builders ---------- */
  function slideTitle() {
    var c = App.content;
    var s = el("div", "present-slide");
    var p = panelEl("ps-center");
    var seal = el("div", "ps-seal", c.identity.monogram || "XE");
    p.appendChild(seal);
    p.appendChild(el("p", "ps-kicker", "XE Studio — a portfolio you can walk through"));
    p.appendChild(el("h1", null, c.identity.name));
    p.appendChild(el("p", "ps-sub", c.identity.title + " · " + c.identity.tagline));
    p.appendChild(el("p", "ps-note", "→ to walk · 1-9 jump chapters · Esc leaves the valley"));
    s.appendChild(p);
    return s;
  }

  function slideWho() {
    var c = App.content;
    var s = el("div", "present-slide");
    var p = panelEl("ps-two");
    var left = el("div", "ps-photo-col");
    if (c.identity.photo) {
      var ph = el("div", "ps-photo");
      var img = document.createElement("img");
      img.src = c.identity.photo; img.alt = c.identity.name;
      ph.appendChild(img);
      ph.appendChild(el("span", "ps-photo-cap", c.identity.photoCaption || "hello"));
      left.appendChild(ph);
    } else {
      left.appendChild(el("div", "ps-seal", c.identity.monogram || "XE"));
    }
    p.appendChild(left);
    var right = el("div");
    right.appendChild(el("p", "ps-kicker", "who I am"));
    right.appendChild(el("h2", null, "Systems by day. Worlds by night."));
    right.appendChild(el("p", "ps-body", c.identity.summary));
    if (c.now && c.now.length) {
      var nowH = el("p", "ps-kicker ps-gap", "now");
      right.appendChild(nowH);
      var ul = el("ul", "ps-now");
      c.now.forEach(function (it) { ul.appendChild(el("li", null, it)); });
      right.appendChild(ul);
    }
    var stats = el("div", "ps-stats");
    (c.hero.stats || []).forEach(function (st) {
      var d = el("div");
      d.appendChild(el("b", null, st.value));
      d.appendChild(el("span", null, st.label));
      stats.appendChild(d);
    });
    right.appendChild(stats);
    p.appendChild(right);
    s.appendChild(p);
    return s;
  }

  function slideBanner(label, line) {
    return function () {
      var s = el("div", "present-slide ps-banner");
      var b = el("div");
      b.innerHTML = bannerSVG(label);
      s.appendChild(b);
      s.appendChild(el("p", "ps-banner-line", line));
      return s;
    };
  }

  function exhibitCopy(p) {
    var px = {}, k;
    for (k in p) if (p.hasOwnProperty(k)) px[k] = p[k];
    var ex = p.exhibit || {}, ex2 = {};
    for (k in ex) if (ex.hasOwnProperty(k)) ex2[k] = ex[k];
    ex2.images = [];              // no gallery weight on a slide
    px.exhibit = ex2;
    return px;
  }
  function slideFeatured(p) {
    return function () {
      var s = el("div", "present-slide");
      var panel = panelEl("ps-two ps-feature");
      var left = el("div");
      left.appendChild(el("p", "ps-kicker", (App.CATEGORY_LABELS[p.category] || p.category) + " · " + (p.year || "")));
      left.appendChild(el("h2", null, p.title));
      var meta = el("p", "ps-meta");
      meta.appendChild(el("span", "badge " + p.status, p.status));
      meta.appendChild(el("span", "ps-period", " " + (p.period || "")));
      left.appendChild(meta);
      left.appendChild(el("p", "ps-sub", p.subtitle));
      var box = el("div", "ps-case");
      [["THE PROBLEM", p.problem], ["WHAT I BUILT", p.action], ["THE RESULT", p.outcome]].forEach(function (pair) {
        var para = el("p");
        para.appendChild(el("b", null, pair[0]));
        para.appendChild(document.createTextNode(firstSentence(pair[1])));
        box.appendChild(para);
      });
      left.appendChild(box);
      if (p.impact) left.appendChild(el("p", "ps-quote", p.impact));
      panel.appendChild(left);
      var right = el("div", "ps-exhibit");
      panel.appendChild(right);
      try { window.PORTFOLIO_EXHIBITS.render(right, exhibitCopy(p)); } catch (e) {}
      s.appendChild(panel);
      return s;
    };
  }

  function slideShelf(items, label) {
    return function () {
      var s = el("div", "present-slide");
      var panel = panelEl();
      panel.appendChild(el("p", "ps-kicker", label));
      var grid = el("div", "ps-shelf");
      items.forEach(function (p) {
        var card = el("div", "ps-card");
        var top = el("p", "ps-meta");
        top.appendChild(el("span", "badge " + p.status, p.status));
        top.appendChild(el("span", "ps-period", " " + (p.year || "")));
        card.appendChild(top);
        card.appendChild(el("h4", null, p.title));
        card.appendChild(el("p", "ps-card-sub", p.subtitle));
        var chips = el("p", "ps-chips");
        (p.stack || []).slice(0, 3).forEach(function (t) { chips.appendChild(el("span", "tag", t)); });
        card.appendChild(chips);
        grid.appendChild(card);
      });
      panel.appendChild(grid);
      s.appendChild(panel);
      return s;
    };
  }

  function slideToolbox() {
    var c = App.content;
    var s = el("div", "present-slide");
    var panel = panelEl();
    panel.appendChild(el("p", "ps-kicker", "the toolbox"));
    panel.appendChild(el("h2", null, "What I build with"));
    var grid = el("div", "ps-trays");
    (c.skills || []).forEach(function (g) {
      var tray = el("div", "ps-tray");
      tray.appendChild(el("b", null, g.group));
      var ul = el("ul");
      g.items.forEach(function (it) { ul.appendChild(el("li", "tag", it)); });
      tray.appendChild(ul);
      grid.appendChild(tray);
    });
    panel.appendChild(grid);
    s.appendChild(panel);
    return s;
  }

  function slideJourney() {
    var s = el("div", "present-slide");
    var panel = panelEl("ps-wide");
    panel.appendChild(el("p", "ps-kicker", "the journey"));
    panel.appendChild(el("h2", null, "The road so far"));
    var host = el("div", "ps-journey");
    panel.appendChild(host);
    s.appendChild(panel);
    s._after = function () {
      var done = false;
      try {
        if (App.buildAdventure) { App.buildAdventure(App.content, host); done = !!host.firstChild; }
      } catch (e) { done = false; }
      if (!done) {   // quiet fallback: compact timeline
        host.innerHTML = "";
        App.content.timeline.forEach(function (t) {
          var row = el("p", "ps-tl");
          row.appendChild(el("b", null, t.period + "  "));
          row.appendChild(document.createTextNode(t.role + " — " + t.org));
          host.appendChild(row);
        });
      }
    };
    return s;
  }

  function slideAchievements() {
    var c = App.content;
    var s = el("div", "present-slide");
    var panel = panelEl();
    panel.appendChild(el("p", "ps-kicker", "hall of achievements"));
    panel.appendChild(el("h2", null, "Every honour, era by era"));
    var list = c.achievements || [], eras = c.achievementEras || {};
    panel.appendChild(el("p", "ps-tally-line", list.length + " achievements collected · still counting"));
    (App.ACH_ERA_ORDER || []).forEach(function (eraKey) {
      var items = list.filter(function (a) { return a.era === eraKey; });
      if (!items.length) return;
      var era = el("div", "ps-era");
      var head = el("p", "ps-era-head");
      head.appendChild(el("b", null, (eras[eraKey] || {}).label || eraKey));
      head.appendChild(el("span", "ps-era-cap", (eras[eraKey] || {}).caption || ""));
      era.appendChild(head);
      var grid = el("div", "ps-medals");
      items.forEach(function (a) {
        var cat = (App.ACH_CATEGORIES || {})[a.category];
        var card = el("div", "ps-medal");
        card.appendChild(el("span", "ps-medal-ico", (cat && cat.icon) || "🏅"));
        var txt = el("div");
        txt.appendChild(el("b", null, a.title));
        if (a.year) txt.appendChild(el("span", "ps-medal-year", a.year));
        card.appendChild(txt);
        grid.appendChild(card);
      });
      era.appendChild(grid);
      panel.appendChild(era);
    });
    s.appendChild(panel);
    return s;
  }

  // "back to the site" button for the closing slide - leaves the deck and
  // returns to the top of index.html. Works on phone and desktop.
  function backToSiteBtn() {
    var back = el("button", "btn btn-ghost ps-back", "← Back to the site");
    back.addEventListener("click", function () { exit(); window.scrollTo(0, 0); });
    return back;
  }

  function slideClosing() {
    var s = el("div", "present-slide");
    // the site's real airmail letter, cloned - identical by construction
    // (stamp, hand underline, icon chips, dashed frame all come along)
    var card = document.querySelector("#contact .contact-card");
    if (card) {
      var wrap = el("div", "ps-letter-wrap");
      var clone = card.cloneNode(true);
      clone.classList.remove("reveal");
      clone.classList.add("in");
      wrap.appendChild(clone);
      s.appendChild(wrap);
      s.appendChild(backToSiteBtn());
      return s;
    }
    // fallback if the page's card is ever missing
    var c = App.content;
    var panel = panelEl("ps-center ps-letter");
    panel.appendChild(el("p", "ps-kicker", "thank you"));
    panel.appendChild(el("h1", null, "Let's talk."));
    panel.appendChild(el("p", "ps-body", c.contact.message));
    var mail = el("a", "btn btn-primary", c.contact.cta || "Email me");
    mail.href = "mailto:" + c.identity.email;
    panel.appendChild(mail);
    s.appendChild(panel);
    s.appendChild(backToSiteBtn());
    return s;
  }

  /* ---------- deck assembly ---------- */
  var CHAPTER_LINES = {
    work: "the systems that run the company while everyone sleeps",
    game: "the worlds built after dark",
    academic: "where the discipline was learned — by hand"
  };
  var CHAPTER_TITLES = { work: "WORK SYSTEMS", game: "WORLDS & GAMES", academic: "ACADEMIC FOUNDATIONS" };

  function buildDeck() {
    var c = App.content;
    slides = [];
    // center: short "divider" slides (title, chapter banners, closing) sit in
    // the middle of the stage; content slides stay top-aligned so nothing clips.
    function add(station, build, center) { slides.push({ station: station || null, build: build, center: !!center }); }

    add("Title", slideTitle, true);
    add("Who I am", slideWho);
    ["work", "game", "academic"].forEach(function (cat) {
      var all = c.projects.filter(function (p) { return p.category === cat; });
      if (!all.length) return;
      add(App.CATEGORY_LABELS[cat] || cat, slideBanner(CHAPTER_TITLES[cat] || cat.toUpperCase(), CHAPTER_LINES[cat] || ""), true);
      all.filter(function (p) { return p.featured; }).forEach(function (p) { add(null, slideFeatured(p)); });
      var rest = all.filter(function (p) { return !p.featured; });
      for (var i = 0; i < rest.length; i += 6) {
        add(null, slideShelf(rest.slice(i, i + 6),
          (App.CATEGORY_LABELS[cat] || cat) + " — the rest of the shelf"));
      }
    });
    add("Toolbox", slideToolbox);
    add("Journey", slideJourney);
    add("Achievements", slideAchievements);
    add("Closing", slideClosing, true);

    stations = [];
    slides.forEach(function (s, i) { if (s.station) stations.push({ idx: i, label: s.station }); });
  }

  /* ---------- HUD: the painted road ---------- */
  function buildHud() {
    var hud = $("#present .present-hud");
    hud.innerHTML = "";
    hud.appendChild(el("span", "pr-hint", "← → walk · 1-9 chapters · Esc leave"));

    var road = el("div", "pr-road");
    stations.forEach(function (st, si) {
      var dot = el("button", "pr-dot");
      dot.title = (si + 1) + ". " + st.label;
      dot.style.left = (slides.length > 1 ? st.idx / (slides.length - 1) * 100 : 0) + "%";
      dot.addEventListener("click", function () { manual(); show(st.idx); });
      road.appendChild(dot);
    });
    var suu = el("span", "pr-suu");
    suu.innerHTML = suuSVG();
    road.appendChild(suu);
    hud.appendChild(road);

    var plates = el("div", "pr-plates");
    var counter = el("span", "pr-plate");
    counter.id = "present-counter";
    plates.appendChild(counter);
    var clock = el("span", "pr-plate pr-clock", "0:00");
    clock.id = "present-clock";
    plates.appendChild(clock);
    var auto = el("button", "pr-auto", "auto ▶");
    auto.id = "present-auto";
    auto.title = "kiosk mode: advance every " + (AUTO_MS / 1000) + "s, loop at the end";
    auto.addEventListener("click", toggleAuto);
    plates.appendChild(auto);
    hud.appendChild(plates);
  }
  function syncHud() {
    $("#present-counter").textContent = (idx + 1) + " / " + slides.length;
    var road = $("#present .pr-road");
    var dots = road.querySelectorAll(".pr-dot");
    stations.forEach(function (st, si) {
      var on = idx >= st.idx && (si === stations.length - 1 || idx < stations[si + 1].idx);
      dots[si].classList.toggle("on", on);
    });
    var suu = road.querySelector(".pr-suu");
    suu.style.left = (slides.length > 1 ? idx / (slides.length - 1) * 100 : 0) + "%";
    if (!reduced) {
      suu.classList.remove("hop");
      void suu.offsetWidth;
      suu.classList.add("hop");
    }
  }

  /* ---------- autoplay + clock ---------- */
  function toggleAuto() {
    autoOn = !autoOn;
    var b = $("#present-auto");
    if (b) { b.classList.toggle("on", autoOn); b.textContent = autoOn ? "auto ■" : "auto ▶"; }
    clearTimeout(autoTimer);
    if (autoOn) armAuto();
  }
  function armAuto() {
    clearTimeout(autoTimer);
    if (!open || !autoOn) return;
    autoTimer = setTimeout(function () {
      show(idx + 1 >= slides.length ? 0 : idx + 1);   // kiosk: loop the valley
    }, AUTO_MS);
  }
  function manual() {   // any human input parks the kiosk
    if (autoOn) toggleAuto();
    clearTimeout(autoTimer);
  }
  function tickClock() {
    var c = $("#present-clock");
    if (!c) return;
    var sec = Math.floor((Date.now() - clockT0) / 1000);
    c.textContent = Math.floor(sec / 60) + ":" + ("0" + (sec % 60)).slice(-2);
  }

  /* ---------- show / enter / exit ---------- */
  function show(i) {
    idx = Math.max(0, Math.min(slides.length - 1, i));
    var sl = slides[idx];
    var stage = $("#present-stage");
    stage.classList.toggle("centered", !!sl.center);   // divider slides center; content slides top
    stage.innerHTML = "";
    var node = sl.build();
    stage.appendChild(node);
    if (node._after) node._after();
    stage.scrollTop = 0;
    syncHud();
    // the sky follows the deck: dawn -> night across the slides
    // (dark theme = the visitor chose night: the deck stays under the stars)
    var darkTheme = document.documentElement.getAttribute("data-theme") === "dark";
    holdTime(darkTheme ? 1
      : (sl.t != null ? sl.t : (idx === slides.length - 1 ? 1 : idx / Math.max(1, slides.length - 1) * 0.96)));
    var cloud = $("#present .present-cloud");
    if (cloud && !reduced) {
      cloud.classList.remove("go");
      void cloud.offsetWidth;
      cloud.classList.add("go");
    }
    armAuto();
  }

  function enter() {
    if (open) return;
    App = window.PORTFOLIO_APP;
    if (window.PORTFOLIO_EDITOR && window.PORTFOLIO_EDITOR.isEditing()) window.PORTFOLIO_EDITOR.exit();
    if (window.PORTFOLIO_TOUR && window.PORTFOLIO_TOUR.end) window.PORTFOLIO_TOUR.end();
    open = true;
    buildDeck();
    var box = $("#present");
    if (!box.querySelector(".present-scrim")) {
      var scrim = el("div", "present-scrim");
      scrim.setAttribute("aria-hidden", "true");
      box.insertBefore(scrim, box.firstChild);
      var cloud = el("div", "present-cloud");
      cloud.setAttribute("aria-hidden", "true");
      box.insertBefore(cloud, scrim.nextSibling);
    }
    buildHud();
    box.hidden = false;
    document.body.classList.add("presenting");   // page chrome steps aside; the valley stays
    document.body.style.overflow = "hidden";
    autoOn = false;
    clockT0 = Date.now();
    tickClock();
    clockIv = setInterval(tickClock, 1000);
    show(0);
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(function () {});
    }
  }
  function exit() {
    if (!open) return;
    open = false;
    manual();
    clearInterval(clockIv);
    $("#present").hidden = true;
    document.body.classList.remove("presenting");
    document.body.style.overflow = "";
    releaseTime();   // the sky goes back to the scroll
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
  }

  /* ---------- input ---------- */
  function wireSwipe() {
    var stage = $("#present-stage"), x0 = null;
    stage.addEventListener("touchstart", function (ev) {
      x0 = ev.touches[0].clientX;
    }, { passive: true });
    stage.addEventListener("touchend", function (ev) {
      if (x0 == null) return;
      var dx = ev.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) < 60) return;
      manual();
      show(dx < 0 ? idx + 1 : idx - 1);
    }, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", function () {
    App = window.PORTFOLIO_APP;
    $("#btn-present").addEventListener("click", enter);
    wireSwipe();
    document.addEventListener("keydown", function (ev) {
      var tag = (document.activeElement || {}).tagName;
      var typing = tag === "INPUT" || tag === "TEXTAREA" || (document.activeElement && document.activeElement.isContentEditable);
      if (!open) {
        if ((ev.key === "p" || ev.key === "P") && !typing && !ev.ctrlKey && !ev.metaKey) enter();
        return;
      }
      if (ev.key === "Escape") { exit(); return; }
      if (typing) return;
      if (ev.key === "ArrowRight" || ev.key === "PageDown" || ev.key === " ") {
        ev.preventDefault(); manual(); show(idx + 1);
      } else if (ev.key === "ArrowLeft" || ev.key === "PageUp") {
        ev.preventDefault(); manual(); show(idx - 1);
      } else if (ev.key === "Home") {
        manual(); show(0);
      } else if (/^[1-9]$/.test(ev.key)) {
        var st = stations[+ev.key - 1];
        if (st) { manual(); show(st.idx); }
      }
    });
  });

  window.PORTFOLIO_PRESENT = {
    enter: enter, exit: exit, show: show,
    state: function () {
      return open ? { idx: idx, slides: slides.length, stations: stations.length, auto: autoOn } : null;
    }
  };
})();
