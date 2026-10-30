/* ============================================================
   proj-scroll.js - the two-page project detail scroll (Task 4).
   A painted parchment panel, built standalone before either the
   Map or the List view so both (Tasks 5/6) can just call it. Page
   1 exposes problem, contribution and outcome before tools; page 2 is the case
   study, original screenshots/video (mounted once on first arrival) and the
   links row. Escape is handled by the shell (js/projects.js), which
   calls isOpen()/close() - this file must not add its own listener.
   ============================================================ */
(function () {
  "use strict";

  var backdrop = null, scrollEl = null, project = null;
  var page2Mounted = false, returnFocus = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function defaultHost() {
    return document.querySelector(".pj-overlay");
  }

  /* poster -> first gallery image -> the generated thumb, in that order */
  function imageSrc(p) {
    var ex = p.exhibit || {};
    if (ex.poster) return ex.poster;
    if (ex.images && ex.images.length) return ex.images[0];
    return "assets/projects/thumb/" + p.id + ".webp";
  }

  function buildTools(p) {
    var wrap = el("div", "pjs-tools");
    wrap.appendChild(el("h4", null, "TOOLS & TECHNOLOGIES"));
    var row = el("div", "pjs-toolrow");
    (p.stack || []).forEach(function (s) { row.appendChild(el("span", "tag", s)); });
    wrap.appendChild(row);
    return wrap;
  }

  function overviewFor(p) {
    var source = (window.PORTFOLIO_CONTENT && window.PORTFOLIO_CONTENT.projects || []).find(function (item) { return item.id === p.id; });
    var matchesSource = source && ["problem", "action", "outcome", "impact"].every(function (key) { return p[key] === source[key]; });
    var summary = p.overview;
    // A saved copy of a default summary must not mask later edits to its story.
    if (summary && source && !matchesSource && JSON.stringify(summary) === JSON.stringify(source.overview)) summary = null;
    if (!summary && matchesSource) summary = source.overview;
    var result = p.impact || p.outcome || "";
    if (source && p.outcome !== source.outcome && p.impact === source.impact) result = p.outcome || p.impact || "";
    return {
      problem: summary && summary.problem || p.problem || "",
      contribution: summary && summary.contribution || p.action || "",
      outcome: summary && summary.outcome || result
    };
  }

  /* TWO COLUMNS: text left, framed image right - the blueprint's layout.
     Stacked vertically (the first build) the image took the full panel width
     and pushed the tools and tiles past the fold, which is what put an
     internal scrollbar on a scroll that is supposed to be read at a glance.
     On phones the concise evidence precedes the optional image. */
  function buildPage1(p) {
    var pg = el("div", "pjs-pg pjs-pg1");
    pg.tabIndex = 0;
    pg.setAttribute("aria-label", "Project overview");
    var col = el("div", "pjs-col");

    var kicker = el("p", "pjs-kicker");
    var labels = (window.PORTFOLIO_APP && window.PORTFOLIO_APP.CATEGORY_LABELS) || {};
    kicker.appendChild(el("span", "pjs-cat", labels[p.category] || p.category));
    kicker.appendChild(el("span", "badge " + p.status, p.status));
    col.appendChild(kicker);

    col.appendChild(el("h3", "pjs-title", p.title));
    col.appendChild(el("p", "pjs-sub", p.subtitle));
    var summary = overviewFor(p), evidence = el("dl", "pjs-evidence");
    [["Problem", "problem"], ["My contribution", "contribution"], ["Outcome", "outcome"]].forEach(function (pair) {
      var row = el("div");
      row.appendChild(el("dt", null, pair[0]));
      row.appendChild(el("dd", null, summary[pair[1]]));
      evidence.appendChild(row);
    });
    col.appendChild(evidence);
    col.appendChild(el("p", "pjs-meta", (p.period || "") + " \u00b7 " + (p.status || "")));
    col.appendChild(buildTools(p));

    pg.appendChild(col);

    // omit the frame entirely rather than render it empty - imageSrc()
    // always resolves to something truthy (poster, first gallery shot or
    // the generated thumb), so this guard exists for a future caller that
    // hands in a project missing all three.
    var src = imageSrc(p);
    if (src) {
      var shot = el("div", "pjs-shot");
      var img = document.createElement("img");
      img.src = src;
      img.alt = p.title;
      shot.appendChild(img);
      pg.appendChild(shot);
    }

    return pg;
  }

  function buildPage2(p) {
    var pg = el("div", "pjs-pg pjs-pg2");
    pg.hidden = true;
    pg.tabIndex = 0;
    pg.setAttribute("aria-label", "Project story");

    var readingStory = p.id === "do-pipeline";
    if (readingStory) {
      var head = el("header", "pjs-story-head");
      head.appendChild(el("small", null, "PROJECT STORY \u00b7 PAGE 2 OF 2"));
      head.appendChild(el("h3", null, p.title));
      head.appendChild(el("p", null, p.subtitle));
      pg.appendChild(head);
    } else {
      pg.appendChild(el("h3", "pjs-story-title", p.title));
    }

    // Other project types retain their existing two-column presentation.
    // The Document Mill story reads vertically. Original evidence is optional;
    // playable games belong on the main page or the dedicated castle page.
    // Phone and exhibit-free layouts retain the existing single-column fallback.
    var two = el("div", "pjs-two");
    var textCol = el("div", "pjs-twocol");
    var exCol = el("div", "pjs-twocol");
    if (readingStory) {
      textCol.classList.add("pjs-story-copy");
    }

    var sections = readingStory ? [["01 \u00b7 THE PROBLEM", "problem"], ["02 \u00b7 WHAT I PERSONALLY BUILT", "action"], ["03 \u00b7 THE OUTCOME", "outcome"]] :
      [["THE PROBLEM", "problem"], ["WHAT I BUILT", "action"], ["THE RESULT", "outcome"]];
    sections.forEach(function (pair) {
      var para = el("p", "pjs-case");
      para.appendChild(el("b", null, pair[0]));
      para.appendChild(el("span", null, p[pair[1]]));
      textCol.appendChild(para);
    });

    exCol.appendChild(el("div", "feature-exhibit"));
    two.appendChild(textCol);
    two.appendChild(exCol);
    pg.appendChild(two);

    // links ride UNDER THE EXHIBIT, not under the grid: the write-up is the
    // taller column, so a full-width row below it landed half-cut on the
    // panel's bottom edge. The exhibit column has the spare room.
    // same rule as app.js/worldmap.js: external links open in a new tab,
    // an in-site *.html page navigates in place
    var links = el("div", "proj-links");
    (p.links || []).forEach(function (l) {
      if (!l.url) return;
      var a = document.createElement("a");
      a.className = "tag proj-link";
      a.textContent = l.label + " ↗";
      a.href = l.url;
      if (!/^[a-z-]+\.html/.test(l.url)) { a.target = "_blank"; a.rel = "noopener"; }
      links.appendChild(a);
    });
    exCol.appendChild(links);

    return pg;
  }

  function buildPager() {
    var pager = el("div", "pjs-pager");
    var prev = el("button", "pjs-prev", "‹");
    prev.type = "button";
    prev.textContent = "\u2190 Project overview";
    prev.addEventListener("click", function () { page(1); });
    pager.appendChild(prev);
    pager.appendChild(el("span", "pjs-count", "1 / 2"));
    var next = el("button", "pjs-next", "›");
    next.type = "button";
    next.textContent = "Read project story \u2192";
    next.addEventListener("click", function () { page(2); });
    pager.appendChild(next);
    return pager;
  }

  function trapTab(ev) {
    if (ev.key !== "Tab" || !scrollEl) return;
    var nodes = scrollEl.querySelectorAll('button:not([disabled]), a[href]');
    if (!nodes.length) return;
    var first = nodes[0], last = nodes[nodes.length - 1];
    if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault(); last.focus();
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault(); first.focus();
    }
  }

  function open(p, host) {
    if (scrollEl) close();
    if (!p) return;
    project = p;
    page2Mounted = false;
    returnFocus = document.activeElement;

    backdrop = el("div", "pjs-backdrop");
    backdrop.addEventListener("click", close);

    scrollEl = el("div", "pjs-scroll is-evidence-overview");
    if (p.id === "do-pipeline") scrollEl.classList.add("is-reading-story");
    scrollEl.setAttribute("data-page", "1");
    scrollEl.addEventListener("click", function (ev) { ev.stopPropagation(); });

    var xBtn = el("button", "pjs-x", "×");
    xBtn.type = "button";
    xBtn.setAttribute("aria-label", "Close project details");
    xBtn.addEventListener("click", close);
    scrollEl.appendChild(xBtn);

    scrollEl.appendChild(buildPage1(p));
    scrollEl.appendChild(buildPage2(p));
    scrollEl.appendChild(buildPager());

    backdrop.appendChild(scrollEl);
    (host || defaultHost() || document.body).appendChild(backdrop);

    page(1);
    document.addEventListener("keydown", trapTab, true);
    xBtn.focus();
  }

  function close() {
    if (!scrollEl) return;
    document.removeEventListener("keydown", trapTab, true);
    if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    backdrop = null;
    scrollEl = null;
    project = null;
    page2Mounted = false;
    var rf = returnFocus;
    returnFocus = null;
    if (rf && rf.focus) rf.focus();
  }

  function isOpen() { return !!scrollEl; }

  function page(n) {
    if (!scrollEl) return;
    n = n === 2 ? 2 : 1;
    var focused = document.activeElement;
    scrollEl.setAttribute("data-page", String(n));

    var pg1 = scrollEl.querySelector(".pjs-pg1");
    var pg2 = scrollEl.querySelector(".pjs-pg2");
    if (pg1) pg1.hidden = n !== 1;
    if (pg2) pg2.hidden = n !== 2;

    var count = scrollEl.querySelector(".pjs-count");
    if (count) count.textContent = n === 2 ? "Project story \u00b7 2 of 2" : "Overview \u00b7 1 of 2";
    var prev = scrollEl.querySelector(".pjs-prev");
    var next = scrollEl.querySelector(".pjs-next");
    if (prev) {
      prev.disabled = n === 1;
      prev.hidden = n === 1;
      prev.setAttribute("aria-label", "Back to project overview");
    }
    if (next) {
      next.disabled = n === 2;
      next.hidden = n === 2;
      next.setAttribute("aria-label", "Read the project story");
    }
    if (n === 2 && count && project && project.id === "do-pipeline") count.appendChild(el("span", "pjs-scroll-hint", " \u00b7 scroll to explore"));

    // Mount evidence once on first arrival at page 2, never a mini-game.
    // A video nobody pages through should never be built.
    if (n === 2 && !page2Mounted && project) {
      page2Mounted = true;
      var ex = scrollEl.querySelector(".feature-exhibit");
      if (ex && window.PORTFOLIO_EXHIBITS) window.PORTFOLIO_EXHIBITS.renderDetails(ex, project);
      // No evidence leaves the container empty; narrative and links still work.
      // an empty right column would squeeze the write-up to half width for
      // nothing, so those fall back to one column.
      var two = scrollEl.querySelector(".pjs-two");
      if (two && ex && !ex.children.length) {
        two.classList.add("is-single");
        if (!ex.parentElement.querySelector('.proj-links a')) ex.parentElement.hidden = true;
      }
    }
    if (n === 2 && focused === next) pg2.focus({ preventScroll: true });
    else if (n === 1 && focused === prev) next.focus({ preventScroll: true });
  }

  window.PORTFOLIO_PROJ_SCROLL = {
    open: open,
    close: close,
    isOpen: isOpen,
    page: page
  };
})();
