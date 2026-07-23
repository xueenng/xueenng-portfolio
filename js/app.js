/* ============================================================
   app.js - render engine (schema 2).
   Reads content (localStorage override -> content.js default),
   migrates old saved edits forward, renders every section,
   wires theme + filters. No personal data lives here.
   ============================================================ */
(function () {
  "use strict";

  var LS_KEY = "portfolio.content";
  var LS_THEME = "portfolio.theme";
  var CATEGORY_LABELS = { work: "Work Systems", game: "Game Dev", academic: "Academic" };

  /* ---------- migration: schema 1 -> 2 ---------- */
  function migrate(c) {
    if (!c || !c.identity || !c.projects) return null;
    if (c.schema === 2) return c;
    if (c.schema !== 1) return null;
    c.schema = 2;
    c.meta.defaultTheme = "light";
    c.identity.monogram = c.identity.monogram || (c.identity.name || "XE")
      .split(/\s+/).map(function (w) { return w[0] || ""; }).join("").slice(0, 2).toUpperCase();
    c.hero.kicker = "Portfolio of " + c.identity.name;
    c.hero.headline = (c.identity.tagline || "Hello.").replace(/\. /g, ".\n");
    c.hero.subline = "Every project below is interactive - press Run and watch it work.";
    c.now = c.now || [];
    c.sections = c.sections || {};
    c.sections.selected = c.sections.selected || { heading: "Selected work", sub: "" };
    c.projects.forEach(function (p, i) {
      p.category = p.category || "work";
      var ym = (p.period || "").match(/20\d\d/);
      p.year = p.year || (ym ? ym[0] : "");
      p.featured = i === 0;
      p.exhibit = p.exhibit || { type: p.demo ? "demo" : "none", demo: p.demo || "" };
      delete p.demo;
    });
    return c;
  }

  function loadContent() {
    var base = window.PORTFOLIO_CONTENT;
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var saved = migrate(JSON.parse(raw));
        if (saved) {
          // phone was removed from the site for privacy - scrub old saved copies
          // so it can never ride back out via Export / Publish
          if (saved.identity) delete saved.identity.phone;
          // hero photo added after the edits were saved
          if (saved.identity && !saved.identity.photo && base.identity.photo) {
            saved.identity.photo = base.identity.photo;
            saved.identity.photoCaption = saved.identity.photoCaption || base.identity.photoCaption;
          }
          // backfill sections added after the edits were saved
          if (!saved.achievements && base.achievements) {
            saved.achievements = JSON.parse(JSON.stringify(base.achievements));
            saved.achievementEras = JSON.parse(JSON.stringify(base.achievementEras));
          }
          if (saved.sections && !saved.sections.achievements && base.sections.achievements) {
            saved.sections.achievements = JSON.parse(JSON.stringify(base.sections.achievements));
          }
          return saved;
        }
      }
    } catch (e) {
      console.warn("Saved content unreadable, using file defaults.", e);
    }
    return JSON.parse(JSON.stringify(base));
  }

  /* ---------- helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function getPath(obj, path) {
    return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }
  function setPath(obj, path, val) {
    var keys = path.split("."), o = obj;
    for (var i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = val;
  }
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._h);
    toast._h = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ---------- theme + accent ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(LS_THEME, theme); } catch (e) {}
  }
  function applyAccent(hex) {
    document.documentElement.style.setProperty("--accent", hex);
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    document.documentElement.style.setProperty("--accent-ink", lum > 140 ? "#1a1508" : "#ffffff");
  }

  /* ---------- render: bound text ---------- */
  function renderBound(content) {
    $all("[data-edit]").forEach(function (node) {
      var val = getPath(content, node.getAttribute("data-edit"));
      if (typeof val === "string") node.textContent = val;
    });
    document.title = content.meta.siteTitle || content.identity.name;
  }

  /* ---------- hero stats ---------- */
  function renderHeroStats(content) {
    var wrap = $("#hero-stats");
    wrap.innerHTML = "";
    content.hero.stats.forEach(function (s, i) {
      var d = el("div", "stat reveal");
      var b = el("b", null, s.value);
      if (!s.live) b.setAttribute("data-edit", "hero.stats." + i + ".value"); // live stats compute their own value
      var sp = el("span", null, s.label); sp.setAttribute("data-edit", "hero.stats." + i + ".label");
      d.appendChild(b); d.appendChild(sp);
      wrap.appendChild(d);
      if (s.live) startLiveStat(b, s.live);
    });
  }

  // A hero stat whose number is computed live and keeps climbing, never hardcoded.
  function startLiveStat(bEl, live) {
    function fmtInt(n) { return Math.max(0, Math.floor(n)).toLocaleString(); }

    if (live.kind === "hours") {
      // Linear from 0 at startDate through asOfValue at asOf, then onward at the same pace.
      var start = Date.parse(live.startDate + "T00:00:00");
      var asOf = Date.parse(live.asOf + "T00:00:00");
      var rate = live.asOfValue / (asOf - start);            // value per millisecond
      var now = function () { return rate * (Date.now() - start); };
      countUp(bEl, now(), fmtInt);
      setInterval(function () { bEl.textContent = fmtInt(now()); }, 5000);

    } else if (live.kind === "visitors") {
      // A static site can't tally its own visitors; the global count comes from a service.
      liveVisitorCount(live).then(function (n) {
        if (n == null) return;                                // leave the seed/fallback text
        countUp(bEl, n, fmtInt);
      });
    }
  }

  // Ease-out count-up so the number visibly "counts" on reveal, landing on the true value.
  function countUp(elm, target, fmt) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !target || target < 1) { elm.textContent = fmt(target); return; }
    var dur = 1200, t0 = performance.now();
    (function step(t) {
      var p = Math.min(1, (t - t0) / dur);
      elm.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step); else elm.textContent = fmt(target);
    })(performance.now());
  }

  // Reads the live global count from GoatCounter's counter endpoint (cookieless, CORS-enabled).
  function liveVisitorCount(live) {
    if (!live.goatcounter || typeof fetch !== "function") return Promise.resolve(null);
    return fetch(live.goatcounter).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) return null;
        var raw = j.count_unique != null ? j.count_unique : j.count;
        var n = parseInt(String(raw).replace(/[^0-9]/g, ""), 10);
        return isNaN(n) ? null : n;
      })
      .catch(function () { return null; });
  }

  /* ---------- hero polaroid: the visitor's photo pinned into the scene ---------- */
  function renderHeroPhoto(content) {
    var box = $("#hero-photo");
    if (!box) return;
    box.innerHTML = "";
    var pol = el("div", "hero-polaroid");
    var suu = el("span", "hp-suu");           // Suu peeks over the top edge
    suu.innerHTML = suuSpriteSVG();
    pol.appendChild(suu);
    var card = el("div", "hp-card");
    card.setAttribute("data-edit-image", "identity.photo");
    var frame = el("div", "hp-frame");
    if (content.identity.photo) {
      var img = document.createElement("img");
      img.src = content.identity.photo;
      img.alt = content.identity.name;
      frame.appendChild(img);
    } else {
      var ph = el("div", "hp-empty");
      ph.appendChild(el("b", null, content.identity.monogram || "XE"));
      ph.appendChild(el("span", null, "your photo here - Ctrl+E, then click me"));
      frame.appendChild(ph);
    }
    card.appendChild(frame);
    var cap = el("span", "hp-cap", content.identity.photoCaption || "hello, it's me");
    cap.setAttribute("data-edit", "identity.photoCaption");
    card.appendChild(cap);
    pol.appendChild(card);
    pol.appendChild(el("span", "hp-tape hp-tape-l"));
    pol.appendChild(el("span", "hp-tape hp-tape-r"));
    var leaf = el("span", "hp-leaf");        // a sprig claiming the corner
    leaf.innerHTML = '<svg viewBox="0 0 60 40" aria-hidden="true">' +
      '<path d="M4 36 C14 28 24 24 40 22" stroke="#5f9455" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="20" cy="26" rx="8" ry="4" fill="#6ca25e" transform="rotate(-24 20 26)"/>' +
      '<ellipse cx="34" cy="21" rx="8" ry="4" fill="#5d9455" transform="rotate(-16 34 21)"/>' +
      '<ellipse cx="47" cy="19" rx="7" ry="3.6" fill="#549049" transform="rotate(-8 47 19)"/></svg>';
    pol.appendChild(leaf);
    box.appendChild(pol);
  }

  /* ---------- now strip ---------- */
  function renderNow(content) {
    var list = $("#now-list");
    list.innerHTML = "";
    (content.now || []).forEach(function (item, i) {
      var li = el("li", null, item);
      li.setAttribute("data-edit", "now." + i);
      list.appendChild(li);
    });
    $("#now").style.display = (content.now && content.now.length) || document.body.classList.contains("editing") ? "" : "none";
  }

  /* ---------- case study block (shared) ---------- */
  /* the hook (problem + impact) reads immediately; the build and the result
     stay folded so a project fits one screen. Edit mode forces it all open. */
  function caseBlock(p, i, cls) {
    var box = el("div", cls);
    function para(label, key) {
      var node = el("p");
      node.appendChild(el("b", null, label));
      var span = el("span", null, p[key]);
      span.setAttribute("data-edit", "projects." + i + "." + key);
      node.appendChild(span);
      return node;
    }
    box.appendChild(para("THE PROBLEM", "problem"));
    var more = el("div", "case-more");
    more.appendChild(para("WHAT I BUILT", "action"));
    more.appendChild(para("THE RESULT", "outcome"));
    box.appendChild(more);
    var toggle = el("button", "case-toggle", "read the full story");
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", function () {
      var open = box.classList.toggle("open");
      toggle.textContent = open ? "show less" : "read the full story";
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    box.appendChild(toggle);
    var imp = el("p", "feature-impact", p.impact);
    imp.setAttribute("data-edit", "projects." + i + ".impact");
    box.appendChild(imp);
    return box;
  }
  function stackRow(p, i) {
    var stack = el("div", "feature-stack");
    stack.setAttribute("data-pi", i);
    p.stack.forEach(function (s, si) {
      var t = el("span", "tag", s);
      t.setAttribute("data-edit", "projects." + i + ".stack." + si);
      stack.appendChild(t);
    });
    return stack;
  }
  function linksRow(p) {
    var row = el("div", "proj-links");
    (p.links || []).forEach(function (l) {
      if (!l.url) return;
      var a = document.createElement("a");
      a.className = "tag proj-link";
      a.textContent = l.label + " ↗";
      a.href = l.url;
      a.target = "_blank";
      a.rel = "noopener";
      row.appendChild(a);
    });
    // screenshots ride here as a blinking reel button instead of a tall grid
    var shots = p.exhibit && p.exhibit.images;
    if (shots && shots.length && window.PORTFOLIO_EXHIBITS && window.PORTFOLIO_EXHIBITS.filmstrip) {
      var b = el("button", "tag film-btn", "🎞 " + shots.length + " screenshots");
      b.title = "Open the filmstrip";
      b.addEventListener("click", function () {
        window.PORTFOLIO_EXHIBITS.filmstrip(shots, p.title);
      });
      row.appendChild(b);
    }
    return row.childNodes.length ? row : null;
  }

  /* ---------- featured work ---------- */
  function renderFeatures(content) {
    var wrap = $("#features");
    wrap.innerHTML = "";
    content.projects.forEach(function (p, i) {
      if (!p.featured) return;
      var f = el("article", "feature reveal");
      f.setAttribute("data-project", p.id);

      var info = el("div", "feature-info");
      info.appendChild(el("p", "f-cat", (CATEGORY_LABELS[p.category] || p.category) + " - " + (p.year || "")));
      var h3 = el("h3", null, p.title); h3.setAttribute("data-edit", "projects." + i + ".title");
      info.appendChild(h3);
      var meta = el("p");
      meta.appendChild(el("span", "badge " + p.status, p.status));
      var pd = el("span", "gc-year", "  " + p.period); pd.setAttribute("data-edit", "projects." + i + ".period");
      meta.appendChild(pd);
      info.appendChild(meta);
      var sub = el("p", "f-sub", p.subtitle); sub.setAttribute("data-edit", "projects." + i + ".subtitle");
      info.appendChild(sub);
      info.appendChild(caseBlock(p, i, "feature-case"));
      info.appendChild(stackRow(p, i));
      var flr = linksRow(p);
      if (flr) info.appendChild(flr);
      f.appendChild(info);

      var ex = el("div", "feature-exhibit");
      f.appendChild(ex);
      window.PORTFOLIO_EXHIBITS.render(ex, p);

      wrap.appendChild(f);
    });
  }

  /* ---------- all projects: filters + grid ---------- */
  var activeFilter = "all";
  var openProjectId = null;

  function renderFilters(content) {
    var bar = $("#filters");
    bar.innerHTML = "";
    var counts = { all: content.projects.length };
    content.projects.forEach(function (p) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    var cats = ["all"].concat(Object.keys(CATEGORY_LABELS).filter(function (c) { return counts[c]; }));
    cats.forEach(function (cat) {
      var chip = el("button", "chip" + (activeFilter === cat ? " on" : ""));
      chip.setAttribute("role", "tab");
      chip.innerHTML = (cat === "all" ? "All" : CATEGORY_LABELS[cat]) + "<span class='n'>" + (counts[cat] || 0) + "</span>";
      chip.addEventListener("click", function () {
        activeFilter = cat;
        openProjectId = null;
        gridExpanded = false; // each category view starts folded again
        renderFilters(content);
        renderGrid(content);
        if (window.PORTFOLIO_MOTION) window.PORTFOLIO_MOTION.rewire();
        if (document.body.classList.contains("editing") && window.PORTFOLIO_EDITOR) window.PORTFOLIO_EDITOR.rewire();
      });
      bar.appendChild(chip);
    });
  }

  /* reading desk: the opened book - shared by the library and the edit grid */
  function projectDetail(p, i, content) {
    var d = el("div", "grid-detail");
    var close = el("button", "gd-close", "×");
    close.title = "Close";
    close.addEventListener("click", function () {
      openProjectId = null;
      renderGrid(content);
      if (window.PORTFOLIO_MOTION) window.PORTFOLIO_MOTION.rewire();
    });
    d.appendChild(close);
    var left = el("div");
    left.appendChild(caseBlock(p, i, "feature-case"));
    left.appendChild(stackRow(p, i));
    var glr = linksRow(p);
    if (glr) left.appendChild(glr);
    d.appendChild(left);
    var ex = el("div", "feature-exhibit");
    d.appendChild(ex);
    window.PORTFOLIO_EXHIBITS.render(ex, p);
    return d;
  }

  /* Suu at a signpost: the grid's trail marker. Three states - "more"
     invites expanding past the first six, "less" (at the end of the
     expanded grid) folds back, and "end" marks a trail where nothing is
     hidden (6 or fewer builds). Purely data-driven, so a category that
     grows past six automatically gains the working signpost. */
  var GRID_LIMIT = 6;
  var gridExpanded = false;
  function signpost(mode, n, content) {
    var isEnd = mode === "end";
    var wrap = el(isEnd ? "div" : "button", "grid-more reveal" + (isEnd ? " end" : ""));
    if (!isEnd) {
      wrap.setAttribute("aria-label", mode === "more" ? "Show all projects" : "Show only the first six projects");
    }
    // board is sized to hold the longest label ("999 more builds this way")
    var board = mode === "more" ? '<path d="M20 32 H250 L282 54 L250 76 H20 Z"'
      : mode === "less" ? '<path d="M50 32 H280 V76 H50 L18 54 Z"'
      : '<rect x="55" y="32" width="190" height="44" rx="7"';
    var label = mode === "more" ? n + " more " + (n === 1 ? "build" : "builds") + " this way"
      : mode === "less" ? "back to the first six"
      : "the trail ends here";
    var tx = mode === "more" ? 135 : mode === "less" ? 165 : 150;
    wrap.innerHTML =
      '<span class="gm-suu">' + suuSpriteSVG() + "</span>" +
      '<svg viewBox="0 0 300 128" aria-hidden="true">' +
      '<ellipse cx="150" cy="119" rx="86" ry="8" fill="rgba(60,50,30,.15)"/>' +
      '<rect x="144" y="24" width="12" height="94" fill="#8a6242" stroke="#5d4a33" stroke-width="2.5"/>' +
      board + ' fill="#f7ecd2" stroke="#5d4a33" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<text x="' + tx + '" y="59" text-anchor="middle" font-size="14.5" font-weight="700" fill="#5d4a33">' + label + "</text>" +
      "</svg>";
    if (!isEnd) {
      wrap.addEventListener("click", function () {
        gridExpanded = mode === "more";
        renderGrid(content);
        if (window.PORTFOLIO_MOTION) window.PORTFOLIO_MOTION.rewire();
        if (mode === "less") $("#projects").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    return wrap;
  }

  function renderGrid(content) {
    var grid = $("#grid");
    grid.innerHTML = "";
    grid.className = "grid";
    var editing = document.body.classList.contains("editing");
    var visible = [];
    content.projects.forEach(function (p, i) {
      if (activeFilter !== "all" && p.category !== activeFilter) return;
      visible.push({ p: p, i: i });
    });
    var folded = !editing && !gridExpanded && visible.length > GRID_LIMIT;
    (folded ? visible.slice(0, GRID_LIMIT) : visible).forEach(function (it) {
      var p = it.p, i = it.i;

      var card = el("article", "grid-card reveal");
      card.setAttribute("data-project", p.id);
      var top = el("div", "gc-top");
      top.appendChild(el("span", "gc-cat", CATEGORY_LABELS[p.category] || p.category));
      top.appendChild(el("span", "badge " + p.status, p.status));
      var yr = el("span", "gc-year", p.year); yr.setAttribute("data-edit", "projects." + i + ".year");
      top.appendChild(yr);
      card.appendChild(top);
      var h3 = el("h3", null, p.title); h3.setAttribute("data-edit", "projects." + i + ".title");
      card.appendChild(h3);
      var sub = el("p", "gc-sub", p.subtitle); sub.setAttribute("data-edit", "projects." + i + ".subtitle");
      card.appendChild(sub);
      card.appendChild(el("p", "gc-open", openProjectId === p.id ? "Close" : "Open project"));
      card.addEventListener("click", function (ev) {
        if (document.body.classList.contains("editing")) return; // clicks edit text instead
        if (ev.target.closest("a, button, select, input")) return;
        openProjectId = openProjectId === p.id ? null : p.id;
        renderGrid(content);
        if (window.PORTFOLIO_MOTION) window.PORTFOLIO_MOTION.rewire();
      });
      grid.appendChild(card);

      if (openProjectId === p.id) {
        grid.appendChild(projectDetail(p, i, content));
      }
    });
    if (!editing && visible.length) {
      if (folded) grid.appendChild(signpost("more", visible.length - GRID_LIMIT, content));
      else if (visible.length > GRID_LIMIT) grid.appendChild(signpost("less", 0, content));
      else grid.appendChild(signpost("end", 0, content));
    }
  }

  /* ---------- avatar / skills / journey / contact ---------- */
  function renderAvatar(content) {
    var wrap = $("#avatar-wrap");
    wrap.innerHTML = "";
    if (content.identity.avatar) {
      var img = document.createElement("img");
      img.src = content.identity.avatar;
      img.alt = content.identity.name;
      wrap.appendChild(img);
    } else {
      wrap.appendChild(el("div", "avatar-fallback", content.identity.monogram || "XE"));
    }
    wrap.setAttribute("data-edit-image", "identity.avatar");
  }

  function renderSkills(content) {
    var grid = $("#skills-grid");
    grid.innerHTML = "";
    // one latch for the skimmers: open (or close) every box at once
    var allBtn = el("button", "toolbox-all", "open every box");
    allBtn.addEventListener("click", function () {
      var boxes = $all(".skill-group", grid);
      var anyClosed = boxes.some(function (b) { return !b.classList.contains("open"); });
      boxes.forEach(function (b) { b.classList.toggle("open", anyClosed); });
      allBtn.textContent = anyClosed ? "close every box" : "open every box";
    });
    grid.appendChild(allBtn);
    content.skills.forEach(function (g, gi) {
      var box = el("div", "skill-group toolbox reveal");
      // the painted toolbox itself: body, gold latch band, handle, label plate
      var art = el("div", "tb-art");
      // viewBox has 18 units of headroom above y=0 so the 12px-raised lid never clips
      art.innerHTML =
        '<svg viewBox="0 -18 320 176" aria-hidden="true">' +
        '<ellipse cx="160" cy="150" rx="130" ry="7" fill="rgba(60,50,30,.16)"/>' +
        '<g class="tb-lid">' +
        '<path d="M132 30 v-9 a12 12 0 0 1 12 -12 h32 a12 12 0 0 1 12 12 v9" fill="none" stroke="#5d4a33" stroke-width="12" stroke-linecap="round"/>' +
        '<path d="M132 30 v-9 a12 12 0 0 1 12 -12 h32 a12 12 0 0 1 12 12 v9" fill="none" stroke="#6e4f34" stroke-width="7" stroke-linecap="round"/>' +
        '<rect x="24" y="28" width="272" height="30" rx="9" fill="#a8854c" stroke="#5d4a33" stroke-width="3"/>' +
        '<path d="M40 43 H280" stroke="#5d4a33" stroke-width="1.6" opacity=".3"/></g>' +
        '<rect x="16" y="56" width="288" height="88" rx="10" fill="#8a6242" stroke="#5d4a33" stroke-width="3"/>' +
        '<rect x="16" y="56" width="288" height="20" fill="#e8b23a" stroke="#5d4a33" stroke-width="2.6"/>' +
        '<g stroke="#5d4a33" stroke-width="2.2"><rect x="66" y="60" width="18" height="26" rx="4" fill="#d6cbae"/>' +
        '<rect x="236" y="60" width="18" height="26" rx="4" fill="#d6cbae"/>' +
        '<path d="M75 66 v8 M245 66 v8"/></g>' +
        '<rect x="60" y="96" width="200" height="38" rx="8" fill="#c25742" stroke="#5d4a33" stroke-width="2.6"/>' +
        '<rect x="67" y="102" width="186" height="26" rx="5" fill="#e8b23a" stroke="#5d4a33" stroke-width="1.8"/>' +
        "</svg>";
      box.appendChild(art);
      var h = el("h3", null, g.group); h.setAttribute("data-edit", "skills." + gi + ".group");
      h.setAttribute("role", "button");
      h.setAttribute("tabindex", "0");
      function toggle() {
        if (document.body.classList.contains("editing")) return; // edit mode keeps all open
        box.classList.toggle("open");
        h.setAttribute("aria-expanded", box.classList.contains("open") ? "true" : "false");
      }
      h.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); toggle(); }
      });
      art.addEventListener("click", toggle); // whole box (label included) toggles
      // the label lives INSIDE the art, so it stays glued to the plate no
      // matter how tall the box grows when the tray below opens
      art.appendChild(h);
      var ul = el("ul");
      g.items.forEach(function (item, ii) {
        var li = el("li", "tag", item);
        li.setAttribute("data-edit", "skills." + gi + ".items." + ii);
        li.style.transitionDelay = (ii * 45) + "ms"; // tags pop out one by one
        ul.appendChild(li);
      });
      box.appendChild(ul);
      grid.appendChild(box);
    });
  }

  /* ---------- journey: plain timeline OR the adventure map ----------
     The map draws the road straight onto the painted valley (no panel),
     shows every chapter's full story beside its stop, and Suu walks the
     road: click a stop to send Suu there (default), "let Suu walk" plays
     the whole journey, "reset" ghosts everything and returns Suu to 01. */
  var journeyView = "timeline";
  var jState = { visited: {}, at: 0, busy: false };

  function renderJourney(content) {
    var editing = document.body.classList.contains("editing");
    if (editing) journeyView = "timeline"; // editing always happens on the timeline

    // view switch chips
    var bar = $("#journey-view");
    bar.innerHTML = "";
    bar.style.display = editing ? "none" : "";
    if (!editing) {
      [["timeline", "Timeline"], ["map", "Adventure map"]].forEach(function (v) {
        var chip = el("button", "chip" + (journeyView === v[0] ? " on" : ""), v[1]);
        chip.setAttribute("role", "tab");
        chip.addEventListener("click", function () {
          if (journeyView === v[0]) return;
          journeyView = v[0];
          renderJourney(content);
          if (window.PORTFOLIO_MOTION) window.PORTFOLIO_MOTION.rewire();
        });
        bar.appendChild(chip);
      });
    }

    // plain timeline (always rendered; hidden behind the map view)
    var tl = $("#timeline");
    tl.style.display = journeyView === "timeline" || editing ? "" : "none";
    tl.innerHTML = "";
    content.timeline.forEach(function (t, ti) {
      var item = el("div", "tl-item reveal");
      var pd = el("div", "tl-period", t.period); pd.setAttribute("data-edit", "timeline." + ti + ".period");
      var role = el("div", "tl-role", t.role); role.setAttribute("data-edit", "timeline." + ti + ".role");
      var org = el("div", "tl-org", t.org); org.setAttribute("data-edit", "timeline." + ti + ".org");
      item.appendChild(pd); item.appendChild(role); item.appendChild(org);
      if (t.points && t.points.length) {
        var ul = el("ul", "tl-points");
        t.points.forEach(function (pt, pi) {
          var li = el("li", null, pt);
          li.setAttribute("data-edit", "timeline." + ti + ".points." + pi);
          ul.appendChild(li);
        });
        item.appendChild(ul);
      }
      tl.appendChild(item);
    });

    var adv = $("#journey-adventure");
    if (journeyView === "map" && !editing) {
      adv.hidden = false;
      buildAdventure(content, adv);
    } else {
      adv.hidden = true;
      adv.innerHTML = "";
    }
  }

  /* the adventure map is a side-scrolling journey: the road is longer than
     the frame, so walking moves the WORLD - the road slides past Suu while
     painted hills drift slower behind her, and the chapter she is standing
     in is the one shown below. */
  var jResize = null;
  function buildAdventure(content, adv) {
    var INK = "#5d4a33";
    var stops = content.timeline.slice().reverse();   // oldest chapter first
    var n = stops.length;
    if (n < 2) { adv.innerHTML = ""; return; }
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var narrow = window.matchMedia("(max-width: 760px)").matches;

    var SPACING = narrow ? 300 : 520;
    var STAGE_H = narrow ? 200 : 250;
    var ROAD_Y = STAGE_H - 74;
    var EDGE = narrow ? 150 : 280;
    var stationX = stops.map(function (t, i) { return EDGE + i * SPACING; });
    var trackW = stationX[n - 1] + EDGE;

    /* ---------- painted pieces ---------- */
    function glyph(i, last) {
      if (last) return '<path d="M44 -50 V-24 M44 -50 L66 -43 L44 -36" fill="#e8b23a" stroke="' + INK + '" stroke-width="2.2"/>';
      if (i === 0) return '<path d="M-44 -50 V-24 M-44 -50 L-24 -44 L-44 -38" fill="#c25742" stroke="' + INK + '" stroke-width="2.2"/>';
      if (i === 1) return '<g stroke="' + INK + '" stroke-width="2"><rect x="38" y="-46" width="26" height="16" rx="2" fill="#f7ecd2"/><path d="M51 -46 V-30"/></g>';
      if (i === 2) return '<path d="M38 -24 V-42 a13 13 0 0 1 26 0 V-24" fill="#d6cbae" stroke="' + INK + '" stroke-width="2.4"/>';
      return '<g stroke="' + INK + '" stroke-width="2.2"><rect x="38" y="-40" width="28" height="16" fill="#9aa0a8"/><rect x="44" y="-52" width="7" height="12" fill="#6d7278"/></g>';
    }
    function postSVG(i, t) {
      var last = i === n - 1;
      // the place name rides a cream plate in dark-brown ink, so it stays
      // readable over both the daylit and the night-time valley
      var place = t.place || t.period;
      var pw = Math.max(62, place.length * 8.8 + 22);
      var hitW = Math.max(108, pw + 14);
      return '<g class="ja-post" data-mi="' + i + '" transform="translate(' + stationX[i] + "," + ROAD_Y + ')">' +
        '<rect x="-3" y="-72" width="6" height="72" fill="#8a6242" stroke="' + INK + '" stroke-width="2"/>' +
        '<rect x="-33" y="-101" width="66" height="30" rx="6" fill="#f7ecd2" stroke="' + INK + '" stroke-width="2.4"/>' +
        '<text x="0" y="-80" text-anchor="middle" font-size="16" font-weight="800" fill="' + INK + '">' +
        ((i < 9 ? "0" : "") + (i + 1)) + "</text>" +
        glyph(i, last) +
        '<circle r="9.5" fill="#f7ecd2" stroke="' + INK + '" stroke-width="2.6"/>' +
        '<circle class="ja-pin" r="3.8" fill="' + (last ? "#e8b23a" : "#c25742") + '"/>' +
        '<rect class="ja-plate" x="' + (-pw / 2) + '" y="22" width="' + pw + '" height="25" rx="7" fill="#f7ecd2" stroke="' + INK + '" stroke-width="2.2"/>' +
        '<text y="39.5" text-anchor="middle" font-size="13.5" font-weight="700" fill="#4a3a26">' + place + "</text>" +
        '<rect x="' + (-hitW / 2) + '" y="-110" width="' + hitW + '" height="162" fill="transparent" style="cursor:pointer"/></g>';
    }
    function trackSVG() {
      var s = '<svg width="' + trackW + '" height="' + STAGE_H + '" viewBox="0 0 ' + trackW + " " + STAGE_H + '">' +
        '<rect x="0" y="' + (ROAD_Y - 14) + '" width="' + trackW + '" height="28" fill="#6e5a44" opacity=".92"/>' +
        '<line x1="0" y1="' + ROAD_Y + '" x2="' + trackW + '" y2="' + ROAD_Y +
        '" stroke="#f7ecd2" stroke-width="3" stroke-dasharray="15 13" opacity=".85"/>';
      stops.forEach(function (t, i) { s += postSVG(i, t); });
      return s + "</svg>";
    }
    function farSVG() {   // distant hills - drift slowest
      var y = ROAD_Y + 4, d = "M0 " + y, x;
      for (x = 0; x <= trackW; x += 280) {
        d += " Q " + (x + 140) + " " + (y - 78 - ((x / 280) % 2) * 30) + " " + (x + 280) + " " + y;
      }
      d += " L " + trackW + " " + STAGE_H + " L 0 " + STAGE_H + " Z";
      return '<svg width="' + trackW + '" height="' + STAGE_H + '" viewBox="0 0 ' + trackW + " " + STAGE_H + '">' +
        '<path d="' + d + '" fill="#6c9a58" opacity=".26"/></svg>';
    }
    function midSVG() {   // roadside trees - drift at middle speed
      var s = '<svg width="' + trackW + '" height="' + STAGE_H + '" viewBox="0 0 ' + trackW + " " + STAGE_H + '">', x;
      for (x = 80; x < trackW; x += 205) {
        var h = 24 + ((x / 205) % 3) * 9, yb = ROAD_Y - 20;
        s += '<g opacity=".45" transform="translate(' + x + "," + yb + ')">' +
          '<rect x="-3" y="' + -h + '" width="6" height="' + h + '" fill="#8a6242"/>' +
          '<circle cy="' + -(h + 12) + '" r="15" fill="#5d9455"/>' +
          '<circle cx="-10" cy="' + -(h + 4) + '" r="9.5" fill="#6ca25e"/></g>';
      }
      return s + "</svg>";
    }

    /* ---------- DOM ---------- */
    adv.innerHTML = "";
    var ctl = el("div", "ja-controls");
    var autoB = el("button", "chip", "let Suu walk");
    var resetB = el("button", "chip", "reset journey");
    var prog = el("span", "ja-progress");
    ctl.appendChild(autoB); ctl.appendChild(resetB); ctl.appendChild(prog);
    adv.appendChild(ctl);

    var stage = el("div", "ja-stage");
    stage.style.height = STAGE_H + "px";
    var far = el("div", "ja-layer ja-far"); far.innerHTML = farSVG();
    var mid = el("div", "ja-layer ja-mid"); mid.innerHTML = midSVG();
    var track = el("div", "ja-layer ja-track"); track.innerHTML = trackSVG();
    var suuEl = el("div", "ja-suu");
    suuEl.innerHTML = suuSpriteSVG();
    suuEl.style.top = (ROAD_Y - 38) + "px";
    track.appendChild(suuEl);
    stage.appendChild(far); stage.appendChild(mid); stage.appendChild(track);
    adv.appendChild(stage);

    var nav = el("div", "ja-nav");
    var prevB = el("button", "ja-arrow", "◄");
    prevB.title = "previous chapter";
    var dots = el("div", "ja-dots");
    var nextB = el("button", "ja-arrow", "►");
    nextB.title = "next chapter";
    nav.appendChild(prevB); nav.appendChild(dots); nav.appendChild(nextB);
    adv.appendChild(nav);

    var card = el("div", "ja-card");
    adv.appendChild(card);

    var dotEls = stops.map(function (t, i) {
      var b = el("button", "ja-dot-btn");
      b.title = (i + 1) + ". " + (t.place ? t.place + " - " : "") + t.role;
      b.addEventListener("click", function () { stopAuto(); walkTo(i); });
      dots.appendChild(b);
      return b;
    });

    /* ---------- camera + walking ---------- */
    var curX = stationX[jState.at], facing = 1, raf = null, stageW = 900;
    function measure() { stageW = stage.clientWidth || 900; }
    function paint(hop) {
      suuEl.style.left = curX + "px";
      suuEl.style.transform = "translate(-50%," + (-(hop || 0)).toFixed(1) + "px)" + (facing < 0 ? " scaleX(-1)" : "");
      var cam = Math.max(0, Math.min(Math.max(0, trackW - stageW), curX - stageW * 0.3));
      track.style.transform = "translateX(" + (-cam).toFixed(1) + "px)";
      mid.style.transform = "translateX(" + (-cam * 0.55).toFixed(1) + "px)";
      far.style.transform = "translateX(" + (-cam * 0.22).toFixed(1) + "px)";
    }
    function syncUI() {
      var v = Object.keys(jState.visited).length;
      prog.textContent = v + " / " + n + " chapters";
      dotEls.forEach(function (b, i) {
        b.classList.toggle("on", i === jState.at);
        b.classList.toggle("seen", !!jState.visited[i]);
      });
      prevB.disabled = jState.at === 0;
      nextB.disabled = jState.at === n - 1;
    }
    function celebrate() {
      for (var i = 0; i < 9; i++) {
        var leaf = el("span", "ja-leaf");
        leaf.style.left = (10 + Math.random() * 80) + "%";
        leaf.style.animationDelay = (Math.random() * 0.9).toFixed(2) + "s";
        leaf.style.background = ["#6ca25e", "#e8b23a", "#c25742"][i % 3];
        stage.appendChild(leaf);
        (function (lf) { setTimeout(function () { lf.remove(); }, 3400); })(leaf);
      }
    }
    function visit(mi) {
      var post = track.querySelector('.ja-post[data-mi="' + mi + '"]');
      if (post) post.classList.add("lit");
      if (jState.visited[mi]) return;
      jState.visited[mi] = true;
      if (post && !reduced) {
        var sp = el("span", "ja-spark");
        sp.style.left = stationX[mi] + "px";
        sp.style.top = ROAD_Y + "px";
        track.appendChild(sp);
        setTimeout(function () { sp.remove(); }, 900);
      }
      if (mi === n - 1 && !reduced) celebrate();
    }
    function showCard(mi) {
      var t = stops[mi];
      card.innerHTML = "";
      var head = el("div", "ja-head");
      head.appendChild(el("b", "ja-num", (mi < 9 ? "0" : "") + (mi + 1)));
      var tt = el("div");
      tt.appendChild(el("div", "ja-place", (t.place ? t.place + " · " : "") + t.period));
      tt.appendChild(el("div", "ja-role", t.role));
      tt.appendChild(el("div", "ja-org", t.org));
      head.appendChild(tt);
      card.appendChild(head);
      if (t.points && t.points.length) {
        var ul = el("ul", "ja-points");
        t.points.forEach(function (pt) { ul.appendChild(el("li", null, pt)); });
        card.appendChild(ul);
      }
      void card.offsetWidth;
      card.classList.add("in");
    }
    function walkTo(target, done) {
      target = Math.max(0, Math.min(n - 1, target));
      if (jState.busy) return;
      if (target === jState.at) { visit(target); showCard(target); syncUI(); if (done) done(); return; }
      jState.busy = true;
      card.classList.remove("in");                 // the chapter closes as she leaves
      facing = target > jState.at ? 1 : -1;
      var from = stationX[jState.at], to = stationX[target];
      function land() {
        jState.at = target; curX = to; paint(0);
        visit(target); showCard(target); syncUI();
        jState.busy = false;
        if (done) done();
      }
      if (reduced) {
        var lo = Math.min(target, jState.at), hi = Math.max(target, jState.at);
        for (var k = lo; k <= hi; k++) visit(k);
        land();
        return;
      }
      var dur = Math.max(900, Math.min(3200, Math.abs(to - from) / 0.42));
      var t0 = performance.now();
      if (raf) cancelAnimationFrame(raf);
      (function step(now) {
        var k = Math.min(1, (now - t0) / dur);
        var e = k < 0.5 ? 2 * k * k : -1 + (4 - 2 * k) * k;
        curX = from + (to - from) * e;
        stationX.forEach(function (sx, si) {        // stations passed light up
          if (sx >= Math.min(from, curX) - 2 && sx <= Math.max(from, curX) + 2) visit(si);
        });
        paint(Math.abs(Math.sin(k * Math.PI * (dur / 165))) * 6);
        if (k < 1) { raf = requestAnimationFrame(step); return; }
        land();
      })(t0);
    }

    /* ---------- controls ---------- */
    var autoRunning = false, autoTimer = null;
    function stopAuto() {
      autoRunning = false;
      clearTimeout(autoTimer); autoTimer = null;
      autoB.textContent = "let Suu walk";
    }
    function stepAuto() {
      if (!autoRunning) return;
      if (jState.at >= n - 1) { stopAuto(); return; }
      walkTo(jState.at + 1, function () {
        if (autoRunning) autoTimer = setTimeout(stepAuto, 6000);  // a beat to read
      });
    }
    autoB.addEventListener("click", function () {
      if (autoRunning) { stopAuto(); return; }
      if (jState.at >= n - 1) { jState.at = 0; curX = stationX[0]; paint(0); showCard(0); syncUI(); }
      autoRunning = true;
      autoB.textContent = "stop walking";
      stepAuto();
    });
    resetB.addEventListener("click", function () {
      stopAuto();
      if (raf) cancelAnimationFrame(raf);
      jState = { visited: {}, at: 0, busy: false };
      buildAdventure(content, adv);
    });
    prevB.addEventListener("click", function () { stopAuto(); walkTo(jState.at - 1); });
    nextB.addEventListener("click", function () { stopAuto(); walkTo(jState.at + 1); });
    $all(".ja-post", track).forEach(function (g) {
      g.addEventListener("click", function () {
        stopAuto();
        walkTo(parseInt(g.getAttribute("data-mi"), 10));
      });
    });

    /* ---------- boot ---------- */
    measure();
    Object.keys(jState.visited).forEach(function (k) {
      var p = track.querySelector('.ja-post[data-mi="' + k + '"]');
      if (p) p.classList.add("lit");
    });
    paint(0);
    visit(jState.at);
    showCard(jState.at);
    syncUI();
    if (jResize) window.removeEventListener("resize", jResize);
    jResize = function () { measure(); paint(0); };
    window.addEventListener("resize", jResize);
  }

  /* ---------- achievements: the Hall of Achievements ---------- */
  var ACH_CATEGORIES = {
    academic:      { label: "Academic",      icon: "🏅" },
    certification: { label: "Certification", icon: "📜" },
    sports:        { label: "Sports",        icon: "🏆" },
    cocurricular:  { label: "Co-curricular", icon: "🎭" },
    volunteering:  { label: "Volunteering",  icon: "🌱" }
  };
  var ACH_ERA_ORDER = ["work", "university", "foundation", "secondary", "primary"];
  var achFilter = "all";

  /* the hall doors: the board hides behind a painted sanctuary until Suu opens
     it. The open state lives only in this variable, so every reload (and the
     replay knob) closes the doors again and waits for a click on Suu/the doors;
     in-page re-renders (filters, edit mode) keep it open. */
  var hallOpen = false;
  var hallBurst = false; // one render's worth of staggered card entrances
  function suuSpriteSVG() {
    return '<svg viewBox="0 0 64 64">' +
      '<g class="suu-legs"><rect x="24" y="50" width="4" height="9" rx="2" fill="#221d16"/><rect x="36" y="50" width="4" height="9" rx="2" fill="#221d16"/></g>' +
      '<path d="M32 8 C14 8 8 24 10 36 C12 50 20 55 32 55 C44 55 52 50 54 36 C56 24 50 8 32 8 Z" fill="#2a251d"/>' +
      '<path d="M32 8 C 30 4 34 2 33 6 M22 11 C 19 7 24 5 23 9 M42 11 C 45 7 40 5 41 9" stroke="#2a251d" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="24" cy="30" r="6.5" fill="#fffdf4"/><circle cx="40" cy="30" r="6.5" fill="#fffdf4"/>' +
      '<circle cx="25.5" cy="31" r="2.6" fill="#17130d"/><circle cx="41.5" cy="31" r="2.6" fill="#17130d"/>' +
      '<g opacity=".95"><path d="M52 34 L58 30" stroke="#4a3d28" stroke-width="2" stroke-linecap="round"/>' +
      '<rect x="55" y="30" width="7" height="9" rx="2.5" fill="#ffd98a" stroke="#4a3d28" stroke-width="1.4"/>' +
      '<circle cx="58.5" cy="34.5" r="7" fill="rgba(255,222,140,.35)"/></g>' +
      "</svg>";
  }
  function buildHall(hall, content) {
    // a previous open leaves "opening"/"leaving" (opacity 0) on the container -
    // strip them or a rebuilt facade renders invisible (the replay-blank bug)
    hall.className = "ach-hall";
    hall._busy = false;
    var INK = "#5d4a33", MARBLE = "#e9e0c8", MARBLE2 = "#d6cbae",
      STONE2 = "#bcb08f", GOLD = "#e8b23a", BRONZE = "#a8854c", MOSS = "#6ca25e";
    // guardian statue: a weathered stone Suu on a plinth, moss on its head
    function guardian(x, y) {
      return '<g transform="translate(' + x + "," + y + ')">' +
        '<rect x="-17" y="8" width="34" height="14" rx="2" fill="' + STONE2 + '" stroke="' + INK + '" stroke-width="2"/>' +
        '<path d="M0 -20 C-12 -20 -15 -9 -14 -1 C-13 8 -8 11 0 11 C8 11 13 8 14 -1 C15 -9 12 -20 0 -20 Z" fill="#9aa0a8" stroke="' + INK + '" stroke-width="2"/>' +
        '<circle cx="-5" cy="-6" r="3.4" fill="#6d7278"/><circle cx="5" cy="-6" r="3.4" fill="#6d7278"/>' +
        '<ellipse cx="-2" cy="-19" rx="9" ry="4" fill="' + MOSS + '"/></g>';
    }
    // ceremonial banner: vermilion vexillum with a gold laurel ring
    function banner(x, y) {
      return '<g transform="translate(' + x + "," + y + ')">' +
        '<path d="M0 -66 V34" stroke="' + INK + '" stroke-width="3"/>' +
        '<path d="M-19 -60 H19" stroke="' + INK + '" stroke-width="3"/>' +
        '<g class="hall-banner"><path d="M-16 -57 h32 v52 l-16 -10 l-16 10 Z" fill="#c25742" stroke="' + INK + '" stroke-width="2"/>' +
        '<circle cx="0" cy="-36" r="8" fill="none" stroke="' + GOLD + '" stroke-width="2.4"/></g></g>';
    }
    // little painted bird (flies off when the doors open); the animated group
    // is nested so the CSS animation cannot clobber the placement transform
    function bird(x, y, flip, delay) {
      return '<g transform="translate(' + x + "," + y + ') scale(' + (flip ? -1 : 1) + ',1)">' +
        '<g class="hall-bird" style="animation-delay:' + delay + '">' +
        '<ellipse cx="0" cy="0" rx="5.5" ry="3.6" fill="#6d7278"/><circle cx="5" cy="-2.5" r="2.6" fill="#6d7278"/>' +
        '<path d="M7.4 -2.5 l3 1 l-3 1 Z" fill="' + GOLD + '"/><path d="M-4 -1 q-4 -4 -7 -2" stroke="' + INK + '" stroke-width="1.4" fill="none"/></g></g>';
    }
    // grass tuft: three painted blades
    function tuft(x, y) {
      return '<g transform="translate(' + x + "," + y + ')"><path d="M0 0 C-2 -6 -3 -9 -5 -11 M0 0 C0 -7 0 -10 1 -13 M0 0 C2 -6 4 -9 6 -10" stroke="#4d7f52" stroke-width="2" fill="none" stroke-linecap="round"/></g>';
    }
    hall.innerHTML =
      '<svg class="hall-svg" viewBox="0 0 900 470" role="img" aria-label="a marble sanctuary standing on a meadow, one step up - Suu waits on the path">' +
      '<defs><radialGradient id="hall-glow" cx=".5" cy=".5" r=".5">' +
      '<stop offset="0" stop-color="rgba(255,214,130,.85)"/><stop offset="1" stop-color="rgba(255,214,130,0)"/></radialGradient>' +
      '<linearGradient id="hall-fx" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".1" stop-color="#fff" stop-opacity="1"/>' +
      '<stop offset=".9" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="hall-fy" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".8" stop-color="#fff" stop-opacity="1"/>' +
      '<stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<mask id="hall-mx"><rect width="900" height="470" fill="url(#hall-fx)"/></mask>' +
      '<mask id="hall-my"><rect width="900" height="470" fill="url(#hall-fy)"/></mask></defs>' +
      '<g class="hall-day">' +
      // the meadow runs the full frame width and melts into the painted valley
      // at the sides and bottom (masked fades) - grass flanks the stair, a worn
      // dirt path (not grass) runs up the middle to the step
      '<g mask="url(#hall-mx)"><g mask="url(#hall-my)">' +
      '<path d="M-20 372 Q 250 348 450 356 Q 650 348 920 372 L 920 470 L -20 470 Z" fill="#8db06c"/>' +
      '<path d="M-20 372 Q 250 348 450 356 Q 650 348 920 372" fill="none" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M368 470 Q 384 400 416 348 H 484 Q 516 400 532 470 Z" fill="#d9c49a" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
      // the single ceremonial step
      '<path d="M280 300 H620 L655 344 H245 Z" fill="' + MARBLE2 + '" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
      // grass tufts, pebbles and moss on the flanking greens
      tuft(120, 428) + tuft(196, 452) + tuft(296, 430) + tuft(604, 432) + tuft(700, 454) + tuft(778, 426) + tuft(252, 392) + tuft(648, 392) +
      '<ellipse cx="340" cy="428" rx="7" ry="4" fill="#9aa0a8" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<ellipse cx="562" cy="444" rx="5.5" ry="3.5" fill="#9aa0a8" stroke="' + INK + '" stroke-width="1.6"/>' +
      "</g></g>" +
      '<ellipse cx="366" cy="340" rx="22" ry="5" fill="' + MOSS + '" opacity=".5"/>' +
      '<ellipse cx="540" cy="300" rx="20" ry="4" fill="#5d9455" opacity=".45"/>' +
      // sanctuary podium
      '<rect x="296" y="286" width="308" height="16" fill="' + MARBLE2 + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      // pediment with the gold laurel + medal relief
      '<path d="M284 148 L450 82 L616 148 Z" fill="' + MARBLE + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M436 130 a15 15 0 0 1 -8 -22 M464 130 a15 15 0 0 0 8 -22" stroke="' + GOLD + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="450" cy="122" r="9" fill="none" stroke="' + GOLD + '" stroke-width="2.6"/>' +
      '<path d="M450 117 l1.7 3.4 3.8 .5 -2.8 2.7 .7 3.8 -3.4 -1.8 -3.4 1.8 .7 -3.8 -2.8 -2.7 3.8 -.5 Z" fill="' + GOLD + '"/>' +
      // entablature with a carved inscription
      '<rect x="292" y="148" width="316" height="22" fill="' + MARBLE + '" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<text x="450" y="164" text-anchor="middle" font-size="12" font-weight="700" letter-spacing="3" fill="' + BRONZE + '"><title>honour is the reward of achievement</title>HONOS · VIRTUTIS · PRAEMIUM</text>' +
      // cella wall behind the colonnade - so the doors are set INTO the
      // building instead of hanging in the open air between the pillars
      '<rect x="308" y="170" width="284" height="116" fill="#ded3b6" stroke="' + INK + '" stroke-width="2.4"/>' +
      // four fluted columns, mirror-symmetric about the centreline x=450
      ['318', '382', '518', '582'].map(function (cx) {
        var x = +cx;
        return '<rect x="' + (x - 10) + '" y="170" width="20" height="116" fill="' + MARBLE + '" stroke="' + INK + '" stroke-width="2.4"/>' +
          '<path d="M' + (x - 3) + " 174 V282 M" + (x + 3) + ' 174 V282" stroke="' + INK + '" stroke-width="1.2" opacity=".28"/>' +
          '<rect x="' + (x - 13) + '" y="166" width="26" height="7" fill="' + MARBLE2 + '" stroke="' + INK + '" stroke-width="2"/>' +
          '<rect x="' + (x - 13) + '" y="280" width="26" height="7" fill="' + MARBLE2 + '" stroke="' + INK + '" stroke-width="2"/>';
      }).join("") +
      // ivy curling up the right outer column
      '<path d="M592 284 C584 258 600 240 590 214 C584 200 592 190 588 180" stroke="#5f9455" stroke-width="2.4" fill="none"/>' +
      '<circle cx="586" cy="268" r="4" fill="' + MOSS + '"/><circle cx="596" cy="240" r="3.4" fill="#5d9455"/>' +
      '<circle cx="585" cy="212" r="3.8" fill="' + MOSS + '"/><circle cx="591" cy="186" r="3" fill="#5d9455"/>' +
      // marble door frame + tall panelled bronze doors reaching the floor
      '<rect x="408" y="174" width="84" height="112" fill="' + MARBLE2 + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<rect class="hall-doorway" x="416" y="182" width="68" height="104" fill="#241d14" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<g class="hall-door-l"><rect x="419" y="185" width="30.5" height="101" fill="' + BRONZE + '" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<rect x="424" y="192" width="20" height="38" fill="none" stroke="' + INK + '" stroke-width="1.4" opacity=".35"/>' +
      '<rect x="424" y="238" width="20" height="40" fill="none" stroke="' + INK + '" stroke-width="1.4" opacity=".35"/>' +
      '<circle cx="445" cy="238" r="3" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.4"/></g>' +
      '<g class="hall-door-r"><rect x="450.5" y="185" width="30.5" height="101" fill="' + BRONZE + '" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<rect x="456" y="192" width="20" height="38" fill="none" stroke="' + INK + '" stroke-width="1.4" opacity=".35"/>' +
      '<rect x="456" y="238" width="20" height="40" fill="none" stroke="' + INK + '" stroke-width="1.4" opacity=".35"/>' +
      '<circle cx="455" cy="238" r="3" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.4"/></g>' +
      "</g>" +  // close the first hall-day group: the lights below stay bright at night
      '<rect class="hall-seam" x="448" y="186" width="4" height="98" rx="2" fill="#ffd57e"/>' +
      // a generous invisible hit zone so "knock on the doors" is easy to click
      '<rect class="hall-hit" x="392" y="160" width="116" height="146" fill="transparent"/>' +
      // the released light: glow at the doors + a beam flooding down the stair
      '<g class="hall-spill"><ellipse cx="450" cy="250" rx="120" ry="80" fill="url(#hall-glow)"/>' +
      '<path d="M424 286 H476 L570 430 H330 Z" fill="#ffd57e" opacity=".26"/></g>' +
      '<circle class="hall-mote" cx="436" cy="250" r="2.8" style="animation-delay:.7s"/>' +
      '<circle class="hall-mote" cx="468" cy="270" r="2.2" style="animation-delay:.85s"/>' +
      '<circle class="hall-mote" cx="452" cy="228" r="2" style="animation-delay:1s"/>' +
      '<circle class="hall-mote" cx="486" cy="248" r="2.6" style="animation-delay:1.15s"/>' +
      '<circle class="hall-mote" cx="420" cy="276" r="2.2" style="animation-delay:1.3s"/>' +
      '<g class="hall-day">' +
      // birds on the pediment (they fly off when the doors open)
      bird(452, 74, false, "0s") + bird(600, 142, true, ".15s") +
      // banners and guardians standing on the flanking grass
      banner(188, 404) + banner(712, 404) +
      guardian(288, 384) + guardian(612, 384) +
      // wildflowers on the side greens
      '<g stroke="#5f9455" stroke-width="1.6"><path d="M172 434 q-2 -10 2 -16 M186 438 q2 -9 -1 -15 M730 430 q2 -10 -2 -16 M718 436 q-2 -9 1 -14"/></g>' +
      '<circle cx="174" cy="416" r="3.4" fill="#e2a33d"/><circle cx="185" cy="421" r="3" fill="#fffdf4"/>' +
      '<circle cx="728" cy="412" r="3.4" fill="#c86a8a"/><circle cx="719" cy="420" r="3" fill="#fffdf4"/>' +
      // the lamp post on the left green: unlit by day, lit at night
      '<ellipse cx="150" cy="428" rx="11" ry="4" fill="#3a3128"/>' +
      '<path d="M150 428 V332" stroke="#3a3128" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M136 306 L150 292 L164 306 Z" fill="#3a3128"/>' +
      '<rect class="hall-lamp-glass" x="140" y="306" width="20" height="26" rx="3" fill="#f4f7fb" stroke="#3a3128" stroke-width="2.5"/>' +
      "</g>" +
      // dark mode only: the lamp's light - a halo, a pool on the grass, and a
      // warm wash reaching the sanctuary so the building never sits in the dark
      '<g class="hall-lamp-glow"><circle cx="150" cy="319" r="34" fill="url(#hall-glow)"/>' +
      '<ellipse cx="150" cy="424" rx="52" ry="11" fill="#ffd57e" opacity=".3"/>' +
      '<ellipse cx="330" cy="330" rx="190" ry="110" fill="url(#hall-glow)" opacity=".5"/></g>' +
      "</svg>" +
      '<div class="hall-suu" aria-hidden="true">' + suuSpriteSVG() + "</div>" +
      '<p class="hall-caption">Suu is waiting on the path - <b>click Suu, or knock on the doors</b>, to open the hall</p>';

    hall.setAttribute("role", "button");
    hall.setAttribute("tabindex", "0");
    hall.setAttribute("aria-label", "Open the Hall of Achievements");
    // only Suu and the doors open the hall - the scenery is not a button
    hall.onclick = function (ev) {
      if (ev.target.closest && ev.target.closest(".hall-door-l, .hall-door-r, .hall-doorway, .hall-seam, .hall-hit, .hall-suu")) {
        openHall(hall, content);
      }
    };
    hall.onkeydown = function (ev) {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openHall(hall, content); }
    };
    // hybrid trigger: Suu only walks up once the hall scrolls into view
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { hall.classList.add("seen"); io.disconnect(); }
        });
      }, { threshold: 0.35 });
      io.observe(hall);
    } else {
      hall.classList.add("seen");
    }
  }
  function openHall(hall, content) {
    if (hall._busy) return;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function finish() {
      hallOpen = true;
      hall._busy = false;
      hallBurst = true;
      renderAchievements(content);
      if (window.PORTFOLIO_MOTION) window.PORTFOLIO_MOTION.rewire();
    }
    if (reduced) { finish(); return; }
    hall._busy = true;
    // Suu climbs the ceremonial stair (hopping step by step, shrinking with
    // distance), reaches the sanctuary doors, and pushes them open
    var suu = hall.querySelector(".hall-suu");
    suu.style.animation = "none";
    suu.style.transition = "none";
    var t0 = performance.now(), DUR = 1000;
    (function step(now) {
      var k = Math.min(1, (now - t0) / DUR);
      var e = k < 0.5 ? 2 * k * k : -1 + (4 - 2 * k) * k; // ease in-out
      var hop = Math.abs(Math.sin(k * Math.PI * 4)) * 8 * (1 - 0.4 * e);
      suu.style.left = (42 + 4.5 * e).toFixed(2) + "%";
      suu.style.bottom = (11 + 30 * e).toFixed(2) + "%";
      suu.style.transform = "translateY(" + (-hop).toFixed(1) + "px) scale(" + (1 - 0.35 * e).toFixed(3) + ")";
      if (k < 1) { requestAnimationFrame(step); return; }
      hall.classList.add("opening");          // doors fold, light floods the stair
      setTimeout(function () { hall.classList.add("leaving"); }, 1600);
      setTimeout(finish, 2200);
    })(t0);
  }

  function renderAchievements(content) {
    var section = $("#achievements");
    var list = content.achievements || [];
    var eras = content.achievementEras || {};
    var editing = document.body.classList.contains("editing");
    section.style.display = list.length || editing ? "" : "none";
    var filter = editing ? "all" : achFilter;

    var hall = $("#ach-hall");
    var closed = !editing && list.length && !hallOpen;
    section.classList.toggle("hall-closed", !!closed);
    if (closed) { hall.hidden = false; buildHall(hall, content); }
    else hall.hidden = true;

    // tally line: totals + year span, computed from the data
    var tally = $("#ach-tally");
    var years = [];
    list.forEach(function (a) {
      (String(a.year || "").match(/20\d\d|19\d\d/g) || []).forEach(function (y) { years.push(+y); });
    });
    tally.textContent = list.length
      ? list.length + " achievements collected" +
        (years.length ? " · " + Math.min.apply(null, years) + " - " + Math.max.apply(null, years) : "") +
        " · still counting"
      : "";
    if (!closed && !editing && list.length) {
      var rp = el("button", "ach-replay", "↻");
      rp.title = "Close the hall again - click Suu or the doors to reopen it";
      rp.addEventListener("click", function () {
        hallOpen = false;
        renderAchievements(content);
        if (window.PORTFOLIO_MOTION) window.PORTFOLIO_MOTION.rewire();
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      tally.appendChild(rp);
    }

    // category filter chips (same chip idiom as the projects grid)
    var bar = $("#ach-filters");
    bar.innerHTML = "";
    var counts = { all: list.length };
    list.forEach(function (a) { counts[a.category] = (counts[a.category] || 0) + 1; });
    var cats = ["all"].concat(Object.keys(ACH_CATEGORIES).filter(function (k) { return counts[k]; }));
    cats.forEach(function (cat) {
      var chip = el("button", "chip" + (filter === cat ? " on" : ""));
      chip.setAttribute("role", "tab");
      chip.innerHTML = (cat === "all" ? "All" : ACH_CATEGORIES[cat].icon + " " + ACH_CATEGORIES[cat].label) +
        "<span class='n'>" + (counts[cat] || 0) + "</span>";
      chip.addEventListener("click", function () {
        achFilter = cat;
        renderAchievements(content);
        if (window.PORTFOLIO_MOTION) window.PORTFOLIO_MOTION.rewire();
        if (document.body.classList.contains("editing") && window.PORTFOLIO_EDITOR) window.PORTFOLIO_EDITOR.rewire();
      });
      bar.appendChild(chip);
    });

    // era rail: newest era first, cards hang under each camp on the trail
    var rail = $("#ach-rail");
    rail.innerHTML = "";
    var burstIdx = 0;
    ACH_ERA_ORDER.forEach(function (eraKey) {
      var items = [];
      list.forEach(function (a, i) {
        if (a.era !== eraKey) return;
        if (filter !== "all" && a.category !== filter) return;
        items.push({ a: a, i: i });
      });
      if (!items.length && !editing) return;

      var era = el("div", "ach-era");
      era.setAttribute("data-era", eraKey);
      var head = el("div", "ach-era-head");
      var meta = eras[eraKey] || { label: eraKey, caption: "" };
      var lb = el("span", "ach-era-label", meta.label);
      lb.setAttribute("data-edit", "achievementEras." + eraKey + ".label");
      head.appendChild(lb);
      var cap = el("span", "ach-era-cap", meta.caption);
      cap.setAttribute("data-edit", "achievementEras." + eraKey + ".caption");
      head.appendChild(cap);
      era.appendChild(head);

      var cards = el("div", "ach-cards");
      items.forEach(function (it) {
        var a = it.a, i = it.i;
        var cat = ACH_CATEGORIES[a.category] || ACH_CATEGORIES.academic;
        // after the doors open, cards burst in staggered instead of scroll-revealing
        var card = el("article", hallBurst ? "ach-card burst-in" : "ach-card reveal");
        if (hallBurst) card.style.animationDelay = (0.15 + (burstIdx++) * 0.07).toFixed(2) + "s";
        card.setAttribute("data-ai", i);

        if (a.image) {
          var ph = el("div", "ach-photo");
          ph.setAttribute("data-edit-image", "achievements." + i + ".image");
          var img = document.createElement("img");
          img.src = a.image; img.alt = a.title; img.loading = "lazy";
          ph.appendChild(img);
          card.appendChild(ph);
        } else if (editing) {
          var ep = el("div", "ach-photo empty", "+ photo");
          ep.setAttribute("data-edit-image", "achievements." + i + ".image");
          card.appendChild(ep);
        }

        var top = el("div", "ach-top");
        top.appendChild(el("span", "ach-medal", cat.icon));
        top.appendChild(el("span", "ach-cat", cat.label));
        if (a.year) {
          var yr = el("span", "ach-year", a.year);
          yr.setAttribute("data-edit", "achievements." + i + ".year");
          top.appendChild(yr);
        }
        card.appendChild(top);

        var h4 = el("h4", null, a.title);
        h4.setAttribute("data-edit", "achievements." + i + ".title");
        card.appendChild(h4);
        if (a.org || editing) {
          var org = el("p", "ach-org", a.org);
          org.setAttribute("data-edit", "achievements." + i + ".org");
          card.appendChild(org);
        }
        if (a.description || editing) {
          var ds = el("p", "ach-desc", a.description);
          ds.setAttribute("data-edit", "achievements." + i + ".description");
          card.appendChild(ds);
        }
        cards.appendChild(card);
      });
      era.appendChild(cards);
      rail.appendChild(era);
    });
    hallBurst = false;
  }

  var LINK_ICONS = {
    github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.75 2.69 1.25 3.35.95.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.59.24 2.76.12 3.05.73.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.26 5.66.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45z"/></svg>'
  };
  function renderContact(content) {
    var row = $("#contact-row");
    row.innerHTML = "";
    var mail = el("a", "btn btn-primary magnetic", content.contact.cta || "Email me");
    mail.href = "mailto:" + content.identity.email;
    row.appendChild(mail);
    // a résumé chip - opens the ATS résumé page (view + download PDF there)
    var cv = el("a", "contact-chip contact-resume");
    cv.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm8 1.5V8h4.5L14 3.5zM8 12h8v1.6H8V12zm0 3.4h8V17H8v-1.6zM8 8.6h4v1.6H8V8.6z"/></svg>';
    cv.appendChild(document.createTextNode("Résumé"));
    cv.href = "resume.html";
    row.appendChild(cv);
    var em = el("span", "contact-chip", content.identity.email);
    em.setAttribute("data-edit", "identity.email");
    row.appendChild(em);
    var loc = el("span", "contact-chip", content.identity.location);
    loc.setAttribute("data-edit", "identity.location");
    row.appendChild(loc);
    content.identity.links.forEach(function (l) {
      if (!l.url) return;
      var a = document.createElement("a");
      a.className = "contact-chip";
      var icon = LINK_ICONS[(l.label || "").toLowerCase()];
      if (icon) a.innerHTML = icon;
      a.appendChild(document.createTextNode(l.label));
      a.href = l.url; a.target = "_blank"; a.rel = "noopener";
      row.appendChild(a);
    });
  }

  /* ---------- full render ---------- */
  function renderAll() {
    var c = App.content;
    applyAccent(c.meta.accent || "#E8A200");
    renderBound(c);
    renderHeroStats(c);
    renderHeroPhoto(c);
    renderNow(c);
    renderFeatures(c);
    renderFilters(c);
    renderGrid(c);
    renderAvatar(c);
    renderSkills(c);
    renderJourney(c);
    renderAchievements(c);
    renderContact(c);
    if (window.PORTFOLIO_MOTION) window.PORTFOLIO_MOTION.rewire();
    if (document.body.classList.contains("editing") && window.PORTFOLIO_EDITOR) {
      window.PORTFOLIO_EDITOR.rewire();
    }
  }

  /* ---------- public app object ---------- */
  var App = {
    content: null,
    LS_KEY: LS_KEY,
    CATEGORY_LABELS: CATEGORY_LABELS,
    ACH_CATEGORIES: ACH_CATEGORIES,
    ACH_ERA_ORDER: ACH_ERA_ORDER,
    $: $, $all: $all, el: el,
    getPath: getPath, setPath: setPath,
    toast: toast,
    suuSprite: suuSpriteSVG,
    buildAdventure: buildAdventure,
    renderAll: renderAll,
    applyAccent: applyAccent,
    save: function () {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(App.content));
        return true;
      } catch (e) {
        toast("Could not save locally: " + e.message);
        return false;
      }
    }
  };
  /* ---------- mobile nav overlay ----------
     styles.css hides .nav-links below 900px with no replacement, so this is
     the only section navigation a phone gets. iOS ignores a plain
     overflow:hidden on <body>, so the lock pins the body with position:fixed
     and restores the exact scroll position on close. */
  var navOverlay = (function () {
    var scrollY = 0;

    function el(id) { return document.getElementById(id); }

    function isOpen() {
      var o = el("nav-overlay");
      return !!o && !o.hidden;
    }

    function open() {
      var o = el("nav-overlay");
      if (!o || isOpen()) return;
      scrollY = window.scrollY;
      o.hidden = false;
      o.setAttribute("aria-hidden", "false");
      el("nav-toggle").setAttribute("aria-expanded", "true");
      document.body.style.position = "fixed";
      document.body.style.top = -scrollY + "px";
      document.body.style.width = "100%";
    }

    function close() {
      var o = el("nav-overlay");
      if (!o || !isOpen()) return;
      o.hidden = true;
      o.setAttribute("aria-hidden", "true");
      el("nav-toggle").setAttribute("aria-expanded", "false");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    }

    return { open: open, close: close, isOpen: isOpen };
  })();

  App.navOverlay = navOverlay;

  window.PORTFOLIO_APP = App;

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    App.content = loadContent();
    var savedTheme = null;
    try { savedTheme = localStorage.getItem(LS_THEME); } catch (e) {}
    applyTheme(savedTheme || App.content.meta.defaultTheme || "light");

    renderAll();

    $("#btn-theme").addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme");
      applyTheme(cur === "dark" ? "light" : "dark");
    });

    /* ---------- mobile nav overlay wiring ---------- */
    $("#nav-toggle").addEventListener("click", function () {
      if (navOverlay.isOpen()) { navOverlay.close(); } else { navOverlay.open(); }
    });
    $("#nav-overlay-close").addEventListener("click", navOverlay.close);
    $("#nav-overlay").addEventListener("click", function (ev) {
      if (ev.target.tagName === "A") navOverlay.close();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && navOverlay.isOpen()) navOverlay.close();
    });
    /* the overlay's tools delegate to the desktop bar's own handlers */
    $("#ov-theme").addEventListener("click", function () { $("#btn-theme").click(); });
    $("#ov-weather").addEventListener("click", function () { $("#btn-weather").click(); });
    $("#ov-present").addEventListener("click", function () {
      navOverlay.close();
      $("#btn-present").click();
    });
  });
})();
