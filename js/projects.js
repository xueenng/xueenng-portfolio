/* ============================================================
   projects.js - the All Projects shell, in TWO homes (Task 8).
   The archive lives IN THE PAGE: mountInline() renders the chrome
   and the list view into #projects-inline, in normal flow. Only
   the map is worth a full screen, so the overlay is now map-only -
   reached by the inline "Map View" button and by #map, and its
   own "List View" button just closes and scrolls back here.
   The shell owns chrome and state; it never draws a project
   itself - it mounts views registered via registerView() into a
   .pj-stage and hands each one setFilter() calls. Both roots
   carry .pj-root + is-list/is-map, so one set of chrome rules
   dresses either home.
   ============================================================ */
(function () {
  "use strict";

  var VIEWS = {};
  var state = { open: false, view: "map", filter: "all" };
  var overlay = null;
  var inlineHost = null, inlineRoot = null;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function content() {
    return (window.PORTFOLIO_APP && window.PORTFOLIO_APP.content) || null;
  }

  /* ---------- filter tabs (the counting the old chip bar in app.js did) ---------- */
  function buildTabs(c) {
    var labels = (window.PORTFOLIO_APP && window.PORTFOLIO_APP.CATEGORY_LABELS) || {};
    var counts = { all: c.projects.length };
    c.projects.forEach(function (p) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    // every tab renders even at count 0, so the row never reflows between views
    var cats = ["all"].concat(Object.keys(labels));
    var wrap = el("div", "pj-tabs");
    wrap.setAttribute("role", "tablist");
    cats.forEach(function (cat) {
      var n = counts[cat] || 0;
      var tab = el("button", "pj-tab" + (state.filter === cat ? " on" : "") + (n === 0 ? " is-empty" : ""));
      tab.setAttribute("data-cat", cat);
      tab.setAttribute("role", "tab");
      if (n === 0) tab.disabled = true;
      tab.appendChild(document.createTextNode((cat === "all" ? "All" : labels[cat]) + " "));
      tab.appendChild(el("span", "pj-n", String(n)));
      tab.addEventListener("click", function () { setFilter(cat); });
      wrap.appendChild(tab);
    });
    return wrap;
  }

  /* ---------- shell chrome ----------
     One builder, two homes. Only three things genuinely differ, and they are
     the three the opts flag decides: the inline copy needs no title band (the
     section-head above it already says "All projects") and no Back button
     (there is nothing to go back from), and the toggle sends you somewhere
     different from each home. Everything else - the tabs, the counts, the
     pill - is built from the same code so it cannot drift between them. */
  function buildChrome(root, c, opts) {
    var inline = !!(opts && opts.inline);
    var bar = el("div", "pj-bar");

    if (!inline) {
      var titlewrap = el("div", "pj-titlewrap");
      titlewrap.appendChild(el("h2", "pj-title", "All Projects"));
      /* the blueprint's own line for this destination only - content.js's copy
         still serves wherever else sections.projects.sub is read */
      titlewrap.appendChild(el("p", "pj-sub", "Every place in the valley is a story I built."));
      bar.appendChild(titlewrap);
    }

    var toggle = el("div", "pj-toggle");
    toggle.setAttribute("role", "tablist");
    var VIEW_ICONS = {
      map: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">' +
        '<rect x="1" y="1" width="5" height="5" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
        '<rect x="8" y="1" width="5" height="5" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
        '<rect x="1" y="8" width="5" height="5" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
        '<rect x="8" y="8" width="5" height="5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
      list: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">' +
        '<circle cx="1.6" cy="2" r="1.2" fill="currentColor"/>' +
        '<circle cx="1.6" cy="7" r="1.2" fill="currentColor"/>' +
        '<circle cx="1.6" cy="12" r="1.2" fill="currentColor"/>' +
        '<line x1="4.4" y1="2" x2="13" y2="2" stroke="currentColor" stroke-width="1.4"/>' +
        '<line x1="4.4" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.4"/>' +
        '<line x1="4.4" y1="12" x2="13" y2="12" stroke="currentColor" stroke-width="1.4"/></svg>'
    };
    [["map", "Map View"], ["list", "List View"]].forEach(function (pair) {
      var name = pair[0];
      /* the inline home is ALWAYS the list, so its pill never restamps */
      var on = inline ? name === "list" : state.view === name;
      var btn = el("button", "pj-view" + (on ? " on" : ""));
      btn.innerHTML = VIEW_ICONS[name] + "<span>" + pair[1] + "</span>";
      btn.setAttribute("data-view-btn", name);
      btn.setAttribute("role", "tab");
      btn.addEventListener("click", function () {
        if (inline) {
          if (name === "map") open("map");
          return;
        }
        /* the overlay is map-only: "List View" leaves it and walks the reader
           back to the section that holds the archive */
        if (name === "list") { close(); backToSection(); return; }
        setView(name);
      });
      toggle.appendChild(btn);
    });
    if (inline) {
      var titleToggle = document.getElementById("projects-view-toggle");
      if (titleToggle) {
        titleToggle.innerHTML = "";
        titleToggle.appendChild(toggle);
      } else {
        bar.appendChild(toggle);
      }
    } else {
      bar.appendChild(toggle);
    }

    /* No Back button: "List View" already walks the reader back to the section,
       and Escape closes the overlay, so the button was a third door to the same
       room. */

    if (bar.childNodes.length) root.appendChild(bar);
    root.appendChild(buildTabs(c));
  }

  function backToSection() {
    var sec = document.getElementById("projects");
    if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function build(c) {
    overlay = el("div", "pj-root pj-overlay is-" + state.view);
    overlay.id = "projects-overlay";
    buildChrome(overlay, c, { inline: false });
    overlay.appendChild(el("div", "pj-stage"));

    document.body.appendChild(overlay);
    /* The class is removed once the entrance has played. Left on, it keeps an
       `animation: both` fill applied to the overlay for the rest of its life,
       which is a live animation for anything that later measures this box -
       and a probe that reads a size mid-animation reads it ~10% small. */
    if (!reduced) {
      overlay.classList.add("pj-wipe");
      setTimeout(function () {
        if (overlay) overlay.classList.remove("pj-wipe");
      }, 500);
    }
  }

  function stage() {
    return overlay ? overlay.querySelector(".pj-stage") : null;
  }

  /* the filter is shared between the two homes, so both tab rows restamp */
  function restampTabs() {
    [overlay, inlineRoot].forEach(function (r) {
      if (!r) return;
      [].forEach.call(r.querySelectorAll(".pj-tab"), function (t) {
        t.classList.toggle("on", t.getAttribute("data-cat") === state.filter);
      });
    });
  }

  function restampToggle() {
    if (!overlay) return;
    [].forEach.call(overlay.querySelectorAll(".pj-toggle button"), function (b) {
      b.classList.toggle("on", b.getAttribute("data-view-btn") === state.view);
    });
  }

  /* ---------- public API ---------- */

  /* The archive in the page. Idempotent: renderAll() calls this on every
     content change, and registerView() calls it again the moment archive.js
     hands over the real list view - index.html loads app.js FIRST, so the
     page renders before that view exists and whoever arrives second mounts. */
  function mountInline(host) {
    if (host) inlineHost = host;
    if (!inlineHost) return;
    var c = content();
    if (!c || !VIEWS.list) return;
    inlineHost.innerHTML = "";
    inlineRoot = el("div", "pj-root pj-inline is-list");
    buildChrome(inlineRoot, c, { inline: true });
    var stg = el("div", "pj-stage");
    inlineRoot.appendChild(stg);
    inlineHost.appendChild(inlineRoot);
    VIEWS.list.mount(stg);
    VIEWS.list.setFilter(state.filter);
  }

  /* the hash is #map, not #projects: #projects is the section's own nav
     anchor and the overlay must not hijack the nav's Projects link */
  function open(view) {
    if (state.open) return;
    var c = content();
    if (!c) return;
    state.open = true;
    state.view = view || "map";
    build(c);
    document.body.style.overflow = "hidden";
    var v = VIEWS[state.view];
    if (v) {
      v.mount(stage());
      v.setFilter(state.filter);
    }
    if (location.hash !== "#map") history.pushState(null, "", "#map");
  }

  function close() {
    if (!state.open) return;
    var v = VIEWS[state.view];
    if (v) v.unmount();
    if (overlay) { overlay.remove(); overlay = null; }
    document.body.style.overflow = "";
    state.open = false;
    if (location.hash === "#map") history.pushState(null, "", location.pathname);
    /* Each view is a SINGLETON. If the overlay ever mounted the list, that
       module's host now points at a removed node and the copy in the page is
       dead wood. Re-mount it, carrying the filter the reader left it on. */
    mountInline(null);
  }

  function setView(view) {
    if (!state.open || view === state.view) return;
    var prev = VIEWS[state.view];
    if (prev) prev.unmount();
    var s = stage();
    if (s) s.innerHTML = "";
    state.view = view;
    overlay.classList.remove("is-map", "is-list");
    overlay.classList.add("is-" + view);
    var next = VIEWS[view];
    if (next) {
      next.mount(s);
      next.setFilter(state.filter);
    }
    restampToggle();
  }

  function setFilter(cat) {
    if ((!state.open && !inlineRoot) || cat === state.filter) return;
    state.filter = cat;
    restampTabs();
    var v = state.open ? VIEWS[state.view] : VIEWS.list;
    if (v) v.setFilter(cat);
  }

  function registerView(name, api) {
    VIEWS[name] = api;
    if (name === "list") mountInline(null);
  }

  window.PORTFOLIO_PROJECTS = {
    open: open,
    close: close,
    mountInline: mountInline,
    setView: setView,
    setFilter: setFilter,
    state: function () { return { open: state.open, view: state.view, filter: state.filter }; },
    registerView: registerView
  };

  /* ---------- stub views (Tasks 4/6 overwrite these) ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    ["map", "list"].forEach(function (name) {
      if (VIEWS[name]) return;
      registerView(name, {
        mount: function (host) {
          var d = document.createElement("div");
          d.setAttribute("data-view", name);
          d.textContent = name + " view not implemented yet";
          host.appendChild(d);
        },
        unmount: function () {},
        setFilter: function () {}
      });
    });

    /* Only the CLOSE direction lives here. worldmap.js owns the open-only
       #map listener (the two nav "Valley map" links are plain anchors, so a
       hashchange is the only signal they give); if this file also opened on
       #map the two handlers would fight over one piece of state. And
       #projects no longer opens anything at all - it is the section's anchor
       now, and the archive is already sitting there. */
    window.addEventListener("hashchange", function () {
      if (location.hash !== "#map") close();
    });

    // Escape closes the detail scroll first if one is open, otherwise the
    // destination. This lives here rather than in the views: Task 5 removes
    // the equivalent handler from worldmap.js once the map is a mounted view.
    document.addEventListener("keydown", function (ev) {
      if (ev.key !== "Escape" || !state.open) return;
      /* Task 4 owns the scroll and exposes isOpen()/close(); prefer that over
         reaching into its DOM. The selector fallback covers the window between
         now and Task 4 landing, and worldmap's own .wm-detail until Task 5
         hands that panel over. */
      var S = window.PORTFOLIO_PROJ_SCROLL;
      if (S && S.isOpen()) { S.close(); return; }
      var detail = overlay && overlay.querySelector(".pjs-scroll, .wm-detail");
      if (detail) { detail.remove(); return; }
      close();
    });
  });
})();
