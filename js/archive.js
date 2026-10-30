/* ============================================================
   archive.js - the List view: the PROJECT ARCHIVE (Task 7, re-cut in Task 12).
   Four FULL-WIDTH parchment rows, paged left/right, under a wooden signpost.
   Registers as the "list" view with the shell (js/projects.js), which owns the
   title band, toggle, filter tabs, Back button, hash and Escape. This file only
   ever paints inside the box the shell hands it - with one deliberate
   exception, the Sort control, which the blueprint puts on the shell's filter
   tab row (see buildSort()).

   Page size is fixed at 4 at every viewport. Task 12 made a page four ROWS
   tall rather than a grid that reflowed 4/2/1 across breakpoints, so paging
   behaviour is now identical everywhere by construction rather than by a
   --ar-cols variable holding it steady.
   ============================================================ */
(function () {
  "use strict";

  var PAGE_SIZE = 4;

  var host = null, root = null, sortWrap = null;
  var filter = "all";
  var pageIndex = 0;
  var sortMode = "latest";

  /* stack string -> tool icon slug in assets/projects/tool/.
     Keys are EXACT `stack` strings from js/content.js.

     Entries with no icon are missing on purpose, not by oversight. A stack list
     mixes tools with concepts - "Agile", "OOP design", "Binary search tree",
     "Team of 4" - and there is no honest art for a concept. Inventing a generic
     glyph for them would put four identical grey squares on some rows and read
     as a loading failure, so an unmatched entry is simply skipped and the row
     shows the first four that DID match. A project whose whole stack is
     concepts falls back to text chips (see buildTools) so the column is never
     empty.

     Adding a key here is only half the job: the slug must also be in
     TOOL_SLUGS in tools/build-projects-assets.py, which is what actually
     emits the webp. */
  var STACK_ICONS = {
    "n8n": "n8n",
    "C#": "csharp",
    "C++": "cpp",
    "Unity": "unity",
    "Android": "android",
    "Android / iOS / Web": "android",
    "Java": "java",
    "JavaFX": "java",
    "Python": "python",
    "Python Flask": "python",
    "Streamlit": "python",
    "python-pptx / docx": "python",
    "Blender": "blender",
    "Claude vision": "claude",
    "Claude vision models": "claude",
    "Gemini vision": "gemini",
    "OpenAI API": "openai",
    "HTML / CSS": "html_css",
    "JavaScript": "javascript",
    "PHP": "php",
    "SSRS": "ssrs",
    "SharePoint & Graph API": "sharepoint",
    "SharePoint bridge": "sharepoint",
    "SharePoint lists": "sharepoint",
    "Power Automate": "power_automate",
    "Microsoft Teams": "teams",
    "REST API": "rest_apis",
    "VR": "vr",
    "Meta Quest 2": "vr",
    "OpenXR + XR Interaction Toolkit": "vr",
    "XR Interaction Toolkit": "vr",
    "AR Foundation (ARCore / ARKit)": "ar",
    "Flutter": "flutter",
    "Dart": "flutter",
    "MSSQL": "sql_ssms",
    "Oracle SQL": "sql_ssms",
    "MySQL": "sql_ssms",
    "SQLite": "sql_ssms",
    "ERP SQL": "sql_ssms",
    "Multi-provider AI fallback": "ai_fallback_chains",
    "AI chatbot": "ai"
  };

  var MAX_TOOLS = 4;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function content() {
    return (window.PORTFOLIO_APP && window.PORTFOLIO_APP.content) || null;
  }

  /* {p, i} pairs, i = index in the UNFILTERED content.projects array - that
     index is what data-edit stamps, so it must survive the filter AND the sort
     step. Sorting reorders the pairs, never the array they point into. */
  function indexed(cat) {
    var c = content();
    if (!c) return [];
    var out = [];
    c.projects.forEach(function (p, i) {
      if (cat === "all" || p.category === cat) out.push({ p: p, i: i });
    });
    /* Array.prototype.sort is stable, so equal years keep the order
       content.js lists them in - which is the author's own ranking. */
    if (sortMode === "latest") {
      out.sort(function (a, b) { return Number(b.p.year) - Number(a.p.year); });
    } else if (sortMode === "oldest") {
      out.sort(function (a, b) { return Number(a.p.year) - Number(b.p.year); });
    } else if (sortMode === "az") {
      out.sort(function (a, b) {
        return String(a.p.title).localeCompare(String(b.p.title));
      });
    }
    return out;
  }

  function totalPages() {
    var n = indexed(filter).length;
    return Math.max(1, Math.ceil(n / PAGE_SIZE));
  }

  /* The deck's wooden signpost, at one row's scale. It used to stand alone at
     the foot of the deck saying "More projects this way" - one sign for four
     rows, directly above the arrows that actually opened them. It is now the
     per-row affordance instead: same board, same pole, same palette, lettered
     "Details" and pointing into the project the row describes.
     The board is sized around the WORD, not the other way round: 58 units of
     board for 7 characters at 13, which lands at ~11px on screen. Shrink
     .ar-go much below 4.6rem and the lettering stops being readable - the
     previous 2.6rem version had to be wordless for exactly that reason. */
  function signpostSVG() {
    return '<svg viewBox="0 0 88 64" aria-hidden="true">' +
      '<ellipse cx="34" cy="61" rx="15" ry="2.6" fill="rgba(60,50,30,.16)"/>' +
      '<rect x="31" y="38" width="6" height="23" fill="#8a6242" stroke="#5d4a33" stroke-width="2"/>' +
      '<path d="M4 6 H62 L80 22 L62 38 H4 Z" fill="#f7ecd2" stroke="#5d4a33" ' +
      'stroke-width="2.4" stroke-linejoin="round"/>' +
      '<text x="31" y="27" text-anchor="middle" font-size="13" font-weight="700" ' +
      'fill="#5d4a33">Details</text>' +
      "</svg>";
  }

  /* Suu leans on the post. Taken from app.js's export rather than copied in:
     archive.js used to carry its own duplicate of the sprite for the old foot
     signpost, and two copies of one drawing is one too many. Guarded because
     app.js could in principle not have run yet - a missing sprite costs the
     row nothing, an exception would cost it the whole deck. */
  function suuSprite() {
    var A = window.PORTFOLIO_APP;
    return (A && A.suuSprite) ? A.suuSprite() : "";
  }

  /* The icon column. Up to four MATCHED entries in stack order; unmatched ones
     are skipped rather than drawn (see STACK_ICONS). If nothing matched at all
     the column falls back to the parchment text chips the old card used, so a
     concepts-only project still says what it is built from. */
  function buildTools(p) {
    var box = el("div", "ar-tools");
    var stack = p.stack || [];
    var picked = [];
    stack.forEach(function (s) {
      if (picked.length >= MAX_TOOLS) return;
      var slug = STACK_ICONS[s];
      if (slug) picked.push({ slug: slug, label: s });
    });

    if (!picked.length) {
      box.classList.add("is-chips");
      stack.slice(0, MAX_TOOLS).forEach(function (s) {
        box.appendChild(el("span", "ar-toolchip", s));
      });
      return box;
    }

    picked.forEach(function (t) {
      var cell = el("span", "ar-tool");
      var img = document.createElement("img");
      img.src = "assets/projects/tool/" + t.slug + ".webp";
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      img.width = 32;
      img.height = 32;
      cell.appendChild(img);
      cell.appendChild(el("span", "ar-tlabel", t.label));
      box.appendChild(cell);
    });
    return box;
  }

  /* The right-hand column: what the project is BUILT FROM, as text. It
     replaced a meta index that repeated the kicker's own category and status
     word for word - the row said "Work Systems" and "LIVE" twice each, which
     is what made four short rows read as cluttered. The stack is the one thing
     the row can say that nothing else on it already says. Text, not the
     painted tool tiles buildTools() draws: the tiles were cut for weight and
     the chips carry the same names at a fraction of the ink. */
  function buildStack(p) {
    var box = el("div", "ar-tools is-chips");
    (p.stack || []).slice(0, MAX_TOOLS).forEach(function (s) {
      box.appendChild(el("span", "ar-toolchip", s));
    });
    return box;
  }

  function buildRow(pair) {
    var p = pair.p, i = pair.i;
    var labels = (window.PORTFOLIO_APP && window.PORTFOLIO_APP.CATEGORY_LABELS) || {};
    var catLabel = labels[p.category] || p.category;

    var row = el("article", "ar-row");
    row.setAttribute("data-project", p.id);

    var shot = el("div", "ar-shot");
    var img = document.createElement("img");
    /* the COLOUR plate, not thumb/'s sepia watermark - this one is a framed
       picture the reader is meant to look at, not paper texture behind text */
    img.src = "assets/projects/shot/" + p.id + ".webp";
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.loading = "lazy";
    shot.appendChild(img);
    row.appendChild(shot);

    var text = el("div", "ar-text");
    var kick = el("div", "ar-kick");
    kick.appendChild(el("span", "ar-cat", catLabel));
    kick.appendChild(el("span", "badge " + p.status, p.status));
    var yr = el("span", "ar-year", p.year);
    yr.setAttribute("data-edit", "projects." + i + ".year");
    kick.appendChild(yr);
    text.appendChild(kick);

    var h4 = el("h4", "ar-title", p.title);
    h4.setAttribute("data-edit", "projects." + i + ".title");
    text.appendChild(h4);

    var sub = el("p", "ar-sub", p.subtitle);
    sub.setAttribute("data-edit", "projects." + i + ".subtitle");
    text.appendChild(sub);
    row.appendChild(text);

    /* No tool icons. They were built to the previous blueprint and the user cut
       them: four painted tiles per row read as heavy against a row that is
       already carrying a picture, a title, a description and a meta column.
       buildTools(), STACK_ICONS and the tool/ assets are kept - the detail
       scroll still lists the stack, and dropping a working icon pipeline for a
       layout preference would be expensive to rebuild if it comes back. */
    row.appendChild(el("div", "ar-rule"));

    var end = el("div", "ar-end");
    end.appendChild(buildStack(p));

    /* The whole row has always been the click target (see the listener below),
       so the framed "View project" button was chrome around an action the row
       already offered. What is left is the affordance only - the deck's own
       signpost, shrunk to one row's scale, pointing into the project. */
    var go = el("span", "ar-go");
    go.innerHTML = '<span class="ar-suu" aria-hidden="true">' + suuSprite() + "</span>" +
      signpostSVG();
    end.appendChild(go);
    row.appendChild(end);

    var vine = document.createElement("img");
    vine.className = "ar-vine";
    vine.src = "assets/projects/vine.webp";
    vine.alt = "";
    vine.setAttribute("aria-hidden", "true");
    row.appendChild(vine);

    row.addEventListener("click", function (ev) {
      if (document.body.classList.contains("editing")) return;
      if (ev.target.closest("a, button, select, input")) return;
      if (window.PORTFOLIO_PROJ_SCROLL) window.PORTFOLIO_PROJ_SCROLL.open(p);
    });

    return row;
  }

  function renderPage() {
    if (!root) return;
    var list = indexed(filter);
    var pages = totalPages();
    if (pageIndex >= pages) pageIndex = pages - 1;
    if (pageIndex < 0) pageIndex = 0;

    var start = pageIndex * PAGE_SIZE;
    var slice = list.slice(start, start + PAGE_SIZE);

    var cards = root.querySelector(".ar-cards");
    cards.innerHTML = "";
    slice.forEach(function (pair) { cards.appendChild(buildRow(pair)); });

    var prev = root.querySelector(".ar-prev");
    var next = root.querySelector(".ar-next");
    prev.disabled = pageIndex === 0;
    next.disabled = pageIndex >= pages - 1;

    /* The deck replaces its cards on every page turn and filter change, so
       anything that hangs behaviour off a card has to be re-hung - the same
       pair of calls the deleted renderGrid() made. Without them the tilt dies
       after page one and the editor's per-project controls only ever reach
       the first four projects. */
    if (window.PORTFOLIO_MOTION) window.PORTFOLIO_MOTION.rewire();
    if (document.body.classList.contains("editing") && window.PORTFOLIO_EDITOR) {
      window.PORTFOLIO_EDITOR.rewire();
    }
  }

  function next() {
    if (pageIndex >= totalPages() - 1) return false;
    pageIndex++;
    renderPage();
    return true;
  }

  function prev() {
    if (pageIndex <= 0) return false;
    pageIndex--;
    renderPage();
    return true;
  }

  function page() {
    return { index: pageIndex, count: totalPages() };
  }

  /* The Sort control belongs to the LIST, but the blueprint sits it at the
     right-hand end of the shell's filter-tab row, not inside the deck. Rather
     than teach js/projects.js about sorting - it owns chrome for every view and
     the map has nothing to sort - this view reaches up to the tab row it was
     mounted under and hangs the control there, then takes it away again on
     unmount. The shell rebuilds its chrome from scratch on every mountInline(),
     so there is no stale copy to collide with.

     The blueprint's separate filter-icon button beside it is deliberately NOT
     built: the category tabs on this same row already do that job, and the user
     cut it. */
  function buildSort() {
    var wrap = el("label", "ar-sortwrap");
    wrap.appendChild(el("span", "ar-sortlbl", "Sort by:"));
    var sel = el("select", "ar-sort");
    [["latest", "Latest"], ["oldest", "Oldest"], ["az", "A-Z"]].forEach(function (o) {
      var opt = document.createElement("option");
      opt.value = o[0];
      opt.textContent = o[1];
      if (o[0] === sortMode) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", function () {
      sortMode = sel.value;
      /* page 1: after a re-sort the reader's old page number points at a
         different four projects, which reads as the list losing its place */
      pageIndex = 0;
      renderPage();
    });
    wrap.appendChild(sel);
    return wrap;
  }

  function attachSort() {
    if (!host) return;
    var chrome = host.parentNode;
    var tabs = chrome && chrome.querySelector(".pj-tabs");
    if (!tabs) return;
    sortWrap = buildSort();
    tabs.appendChild(sortWrap);
  }

  /* ---------- mounted view ---------- */
  function mount(hostEl) {
    host = hostEl;
    filter = "all";
    pageIndex = 0;

    root = el("div", "ar-root");
    root.setAttribute("data-view", "list");

    var head = el("div", "ar-head");
    var htext = el("div", "ar-htext");
    htext.appendChild(el("h3", "ar-h", "PROJECT ARCHIVE"));
    htext.appendChild(el("p", "ar-sub", "Browse all projects in the valley."));
    head.appendChild(htext);
    /* The blueprint's hand-written nudge. It sits under the view toggle, which
       the shell pins to the right of this same row - hence the right padding
       on .ar-head in the CSS, so a long heading never runs beneath it. */
    var hint = el("div", "ar-hint");
    hint.innerHTML =
      '<svg viewBox="0 0 48 26" aria-hidden="true">' +
      '<path d="M2 4 C 16 2, 30 6, 40 16" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M34 15 L41 17.5 L37 23" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "<span>Click a project<br>to view details</span>";
    head.appendChild(hint);
    root.appendChild(head);

    var deck = el("div", "ar-deck");
    var prevBtn = el("button", "ar-prev", "‹");
    prevBtn.type = "button";
    prevBtn.setAttribute("aria-label", "Previous projects");
    prevBtn.addEventListener("click", prev);
    deck.appendChild(prevBtn);

    deck.appendChild(el("div", "ar-cards"));

    var nextBtn = el("button", "ar-next", "›");
    nextBtn.type = "button";
    nextBtn.setAttribute("aria-label", "More projects");
    nextBtn.addEventListener("click", next);
    deck.appendChild(nextBtn);

    root.appendChild(deck);

    host.appendChild(root);
    attachSort();
    renderPage();
  }

  function unmount() {
    if (sortWrap && sortWrap.parentNode) sortWrap.parentNode.removeChild(sortWrap);
    sortWrap = null;
    host = null;
    root = null;
  }

  function setFilter(cat) {
    filter = cat;
    pageIndex = 0;
    renderPage();
  }

  window.PORTFOLIO_ARCHIVE = {
    next: next,
    prev: prev,
    page: page
  };

  document.addEventListener("DOMContentLoaded", function () {
    window.PORTFOLIO_PROJECTS.registerView("list", {
      mount: mount,
      unmount: unmount,
      setFilter: setFilter
    });
  });
})();
