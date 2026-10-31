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
          if (saved.sections && saved.sections.achievements && saved.sections.achievements.sub === "Every honour, certificate and moment worth keeping - collected era by era, from primary school to the present.") {
            saved.sections.achievements.sub = base.sections.achievements.sub;
          }
          if (saved.sections && saved.sections.journey && ["From 10 straight As at SPM to production automation systems - where I have been and what I shipped along the way.", "From 10 straight As at SPM to production automation systems. Where I have been and what I shipped along the way."].indexOf(saved.sections.journey.sub) !== -1) {
            saved.sections.journey.sub = base.sections.journey.sub;
          }
          // backfill sections added after the edits were saved
          if (!saved.aboutLetter && base.aboutLetter) {
            saved.aboutLetter = JSON.parse(JSON.stringify(base.aboutLetter));
          }
          // Refresh the previous default contact wording, preserving custom edits.
          if (saved.sections && saved.sections.contact) {
            if (saved.sections.contact.heading === "Let's talk") saved.sections.contact.heading = base.sections.contact.heading;
            if (saved.sections.contact.sub === "Open to conversations about automation, data, AI-assisted operations and interactive 3D.") saved.sections.contact.sub = base.sections.contact.sub;
          }
          if (!saved.achievements && base.achievements) {
            saved.achievements = JSON.parse(JSON.stringify(base.achievements));
            saved.achievementEras = JSON.parse(JSON.stringify(base.achievementEras));
          }
          if (saved.sections && !saved.sections.achievements && base.sections.achievements) {
            saved.sections.achievements = JSON.parse(JSON.stringify(base.sections.achievements));
          }
          /* skills[] was reshaped 2026-08-12 from {group, items:[string]} to
             {group, chest, blurb, core[], also[]} of {name, card, note} -
             WITHIN schema 2, so migrate() waves the old shape straight
             through. A saved copy from before then renders six chests with
             `undefined.webp` and zero tools. The new shape carries per-tool
             card slugs and notes that the old one cannot produce, so there is
             nothing to convert from: take the file's version wholesale. */
          if (Array.isArray(saved.skills) &&
              saved.skills.some(function (g) { return g && !g.core; })) {
            saved.skills = JSON.parse(JSON.stringify(base.skills));
          }
          return window.PORTFOLIO_RESUME_CONTENT.upgrade(saved, base);
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

  /* ---------- featured work: two playable theatre stages ----------
     The scene art belongs OUTSIDE the exhibit. PORTFOLIO_EXHIBITS remains the
     sole owner of each mini-game, so the DO Rename tabs/flow and the Kellie
     controls keep their exact DOM and event handlers. */
  function featurePresentation(p) {
    var defaults = {
      "vr-escape-room": {
        scene: "castle",
        facts: ["3 playable escape-room levels", "25 / 25 system tests passed", "90% top user-acceptance rating"],
        action: "Play the castle teaser",
        status: "Adventure Status: Ready"
      },
      "do-pipeline": {
        scene: "mill",
        facts: ["29 OCR fields read", "4 business rules applied", "Humans handle only exceptions"],
        action: "Explore the story",
        status: "Story Status: Live",
        showStack: false
      }
    };
    var value = p.featuredPresentation || defaults[p.id] || {};
    return {
      scene: value.scene || "mill",
      facts: value.facts || [p.period || "", p.subtitle || "", p.impact || ""],
      action: value.action || "Explore the story",
      status: value.status || ((p.status === "LIVE" ? "Story Status: Live" : "Status: " + (p.status || ""))),
      plaque: value.plaque || "",
      showStack: p.id === "vr-escape-room" ? false : value.showStack !== false
    };
  }

  function featureFacts(p, i, presentation) {
    var list = el("ul", "ft-facts");
    presentation.facts.slice(0, 3).forEach(function (fact, factIndex) {
      var item = el("li", null, fact);
      if (p.featuredPresentation && p.featuredPresentation.facts) {
        item.setAttribute("data-edit", "projects." + i + ".featuredPresentation.facts." + factIndex);
      }
      list.appendChild(item);
    });
    return list;
  }

  function featureStoryAction(p, presentation) {
    var b = el("button", "ft-story", presentation.action + "  →");
    b.type = "button";
    b.addEventListener("click", function () {
      if (window.PORTFOLIO_PROJ_SCROLL && window.PORTFOLIO_PROJ_SCROLL.open) {
        window.PORTFOLIO_PROJ_SCROLL.open(p);
        return;
      }
      var target = document.getElementById("projects");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return b;
  }

  /* ---------- DO Rename scene layout ----------
     The Hall editor writes scene-specific rules. The workbench is already
     divided into stable, meaningful DOM assets, so its adapter can use one
     consistent contract for each of them: x/y are percentages of the
     containing box and sx/sy are independent visual scales. Individual CSS
     transform properties compose with decorative transforms such as the
     sticky note's rotation instead of replacing them. */
  var DO_LAYOUT_TARGETS = [
    ["project-card", "Project card", null],
    ["brief", "Project summary", ".ft-brief"],
    ["stage", "Framed stage", ".ft-stage--mill"],
    ["workbench", "Whole workbench", ".dw"],
    ["crate", "Incoming orders", ".dw-crate"],
    ["add-button", "Add documents button", ".dw-add"],
    ["viewer", "Whole document viewer", ".dw-viewer"],
    ["document", "Document area (group)", ".dw-glass"],
    ["document-background", "Document background/frame", ".dw-viewer-bg"],
    ["document-sheet", "Delivery order sheet", ".dw-paper-space"],
    ["console", "Inspection console", ".dw-console"],
    ["inspection-screen", "Inspection screen", ".dw-screen"],
    ["run-button", "Run inspection button", ".dw-run"],
    ["rules-tab", "Rules tab", ".dw-rules-tab"],
    ["pipeline", "Pipeline", ".dw-pipe"],
    ["gauge", "Status gauge", ".dw-gauge"],
    ["sticky", "Exception note", ".dw-sticky"]
  ];
  var DO_LAYOUT_BOUNDS = {};
  var DO_LAYOUT_DEFAULTS = {};
  function registerDoLayoutTarget(target) {
    var id = target[0];
    if (Object.prototype.hasOwnProperty.call(DO_LAYOUT_DEFAULTS, id + ".x")) return;
    DO_LAYOUT_DEFAULTS[id + ".x"] = 0;
    DO_LAYOUT_DEFAULTS[id + ".y"] = 0;
    DO_LAYOUT_DEFAULTS[id + ".sx"] = 1;
    DO_LAYOUT_DEFAULTS[id + ".sy"] = 1;
    DO_LAYOUT_BOUNDS[id + ".x"] = [-100, 100];
    DO_LAYOUT_BOUNDS[id + ".y"] = [-100, 100];
    DO_LAYOUT_BOUNDS[id + ".sx"] = [0.2, 3];
    DO_LAYOUT_BOUNDS[id + ".sy"] = [0.2, 3];
  }
  DO_LAYOUT_TARGETS.forEach(registerDoLayoutTarget);
  function doLayoutScene() {
    return document.querySelector('.ft-scene[data-project="do-pipeline"]');
  }
  function doRenameTargets(scene) {
    var targets = DO_LAYOUT_TARGETS.slice();
    if (!scene) return targets;
    [].forEach.call(scene.querySelectorAll(".dw-file"), function (row, index) {
      var filename = row.querySelector(".dw-file-open");
      var target = ["document-label-" + (index + 1),
        "Document label " + (index + 1) + " — " +
          (filename ? filename.textContent.trim() : "document"), null, row];
      registerDoLayoutTarget(target);
      targets.push(target);
    });
    return targets;
  }
  function doLayoutElement(scene, target) {
    return target[3] || (target[2] ? scene.querySelector(target[2]) : scene);
  }
  function doLayoutVal(path) {
    var o = (window.SCENE_LAYOUT && window.SCENE_LAYOUT["do-rename"]) || {};
    var v = o[path], b = DO_LAYOUT_BOUNDS[path];
    if (typeof v !== "number" || !isFinite(v)) v = DO_LAYOUT_DEFAULTS[path];
    return b ? Math.min(b[1], Math.max(b[0], v)) : v;
  }
  function applyDoRenameLayout(scene) {
    scene = scene || doLayoutScene();
    if (!scene) return;
    /* The live desk intentionally stands down below its desktop boundary.
       Clear even identity transforms there: saved desktop card/stage tuning
       must not shift or shrink the semantic fallback, and inline styles from
       a desktop-to-compact resize must not survive the remount. */
    if (!scene.querySelector(".dw")) {
      doRenameTargets(scene).forEach(function (target) {
        var fallbackNode = doLayoutElement(scene, target);
        if (!fallbackNode) return;
        fallbackNode.style.removeProperty("translate");
        fallbackNode.style.removeProperty("scale");
      });
      return;
    }
    doRenameTargets(scene).forEach(function (target) {
      var node = doLayoutElement(scene, target);
      if (!node) return;
      var parent = node.offsetParent || node.parentElement;
      var pw = parent ? parent.clientWidth : window.innerWidth;
      var ph = parent ? parent.clientHeight : window.innerHeight;
      node.style.translate = (pw * doLayoutVal(target[0] + ".x") / 100) + "px " +
                             (ph * doLayoutVal(target[0] + ".y") / 100) + "px";
      node.style.scale = doLayoutVal(target[0] + ".sx") + " " +
                         doLayoutVal(target[0] + ".sy");
    });
  }

  function watchDoRenameLayout(scene) {
    applyDoRenameLayout(scene);
    if (!window.MutationObserver) return;
    var observer = new MutationObserver(function () {
      applyDoRenameLayout(scene);
    });
    /* Keep watching after the first mount. exhibits.js replaces the live desk
       with a fallback (and back again) at its responsive boundary; applying
       after each remount clears desktop transforms from the fallback and
       restores them when the workbench returns. */
    observer.observe(scene, { childList: true, subtree: true });
  }

  function waitForDoRenameWorkbench() {
    var scene = doLayoutScene();
    if (scene && scene.querySelector(".dw")) return Promise.resolve();
    if (!window.DEMOS_READY) return Promise.reject(new Error("DO Rename scripts were not started"));
    return window.DEMOS_READY.then(function () {
      scene = doLayoutScene();
      if (scene && scene.querySelector(".dw")) return;
      return new Promise(function (resolve, reject) {
        if (!scene || !window.MutationObserver) {
          reject(new Error("DO Rename workbench did not mount"));
          return;
        }
        var timer = null;
        var observer = new MutationObserver(function () {
          if (!scene.querySelector(".dw")) return;
          observer.disconnect();
          clearTimeout(timer);
          resolve();
        });
        observer.observe(scene, { childList: true, subtree: true });
        timer = setTimeout(function () {
          observer.disconnect();
          reject(new Error("DO Rename workbench timed out while loading"));
        }, 4000);
      });
    });
  }

  function renderFeatures(content) {
    var wrap = $("#features");
    wrap.innerHTML = "";
    content.projects.forEach(function (p, i) {
      if (!p.featured) return;
      var presentation = featurePresentation(p);
      var scene = el("article", "ft-scene ft-scene--" + presentation.scene + " reveal");
      scene.setAttribute("data-project", p.id);

      var brief = el("aside", "ft-brief");
      brief.appendChild(el("p", "f-cat", (CATEGORY_LABELS[p.category] || p.category) + " · " + (p.year || "")));
      var h3 = el("h3", null, p.title);
      h3.id = "ft-title-" + p.id;
      h3.setAttribute("data-edit", "projects." + i + ".title");
      scene.setAttribute("aria-labelledby", h3.id);
      brief.appendChild(h3);
      brief.appendChild(el("span", "badge " + p.status, p.status));
      var pill = el("span", "ft-status");
      pill.appendChild(el("i"));
      pill.appendChild(document.createTextNode(presentation.status));
      brief.appendChild(pill);
      var sub = el("p", "f-sub", p.subtitle);
      sub.setAttribute("data-edit", "projects." + i + ".subtitle");
      brief.appendChild(sub);
      brief.appendChild(featureFacts(p, i, presentation));
      if (presentation.showStack) brief.appendChild(stackRow(p, i));
      var links = linksRow(p);
      if (links && presentation.scene === "castle" && window.innerWidth > 760 &&
          !window.matchMedia("(pointer: coarse)").matches) {
        var destination = links.querySelector('a[href="kellie.html"]');
        if (destination) {
          var play = el("button", "ft-story", "Play the castle teaser →");
          play.type = "button";
          play.onclick = function () {
            var begin = function () {
              if (!scene.isConnected) return;
              var box = scene.querySelector(".cx-host");
              if (box && box.castleExperience) box.castleExperience.start();
              stage.scrollIntoView({ block: "center", behavior: "smooth" });
            };
            if (window.DEMOS_READY) window.DEMOS_READY.then(begin);
            else begin();
          };
          destination.replaceWith(play);
        }
      }
      if (links && presentation.scene === "castle") {
        var fallbackLink = links.querySelector('a[href="kellie.html"]');
        if (fallbackLink) fallbackLink.href = "kellie.html?v=castle-fyp-v2.4";
      }
      if (links) brief.appendChild(links);
      else brief.appendChild(featureStoryAction(p, presentation));
      scene.appendChild(brief);

      var stage = el("div", "ft-stage ft-stage--" + presentation.scene);
      var scenery = el("div", "ft-scenery");
      scenery.setAttribute("aria-hidden", "true");
      stage.appendChild(scenery);
      var exhibit = el("div", "feature-exhibit");
      stage.appendChild(exhibit);
      /* exhibits.js chooses the DO scene's semantic order from its exact
         responsive mount mode. Attach the stage before invoking it so that
         lifecycle can move a real sibling rather than an orphaned fragment. */
      scene.appendChild(stage);
      window.PORTFOLIO_EXHIBITS.render(exhibit, p);
      wrap.appendChild(scene);
      if (p.id === "do-pipeline") watchDoRenameLayout(scene);
    });
  }

  /* ---------- all projects ----------
     The chip bar, the card grid, the inline detail panel and Suu's signpost
     all lived here until Task 8. The section is now the archive itself:
     js/projects.js paints its own chrome and mounts js/archive.js's card deck
     into #projects-inline, so this file only has to hand over the host. */
  function renderProjectsInline() {
    var host = $("#projects-inline");
    if (host && window.PORTFOLIO_PROJECTS) window.PORTFOLIO_PROJECTS.mountInline(host);
  }

  /* ---------- avatar / skills / journey / contact ---------- */
  var aboutVisibility = null;
  var aboutCardsBound = false;
  function bindAboutCards() {
    var section = document.getElementById("about");
    var panel = section && section.querySelector(".about-detail");
    if (!panel || aboutCardsBound) return;
    aboutCardsBound = true;
    var paper = section.querySelector(".about-letter");
    var cards = $all("[data-about-view]", section);
    var views = $all("[data-about-panel]", panel);
    var closeButton = panel.querySelector(".about-detail-close");
    var title = panel.querySelector("#about-detail-title");
    var active = null;
    var titles = { building: "A little about me.", creating: "Worlds I build.", learning: "On my desk lately." };
    function closeDetails() {
      panel.hidden = true;
      paper.classList.remove("is-detail-open");
      views.forEach(function (view) { view.hidden = true; });
      cards.forEach(function (card) { card.setAttribute("aria-expanded", "false"); });
      var previous = active;
      active = null;
      if (previous) previous.focus({ preventScroll: true });
    }
    cards.forEach(function (card) {
      card.addEventListener("click", function (event) {
        if (document.body.classList.contains("editing") && event.target.closest("[data-edit]")) return;
        if (active === card && !panel.hidden) { closeDetails(); return; }
        active = card;
        var key = card.getAttribute("data-about-view");
        title.textContent = titles[key];
        views.forEach(function (view) { view.hidden = view.getAttribute("data-about-panel") !== key; });
        cards.forEach(function (item) { item.setAttribute("aria-expanded", String(item === card)); });
        panel.hidden = false;
        paper.classList.add("is-detail-open");
        closeButton.focus({ preventScroll: true });
        var bounds = paper.getBoundingClientRect();
        if (bounds.top < 76 || bounds.bottom > window.innerHeight - 12) {
          paper.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        }
      });
    });
    closeButton.addEventListener("click", closeDetails);
    section.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) { event.preventDefault(); event.stopPropagation(); closeDetails(); }
    });
  }
  function renderAvatar(content) {
    var wrap = $("#avatar-wrap");
    wrap.innerHTML = "";
    // About Me is typographic by request; the separate hero portrait is unchanged.
    wrap.appendChild(el("span", "about-monogram", content.identity.monogram || "XE"));
    bindAboutCards();
    if (!aboutVisibility && window.IntersectionObserver) {
      var aboutSection = document.getElementById("about");
      aboutVisibility = new IntersectionObserver(function (entries) {
        document.body.classList.toggle("about-journal-in-view", entries[0].isIntersecting);
      });
      aboutVisibility.observe(aboutSection);
    }
  }

  /* ---------- the Toolbox: a workshop of station chests ----------
     Six painted chests on a workbench. Clicking one opens it and its FRONT ROW
     of tools rises out; the full list - front row plus "also worked with" -
     lives on a parchment that is opt-in, because a panel that opens on every
     interaction is noise rather than information (the Journey learned this).

     The scene is a FIXED-ASPECT stage whose background is `100% 100%`, never
     `cover`. That is deliberate: the Hall facade broke because a `cover` plate
     and a positioned overlay drift apart at every viewport (measured crop
     scale 0.56-0.84). Nothing here is cropped, so a percentage means the same
     thing at every width and the chests never float off the bench. */
  /* ---------- toolbox scene layout ----------
     Every bit of the workshop's geometry is a CSS custom property on
     .tb-stage, so the scene editor tunes it by writing numbers here rather
     than by knowing anything about the markup. Defaults are what the scene
     ships with; SCENE_LAYOUT.toolbox overrides them, exactly as the hall does.
     Units are PERCENT of the stage except chest.max, which is px. */
  var TB_DEFAULTS = {
    "bench.w": 97.438, "bench.b": -18.12, "deck": 22.2881, "chest.max": 108,
    "row.x0": 18.2922, "row.x1": 18.9751, "suu.x": 9.7365, "suu.w": 5.5657,
    "head.x": 6.6, "head.y": 13.5, "head.w": 21
  };
  var TB_BOUNDS = {
    "bench.w": [30, 110], "bench.b": [-45, 30], "deck": [1, 72], "chest.max": [36, 280],
    "row.x0": [0, 46], "row.x1": [0, 46], "suu.x": [0, 93], "suu.w": [1.5, 16],
    "head.x": [0, 74], "head.y": [0, 74], "head.w": [8, 62]
  };
  function tbVal(k) {
    var o = (window.SCENE_LAYOUT && window.SCENE_LAYOUT.toolbox) || {};
    var v = o[k], b = TB_BOUNDS[k];
    if (typeof v !== "number" || !isFinite(v)) return TB_DEFAULTS[k];
    if (b) v = Math.min(b[1], Math.max(b[0], v));
    return v;
  }
  function applyToolboxLayout(stage) {
    if (!stage) return;
    var pct = ["bench.w", "bench.b", "deck", "row.x0", "row.x1", "suu.x", "suu.w",
               "head.x", "head.y", "head.w"];
    pct.forEach(function (k) {
      stage.style.setProperty("--" + k.replace(".", "-"), tbVal(k) + "%");
    });
    stage.style.setProperty("--chest-max", tbVal("chest.max") + "px");
  }

  var tbCard = null;          // the shared parchment, appended to <body>

  function toolsOf(g) { return (g.core || []).concat(g.also || []); }

  function closeToolCard() {
    if (!tbCard) return;
    tbCard.classList.remove("in");
    tbCard.hidden = true;
    document.body.classList.remove("tb-card-open");
  }

  function openToolCard(g) {
    if (!tbCard) {
      tbCard = el("div", "tb-scrim");
      /* on <body>, not in the stage: `position: fixed` is defeated by any
         transformed ancestor, and the stage animates its chests */
      document.body.appendChild(tbCard);
      tbCard.addEventListener("click", function (ev) {
        if (ev.target === tbCard || ev.target.closest(".tb-close, .tb-back")) closeToolCard();
      });
      document.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape") closeToolCard();
      });
    }
    tbCard.innerHTML = "";
    var panel = el("div", "tb-panel");
    var close = el("button", "tb-close", "×");
    close.setAttribute("aria-label", "close");
    panel.appendChild(close);

    /* Two columns of tools beside a standing panel of station identity, per
       the detail blueprint. Six tools fill that grid; a station with more is
       PAGED rather than scrolled - and the page break is the tier, so page one
       is what I reach for and page two is what I have worked with. Every core
       list is <= 6 and every also list is <= 6, so two pages always suffice. */
    var pages = [{ label: "", items: g.core || [] }];
    if ((g.also || []).length) pages.push({ label: "also worked with", items: g.also });

    var body = el("div", "tb-panel-body");
    var side = el("div", "tb-side");
    var chest = document.createElement("img");
    chest.src = "assets/toolbox/" + g.chest + ".webp";
    chest.alt = "";
    chest.className = "tb-side-icon";
    side.appendChild(chest);
    side.appendChild(el("h3", null, g.group));
    side.appendChild(el("p", null, g.blurb || ""));
    body.appendChild(side);
    var gridEl = el("div", "tb-grid");
    body.appendChild(gridEl);
    panel.appendChild(body);

    var foot = el("div", "tb-foot");
    var dots = el("div", "tb-dots");
    var back = el("button", "tb-back", "Back to Toolbox");
    foot.appendChild(dots);
    foot.appendChild(back);
    panel.appendChild(foot);

    var at = 0;
    function paint() {
      gridEl.innerHTML = "";
      var p = pages[at];
      if (p.label) gridEl.appendChild(el("p", "tb-page-label", p.label));
      p.items.forEach(function (t) {
        var row = el("div", "tb-row");
        var ic = document.createElement("img");
        ic.src = "assets/toolbox/cards/" + t.card + ".webp";
        ic.alt = "";
        ic.loading = "lazy";
        row.appendChild(ic);
        var txt = el("div", null);
        txt.appendChild(el("b", null, t.name));
        if (t.note) txt.appendChild(el("span", null, t.note));
        row.appendChild(txt);
        gridEl.appendChild(row);
      });
      dots.innerHTML = "";
      if (pages.length > 1) {
        pages.forEach(function (pg, pi) {
          var b = el("button", "tb-dot" + (pi === at ? " on" : ""));
          b.setAttribute("aria-label", pi ? "also worked with" : "main tools");
          b.addEventListener("click", function () { at = pi; paint(); });
          dots.appendChild(b);
        });
      }
    }
    paint();

    tbCard.appendChild(panel);
    tbCard.hidden = false;
    document.body.classList.add("tb-card-open");
    void tbCard.offsetWidth;
    tbCard.classList.add("in");
    close.focus();
  }

  /* the plain list - mobile and edit mode. Identical content, no scene, and
     none of the scene's bytes: only the parchment's own icons are fetched. */
  function buildToolList(grid, content, editing) {
    grid.className = "tb-list";
    var sec = document.getElementById("skills");
    if (sec) sec.classList.remove("tb-scene");   // the real heading comes back
    content.skills.forEach(function (g, gi) {
      var box = el("div", "tb-li reveal");
      var h = el("h3", null, g.group);
      h.setAttribute("data-edit", "skills." + gi + ".group");
      box.appendChild(h);
      if (g.blurb) box.appendChild(el("p", "tb-li-blurb", g.blurb));
      ["core", "also"].forEach(function (tier) {
        (g[tier] || []).forEach(function (t, ti) {
          var li = el("span", "tag" + (tier === "also" ? " tag-dim" : ""), t.name);
          li.setAttribute("data-edit", "skills." + gi + "." + tier + "." + ti + ".name");
          box.appendChild(li);
        });
      });
      if (!editing) {
        var more = el("button", "tb-more", "All " + toolsOf(g).length + " tools");
        more.addEventListener("click", function () { openToolCard(g); });
        box.appendChild(more);
      }
      grid.appendChild(box);
    });
  }

  function buildWorkshop(grid, content) {
    grid.className = "tb-stage";
    applyToolboxLayout(grid);
    var bench = document.createElement("img");
    bench.src = "assets/toolbox/workshop-counter-v1.webp";
    bench.alt = "";
    bench.className = "tb-bench";
    grid.appendChild(bench);
    var benchGuide = el("p", "tb-bench-guide");
    benchGuide.appendChild(el("strong", null, "Click a toolbox to reveal its tools"));
    benchGuide.appendChild(el("span", null, "Choose “All tools” for details."));
    grid.appendChild(benchGuide);

    /* The title is painted into the scene rather than sitting above it. This
       is a COPY, not the section's own <h2> moved: the real one keeps its
       data-edit bindings and is simply hidden while the scene is showing, and
       edit mode renders the list, where it is visible and editable again. */
    var sh = (content.sections && content.sections.skills) || {};
    var head = el("div", "tb-head");
    head.appendChild(el("h2", null, sh.heading || "Toolbox"));
    if (sh.sub) head.appendChild(el("p", null, sh.sub));
    grid.appendChild(head);
    var sec = document.getElementById("skills");
    if (sec) sec.classList.add("tb-scene");

    // Suu on the desk, on the bench's own ground line
    var suu = el("div", "tb-suu");
    suu.setAttribute("aria-hidden", "true");
    suu.innerHTML = suuSpriteSVG();
    grid.appendChild(suu);

    var row = el("div", "tb-stations");
    content.skills.forEach(function (g, gi) {
      /* The station is a DIV holding two real buttons, not one button with a
         span inside it. As a single button the chip was unreachable by
         keyboard (you could open a chest but never its parchment), and being
         absolutely positioned at top:100% it hit-tested BELOW the closed
         chest while invisible - a click on empty bench opened the panel. */
      var st = el("div", "tb-station");
      var open = el("button", "tb-open");
      open.setAttribute("aria-expanded", "false");
      open.setAttribute("aria-label", "Open " + g.group);
      var img = document.createElement("img");
      img.src = "assets/toolbox/" + g.chest + ".webp";
      img.alt = g.group;
      img.className = "tb-chest";
      open.appendChild(img);

      /* The front row, parked inside the chest until it opens. Laid out in up
         to TWO rows: six cards on one row span ~470px and collide with the
         neighbouring stations, which are only ~170px apart. First items go on
         the upper row so the cluster reads top-to-bottom. */
      var core = g.core || [];
      var rows = core.length > 4 ? 2 : 1;
      var perRow = Math.ceil(core.length / rows);
      var fly = el("span", "tb-fly");
      core.forEach(function (t, ti) {
        if (!t.card) return;                 // a hand-added tool has no art yet
        var c = document.createElement("img");
        c.src = "assets/toolbox/cards/" + t.card + ".webp";
        c.alt = t.name;
        c.loading = "lazy";
        c.className = "tb-flycard";
        var r = Math.floor(ti / perRow), col = ti % perRow;
        var inRow = Math.min(perRow, core.length - r * perRow);
        var off = col - (inRow - 1) / 2;
        c.style.setProperty("--fx", Math.round(off * 76) + "px");
        c.style.setProperty("--fy", -(96 + (rows - 1 - r) * 84) + "px");
        c.style.setProperty("--fr", (off * 4).toFixed(1) + "deg");
        c.style.transitionDelay = (ti * 55) + "ms";
        fly.appendChild(c);
      });
      open.appendChild(fly);
      st.appendChild(open);

      var more = el("button", "tb-chip", "All " + toolsOf(g).length + " tools");
      more.addEventListener("click", function () { openToolCard(g); });
      st.appendChild(more);

      open.addEventListener("click", function () {
        var wasOpen = st.classList.contains("open");
        $all(".tb-station", grid).forEach(function (o) {
          o.classList.remove("open");
          var ob = o.querySelector(".tb-open");
          if (ob) ob.setAttribute("aria-expanded", "false");
        });
        st.classList.toggle("open", !wasOpen);         // one chest open at a time
        open.setAttribute("aria-expanded", String(!wasOpen));
      });
      row.appendChild(st);
    });
    grid.appendChild(row);
  }

  /* ---------- the toolbox's scene-editor adapter ----------
     Registered the same way the hall is, so the admin page lists it with no
     changes there. render() only re-applies the custom properties: all the
     geometry is CSS, so a drag never has to rebuild the DOM. */
  function tbHandleList() {
    var stage = document.querySelector(".tb-stage");
    if (!stage) return [];
    var sr = stage.getBoundingClientRect();
    if (!sr.width || !sr.height) return [];
    var perX = 100 / sr.width, perY = 100 / sr.height;   // percent per pixel
    var out = [];
    function rectOf(sel) {
      var n = stage.querySelector(sel);
      if (!n) return null;
      var r = n.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }
    function w(path, axis, per, label) {
      var b = TB_BOUNDS[path];
      return { path: path, axis: axis, perPx: per, value: tbVal(path),
               min: b[0], max: b[1], step: 0.1, label: label };
    }

    /* The bench. Dragging the body writes bench.b AND deck together, so the
       chests and Suu ride down with the table instead of being left hanging -
       the same reason a hall shelf writes its edges when it moves. The east
       grip is 2x because the bench is centred, so an edge moves half of what
       the width does. */
    var br = rectOf(".tb-bench");
    if (br) {
      var bb = w("bench.b", "y", -perY, "Table · height");
      var dk = w("deck", "y", -perY, "Shelf line");
      var bw = w("bench.w", "x", 2 * perX, "Table · width");
      out.push({ path: "bench", label: "Table", kind: "rule", rect: br,
                 moves: [bb, dk], grips: [{ dir: "e", writes: [bw] }, { dir: "w", writes: [w("bench.w", "x", -2 * perX, "Table · width")] }],
                 props: [bb, bw, dk] });
    }
    // the row of chests: body moves the shelf line, grips set its extent and size
    var rr = rectOf(".tb-stations");
    if (rr) {
      var dk2 = w("deck", "y", -perY, "Toolboxes · height");
      var x0 = w("row.x0", "x", perX, "Toolboxes · left inset");
      var x1 = w("row.x1", "x", -perX, "Toolboxes · right inset");
      var cm = { path: "chest.max", axis: "y", perPx: -1, value: tbVal("chest.max"),
                 min: TB_BOUNDS["chest.max"][0], max: TB_BOUNDS["chest.max"][1],
                 step: 1, label: "Toolboxes · size" };
      out.push({ path: "row", label: "Toolboxes", kind: "item", rect: rr,
                 moves: [dk2],
                 grips: [{ dir: "w", writes: [x0] }, { dir: "e", writes: [x1] },
                         { dir: "n", writes: [cm] }],
                 props: [dk2, x0, x1, cm] });
    }
    var ur = rectOf(".tb-suu");
    if (ur) {
      var sx = w("suu.x", "x", perX, "Suu · across");
      var sw = w("suu.w", "x", perX, "Suu · size");
      out.push({ path: "suu", label: "Suu", kind: "item", rect: ur,
                 moves: [sx], grips: [{ dir: "e", writes: [sw] }], props: [sx, sw] });
    }
    var hr = rectOf(".tb-head");
    if (hr) {
      var hx = w("head.x", "x", perX, "Title · across");
      var hy = w("head.y", "y", perY, "Title · down");
      var hw = w("head.w", "x", perX, "Title · width");
      out.push({ path: "head", label: "Title", kind: "item", rect: hr,
                 moves: [hx, hy], grips: [{ dir: "e", writes: [hw] }], props: [hx, hy, hw] });
    }
    return out;
  }

  /* Registered further down, AFTER the hall's - the admin enables whichever
     adapter is first in the list, and the hall should stay the default. */

  /* Registered ONCE, outside renderSkills - inside it would leak a listener
     per renderAll. Without this the breakpoint was evaluated only at load, so
     resizing a desktop window down to phone width kept the workshop: six
     chests in a 219px band, the exact case the list exists to prevent. */
  var tbMQ = window.matchMedia("(max-width: 760px)");
  var tbWasNarrow = tbMQ.matches;
  function onSkillsBreakpoint() {
    if (tbMQ.matches === tbWasNarrow) return;
    tbWasNarrow = tbMQ.matches;
    var app = window.PORTFOLIO_APP;
    if (app && app.content) {
      renderSkills(app.content);
      if (window.PORTFOLIO_MOTION) window.PORTFOLIO_MOTION.rewire();
    }
  }
  /* Both, on purpose. The MediaQueryList `change` event proved unreliable
     when the viewport is resized programmatically (measured: matches flipped
     to true, no event), so a debounced resize backs it up - the same handler
     the journey and the hall use. The matches===was guard makes the extra
     calls free. */
  if (tbMQ.addEventListener) tbMQ.addEventListener("change", onSkillsBreakpoint);
  else if (tbMQ.addListener) tbMQ.addListener(onSkillsBreakpoint);   // older Safari
  var tbResizeT = null;
  window.addEventListener("resize", function () {
    clearTimeout(tbResizeT);
    tbResizeT = setTimeout(onSkillsBreakpoint, 180);
  });

  function renderSkills(content) {
    var grid = $("#skills-grid");
    grid.innerHTML = "";
    closeToolCard();
    var editing = document.body.classList.contains("editing");
    // Six chests across 390px is 65px each - unusable. The list is not a
    // degraded scene, it is the same content without one.
    var narrow = tbMQ.matches;
    tbWasNarrow = narrow;
    if (editing || narrow) { buildToolList(grid, content, editing); return; }
    buildWorkshop(grid, content);
  }

  /* ---------- journey: plain timeline OR the adventure map ----------
     The map draws the road straight onto the painted valley (no panel),
     shows every chapter's full story beside its stop, and Suu walks the
     road: click a stop to send Suu there (default), "let Suu walk" plays
     the whole journey, "reset" ghosts everything and returns Suu to 01. */
  var journeyView = "map";

  /* ---------- the chapter modal, shared by BOTH journey views ----------
     Lives on <body>, not inside the section: position:fixed is defeated by any
     transformed ancestor, and the journey stage has several. Being fixed it
     also cannot affect the section's height. */
  var jModal = null;
  function closeJourneyModal() {
    if (!jModal) return;
    jModal.classList.remove("in");
    jModal.hidden = true;
    document.body.classList.remove("ja-modal-open");
  }
  function openJourneyModal(t, idx) {
    if (!jModal) {
      jModal = el("div", "ja-card");
      jModal.hidden = true;
      jModal.addEventListener("click", function (ev) {
        if (!ev.target.closest(".ja-panel")) closeJourneyModal();
      });
      document.body.appendChild(jModal);
      document.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape" && jModal && !jModal.hidden) closeJourneyModal();
      });
    }
    jModal.innerHTML = "";
    var panel = el("div", "ja-panel");
    /* The parchment itself must NOT scroll - an absolutely positioned close
       button inside a scroll box slides away with the content on a long
       chapter. The paper stays put and an inner body scrolls instead. */
    var close = el("button", "ja-close");
    close.setAttribute("aria-label", "Close chapter");
    close.addEventListener("click", closeJourneyModal);
    panel.appendChild(close);
    var body = el("div", "ja-body");
    var head = el("div", "ja-head");
    head.appendChild(el("b", "ja-num", (idx < 9 ? "0" : "") + (idx + 1)));
    var tt = el("div");
    tt.appendChild(el("div", "ja-place", (t.place ? t.place + " · " : "") + (t.period || "")));
    tt.appendChild(el("div", "ja-role", t.role || ""));
    tt.appendChild(el("div", "ja-org", t.org || ""));
    head.appendChild(tt);
    body.appendChild(head);
    if (t.points && t.points.length) {
      var ul = el("ul", "ja-points");
      t.points.forEach(function (p) { ul.appendChild(el("li", null, p)); });
      body.appendChild(ul);
    }
    panel.appendChild(body);
    jModal.appendChild(panel);
    jModal.hidden = false;
    document.body.classList.add("ja-modal-open");
    void jModal.offsetWidth;
    jModal.classList.add("in");
  }

  /* ---------- the OVERVIEW: the same train, parked ----------
     All chapters at once, no travelling - the scannable counterpart to the
     ride. It replaces the plain timeline as the second view; the timeline DOM
     stays rendered for edit mode and for search engines. */
  function buildOverview(content, adv) {
    var chapters = content.timeline.slice().reverse();          // oldest first
    if (!chapters.length) { adv.innerHTML = ""; return; }
    var narrow = window.matchMedia("(max-width: 760px)").matches;
    /* The two views share one painted plate, so they must be the same size -
       these three numbers are buildAdventure's and have to stay in step with
       it. GROUND is its ROAD_Y measured from the stage bottom, so the parked
       consist stands on the same line the ride's train runs on. */
    var STAGE_H = narrow ? 240 : 300;
    var GROUND = 74;
    var SIGN_ROOM = narrow ? 46 : 58;   // the hanging signboard above a carriage
    // the whole consist must FIT - showing all five at once is the entire point
    var units = (508 + chapters.length * 524 + 827) / 328;
    var CH = Math.max(narrow ? 74 : 84,
                      Math.min(narrow ? 104 : 150,
                               STAGE_H - GROUND - SIGN_ROOM,
                               Math.floor(((adv.clientWidth || 1140) - 36) / units)));
    var CAR_W = Math.round(CH * 524 / 328);

    adv.innerHTML = "";
    adv.style.setProperty("--ja-stage-h", STAGE_H + "px");
    adv.style.setProperty("--ja-ground", GROUND + "px");
    /* The ride carries a control row above its stage. The overview keeps the
       row - filled with its hint instead of buttons - so both views are
       [row][stage] and #journey is the same height either way. */
    var ctl = el("div", "ja-controls");
    ctl.appendChild(el("p", "ov-hint", "all five at once - click a carriage to read it"));
    adv.appendChild(ctl);
    var stage = el("div", "ov");
    var scroller = el("div", "ov-scroll");
    var consist = el("div", "ov-consist");
    consist.style.height = CH + "px";

    function img(src, w) {
      var i = document.createElement("img");
      i.src = "assets/journey/" + src; i.alt = ""; i.draggable = false;
      i.style.width = w + "px"; i.style.height = CH + "px";
      return i;
    }
    consist.appendChild(img("tail.webp", Math.round(CH * 508 / 328)));
    chapters.forEach(function (t, i) {
      var car = el("button", "ov-car");
      car.style.width = CAR_W + "px"; car.style.height = CH + "px";
      car.setAttribute("aria-label", (t.period || "") + " - " + (t.role || ""));
      var sign = el("div", "ov-sign");
      sign.style.width = Math.round(CAR_W * 0.9) + "px";
      sign.appendChild(el("b", null, t.role || ""));
      sign.appendChild(el("span", null, t.period || ""));
      car.appendChild(sign);
      car.appendChild(img("carriage.webp", CAR_W));
      car.appendChild(el("span", "ov-glow"));
      car.addEventListener("click", function () { openJourneyModal(t, i); });
      consist.appendChild(car);
    });
    // engine + tender are separate pieces now; the parked view never reverses,
    // so they simply sit in their normal running order
    consist.appendChild(img("tender.webp", Math.round(CH * 256 / 328)));
    consist.appendChild(img("engine.webp", Math.round(CH * 571 / 328)));

    scroller.appendChild(consist);
    stage.appendChild(scroller);
    adv.appendChild(stage);
  }
  var jState = { visited: {}, at: 0, busy: false };

  function renderJourney(content) {
    var editing = document.body.classList.contains("editing");
    if (editing) journeyView = "timeline"; // editing always happens on the timeline

    // view switch chips
    var bar = $("#journey-view");
    bar.innerHTML = "";
    bar.style.display = editing ? "none" : "";
    if (!editing) {
      [["map", "Train ride"], ["overview", "All chapters"]].forEach(function (v) {
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
    /* The plain timeline is no longer a user-facing view - the parked
       overview replaced it. It stays RENDERED (hidden) so the copy is still in
       the DOM for search engines, and it is what edit mode edits. */
    tl.style.display = editing ? "" : "none";
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
    if (!editing && (journeyView === "map" || journeyView === "overview")) {
      adv.hidden = false;
      if (journeyView === "overview") buildOverview(content, adv);
      else buildAdventure(content, adv);
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
    var STAGE_H = narrow ? 240 : 300;
    var ROAD_Y = STAGE_H - 74;
    /* The consist is anchored by its right edge (the locomotive), so it
       extends LEFT from whatever station it is parked at. The first station
       therefore has to sit at least a whole train-length in from the start of
       the track, or the carriages hang off the left of the scene. */
    var TRAIN_H = narrow ? 42 : 58;
    /* The RIDE shows a short train - two lit carriages is enough to read as a
       train. One-carriage-per-chapter belongs to the "All chapters" overview,
       where the whole consist is the point; here it just made the train longer
       than the gap between stations. */
    var RIDE_CARS = 2;
    var CONSIST_W = Math.round(TRAIN_H * (RIDE_CARS * 524 + 827) / 328);
    var EDGE = Math.max(narrow ? 150 : 280, CONSIST_W + 34);
    var stationX = stops.map(function (t, i) { return EDGE + i * SPACING; });
    var trackW = stationX[n - 1] + EDGE;

    /* ---------- painted pieces ----------
       The railway pack is real painted art at the valley map's fidelity, so
       the stops, the rail and the roadside are <image> now rather than the
       rectangles-and-circles this used to draw. Natural sizes come from
       js/journey-art.js (generated), so choosing a display HEIGHT is enough -
       the width follows the art and stays correct if the art is rebuilt. */
    var JA = (window.JOURNEY_ART && window.JOURNEY_ART.pieces) || {};
    function art(slug, h) {
      var nat = JA[slug];
      if (!nat) {
        // Squaring off is the visible symptom of journey-art.js not having
        // loaded - which looks like a layout bug, not a missing file. Say so.
        console.warn("journey: no natural size for " + slug +
                     " - is js/journey-art.js loaded before app.js?");
        nat = [h, h];
      }
      return { href: "assets/journey/" + slug + ".webp",
               w: Math.round(nat[0] * h / nat[1]), h: h };
    }
    /* centred on cx, standing ON baseY - every piece in the pack is drawn
       resting on its own ground, so aligning feet is what makes them sit on
       the same line. */
    function piece(slug, h, cx, baseY, cls) {
      var a = art(slug, h);
      return '<image href="' + a.href + '" x="' + (cx - a.w / 2).toFixed(1) +
        '" y="' + (baseY - a.h).toFixed(1) + '" width="' + a.w + '" height="' + a.h +
        '" preserveAspectRatio="xMidYMax meet"' + (cls ? ' class="' + cls + '"' : "") + "/>";
    }

    var SIGNAL_H = narrow ? 58 : 76;    // semaphore beside each stop
    var RAIL_H = narrow ? 26 : 34;      // the tiled track band
    var RAIL_TOP = ROAD_Y - RAIL_H / 2;
    /* The axle line: the midpoint BETWEEN the two rails, measured off the art
       at build time. Everything trackside is placed against THIS rather than
       the band's top or bottom edge, so the train rides in the track the way
       the valley map's does instead of perching on it. */
    var AX = (window.JOURNEY_ART && window.JOURNEY_ART.axle) ||
             { rail: 0.5, train: { deg: 0, midY: 1 } };
    var AXLE_Y = RAIL_TOP + RAIL_H * AX.rail;

    /* The lineside, from art-source/nature. Four tree shapes on rotation, and
       clutter on a different cycle length so the two never line up into a
       visible repeat. */
    var LINESIDE = [["oak", 62], ["bush", 48], ["pine", 58], ["cypress", 56]];
    var CLUTTER = [["boulder", 20], ["logs", 22], null, ["reeds", 20], null];

    function postSVG(i, t) {
      /* The place plate that used to live here is now a painted signboard in
         HTML (see the .ja-sign pass below): SVG <text> cannot wrap, and role
         names run from "IT Intern" to "SPM - Malaysian Certificate of
         Education". The labels belong on the STATIONS rather than on the
         carriages because carriages move, and a sliding label is both hard to
         read and collides with everything it passes. */
      var hitW = 118;
      // A semaphore signal per stop: its arm is what "lit" swings down, so
      // reaching a chapter clears the line the way a real railway does.
      return '<g class="ja-post" data-mi="' + i +
        '" transform="translate(' + stationX[i] + "," + ROAD_Y + ')">' +
        piece("signal", SIGNAL_H, 0, 8, "ja-signal") +
        '<rect x="' + (-hitW / 2) + '" y="' + (-SIGNAL_H - 40) + '" width="' + hitW + '" height="' + (SIGNAL_H + 92) + '" fill="transparent" style="cursor:pointer"/></g>';
    }
    function trackSVG() {
      var a = art("rail", RAIL_H);
      // The pattern tiles from the USER SPACE origin, not from the rect - so
      // unless its y is pinned to the band, the band starts mid-tile and a
      // sliver of a second track repeats above the first.
      var s = '<svg width="' + trackW + '" height="' + STAGE_H + '" viewBox="0 0 ' + trackW + " " + STAGE_H + '">' +
        '<defs><pattern id="ja-railpat" x="0" y="' + RAIL_TOP + '" width="' + a.w + '" height="' + RAIL_H +
        '" patternUnits="userSpaceOnUse">' +
        '<image href="' + a.href + '" width="' + a.w + '" height="' + RAIL_H + '"/></pattern></defs>' +
        '<rect class="ja-railband" x="0" y="' + RAIL_TOP + '" width="' + trackW + '" height="' + RAIL_H + '" fill="url(#ja-railpat)"/>';
      // A platform where the line starts. It runs on through the right-hand
      // edge - a through line, not a terminus.
      // narrow has a smaller EDGE, so the desktop offset would push the
      // platform off the left of the frame (measured: 37px clipped at 420)
      /* The station building, not the old bare platform. It is much taller
         than it is long compared with the old piece (2.15:1 against 3.33:1),
         so it is sized to stand ABOVE the train rather than beside it - a real
         station house overtops its carriages. */
      s += piece("station", narrow ? 88 : 124, stationX[0] - (narrow ? 118 : 210), AXLE_Y, "ja-scene");
      stops.forEach(function (t, i) { s += postSVG(i, t); });
      return s + "</svg>";
    }
    function midSVG() {   // roadside trees and fencing - drift at middle speed
      var s = '<svg width="' + trackW + '" height="' + STAGE_H + '" viewBox="0 0 ' + trackW + " " + STAGE_H + '">', x, k = 0;
      var shrink = narrow ? 0.7 : 1;
      for (x = 80; x < trackW; x += 330, k++) {
        // trees stay well under the number plates: one that out-scales the
        // locomotive reads as a forest the line runs through, not the
        // roadside it is meant to be
        var t = LINESIDE[k % LINESIDE.length];
        s += piece(t[0], t[1] * shrink, x, AXLE_Y - 18, "ja-scene");
        s += piece("fence", (narrow ? 18 : 26) * 1, x + 150, AXLE_Y - 12, "ja-scene");
        var c = CLUTTER[k % CLUTTER.length];
        if (c) s += piece(c[0], c[1] * shrink, x + 245, AXLE_Y - 10, "ja-scene");
      }
      return s + "</svg>";
    }

    /* ---------- DOM ---------- */
    adv.innerHTML = "";
    // the overview reads these back so both views size the same (see buildOverview)
    adv.style.setProperty("--ja-stage-h", STAGE_H + "px");
    adv.style.setProperty("--ja-ground", (STAGE_H - ROAD_Y) + "px");
    var ctl = el("div", "ja-controls");
    /* Not .chip any more: these are ACTIONS, and .chip is the filter/toggle
       look shared with the Projects and Achievements bars. */
    var autoB = el("button", "ja-btn ja-btn-go", "let Suu walk");
    var resetB = el("button", "ja-btn ja-btn-off", "reset journey");
    var prog = el("span", "ja-progress");
    ctl.appendChild(autoB); ctl.appendChild(resetB); ctl.appendChild(prog);
    adv.appendChild(ctl);

    var stage = el("div", "ja-stage");
    stage.style.height = STAGE_H + "px";
    var mid = el("div", "ja-layer ja-mid"); mid.innerHTML = midSVG();
    var track = el("div", "ja-layer ja-track"); track.innerHTML = trackSVG();
    // Suu rides the line rather than walking it - the locomotive is the
    // traveller now, she is on the carriage roof.
    // TRAIN_H is declared up with EDGE now - the first station's offset has to
    // know the whole consist's length before the track is laid out.
    var suuEl = el("div", "ja-train");
    suuEl.style.width = CONSIST_W + "px";
    suuEl.style.height = TRAIN_H + "px";
    /* Hung from its MEASURED axle, not its bbox. The sprite is drawn on a
       slope, so its bottom edge is a corner - hanging it there puts the wheels
       wherever that corner falls. Levelling it is the same measurement read
       the other way: rotate out the baked-in slope, about the axle itself so
       the pivot does not move the train off the rail. */
    suuEl.style.top = (AXLE_Y - TRAIN_H * AX.train.midY) + "px";

    var T = AX.train, sm = AX.smoke;

    /* ---------- the consist: one carriage per chapter ----------
       The single train sprite is replaced by loco + n carriages, so the train
       itself doubles as a progress bar - a carriage lights when its station is
       reached. The consist is anchored by its RIGHT edge (see paint()), which
       puts the locomotive at the station and strings the carriages back over
       the stations already passed. */
    var CAR_W = Math.round(TRAIN_H * 524 / 328);
    /* The engine and its tender are SEPARATE pieces. They used to be one
       slice, so reversing mirrored both - and the tender's painted "XE
       RAILWAY" came out backwards. Split, the tender can move to the engine's
       other side (which is where a turned loco's tender really goes) while
       never being mirrored itself. */
    var ENG_W = Math.round(TRAIN_H * 571 / 328);
    var TEND_W = Math.round(TRAIN_H * 256 / 328);
    // scenery, not controls: the stations and their signboards are what you
    // click in the ride. Always lit, so the windows glow the whole way.
    var cars = "";
    for (var ci = 0; ci < RIDE_CARS; ci++) {
      cars += '<span class="ja-car lit" style="width:' + CAR_W +
        "px;height:" + TRAIN_H + 'px"><img src="assets/journey/carriage.webp" alt="" ' +
        'draggable="false" style="width:' + CAR_W + "px;height:" + TRAIN_H + 'px">' +
        '<span class="ja-carglow"></span></span>';
    }
    /* The old smoke/lamp anchors were measured against the WHOLE train sprite.
       They are re-based onto the locomotive slice here: the slice is source
       x1040-1867 of 1887, and the deployed art was trimmed ~6px off the top of
       328, so x maps by (x*1887-1040)/827 and y by (6+y*318)/328. */
    function locoX(v) { return (v * 1887 - 1296) / 571; }
    function locoY(v) { return (6 + v * 318) / 328; }
    var lb = "", lf = "";
    if (sm && T.funnel) {
      var smH2 = TRAIN_H * 0.72, smW2 = Math.round(smH2 * sm.w / sm.h);
      lb += '<span class="ja-smoke" style="left:' +
        (ENG_W * locoX(T.funnel[0]) - smW2 * sm.origin[0] + TRAIN_H * 0.13).toFixed(1) +
        "px;top:" + (TRAIN_H * locoY(T.funnel[1]) - smH2 * sm.origin[1]).toFixed(1) +
        "px;width:" + smW2 + "px;height:" + smH2.toFixed(1) + "px;--frames:" + sm.frames +
        ";--travel:" + (-smW2 * sm.frames) + 'px"><img src="assets/journey/smoke.webp" alt="" ' +
        'draggable="false" style="width:' + (smW2 * sm.frames) + 'px;height:100%"></span>';
    }
    if (T.lamp) {
      /* the beam the headlamp throws: a shallow wedge lying along the ground.
         BEHIND the locomotive so the boiler occludes its root. */
      var R = Math.round(TRAIN_H * 2.8), half = 13 * Math.PI / 180;
      var bh = Math.ceil(R * Math.sin(half) * 0.6 * 2) + 4;
      var bx = (R * Math.cos(half)).toFixed(1), by = (R * Math.sin(half)).toFixed(1);
      lb += '<svg class="ja-beam" width="' + R + '" height="' + bh + '" viewBox="0 ' +
        (-bh / 2) + " " + R + " " + bh + '" style="left:' +
        (locoX(T.lamp[0]) * ENG_W).toFixed(1) + "px;top:" +
        (locoY(T.lamp[1]) * TRAIN_H - bh / 2).toFixed(1) + 'px">' +
        '<defs><radialGradient id="ja-head" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="' + R + '">' +
        '<stop offset="0" stop-color="rgba(255,240,196,.5)"/>' +
        '<stop offset=".45" stop-color="rgba(255,230,172,.16)"/>' +
        '<stop offset="1" stop-color="rgba(255,222,160,0)"/></radialGradient></defs>' +
        '<g transform="scale(1,0.6)"><path d="M0 0 L' + bx + " " + (-by) +
        " A" + R + " " + R + " 0 0 1 " + bx + " " + by + ' Z" fill="url(#ja-head)"/></g></svg>';
      lf += '<span class="ja-lamp" style="left:' + (locoX(T.lamp[0]) * ENG_W).toFixed(1) +
        "px;top:" + (locoY(T.lamp[1]) * TRAIN_H).toFixed(1) + "px;width:" +
        (T.lamp[2] * ENG_W * 5).toFixed(1) + "px;height:" +
        (T.lamp[3] * TRAIN_H * 5).toFixed(1) + 'px"></span>';
    }
    suuEl.style.width = (RIDE_CARS * CAR_W + ENG_W + TEND_W) + "px";
    /* Order is [tender][engine]; .ja-train.rev flips this container to
       row-reverse, so the engine leads on the left and the tender ends up
       behind it - and only the engine is mirrored. Suu rides on the coal. */
    suuEl.innerHTML =
      '<div class="ja-cars">' + cars + "</div>" +
      '<div class="ja-power">' +
        '<div class="ja-tender" style="width:' + TEND_W + "px;height:" + TRAIN_H + 'px">' +
          '<img src="assets/journey/tender.webp" alt="" draggable="false" style="width:' +
          TEND_W + "px;height:" + TRAIN_H + 'px">' +
          '<span class="ja-rider">' + suuSpriteSVG() + "</span></div>" +
        '<div class="ja-engine" style="width:' + ENG_W + "px;height:" + TRAIN_H + 'px">' +
          lb + '<img src="assets/journey/engine.webp" alt="" draggable="false" style="width:' +
          ENG_W + "px;height:" + TRAIN_H + 'px">' + lf + "</div>" +
      "</div>";
    track.appendChild(suuEl);

    /* Station signboards, in HTML so the text can actually wrap. They live
       inside `track`, so the camera transform carries them along with the
       rails instead of leaving them behind. */
    stops.forEach(function (t, si) {
      var sg = el("div", "ja-sign");
      sg.style.left = stationX[si] + "px";
      sg.style.bottom = (STAGE_H - ROAD_Y + SIGNAL_H + 12) + "px";
      sg.appendChild(el("b", null, t.role || ""));
      sg.appendChild(el("span", null, t.period || ""));
      track.appendChild(sg);          // click is bound with the other gestures below
    });
    /* No far layer any more: it drew nothing but a flat green land fill that
       sat on top of the painted valley. The plate behind the section is the
       ground now, so the rails run straight over the real meadow. */
    stage.appendChild(mid); stage.appendChild(track);
    adv.appendChild(stage);

    var nav = el("div", "ja-nav");
    var prevB = el("button", "ja-arrow", "◄");
    prevB.title = "previous chapter";
    var dots = el("div", "ja-dots");
    var nextB = el("button", "ja-arrow", "►");
    nextB.title = "next chapter";
    nav.appendChild(prevB); nav.appendChild(dots); nav.appendChild(nextB);
    adv.appendChild(nav);


    var dotEls = stops.map(function (t, i) {
      var b = el("button", "ja-dot-btn");
      b.title = (i + 1) + ". " + (t.place ? t.place + " - " : "") + t.role;
      b.addEventListener("click", function () { stopAuto(); walkTo(i); });
      dots.appendChild(b);
      return b;
    });

    /* Distance travelled at time k, for a trapezoidal SPEED profile: pull
       away, run, brake. A quadratic ease is either accelerating or braking at
       every instant and never settles into a run, which is what made short
       hops between stops look like a lurch rather than a departure. */
    function trainEase(k) {
      var up = 0.3, down = 0.3, run = 1 - up - down;
      var area = up / 2 + run + down / 2;          // so trainEase(1) === 1
      if (k < up) return (k * k / (2 * up)) / area;
      if (k < up + run) return (up / 2 + (k - up)) / area;
      var t = k - up - run;
      return (up / 2 + run + t - t * t / (2 * down)) / area;
    }

    /* ---------- camera + walking ---------- */
    var curX = stationX[jState.at], facing = 1, raf = null, stageW = 900;
    function measure() { stageW = stage.clientWidth || 900; }
    function paint(hop) {
      /* The anchor is folded into `left` rather than a percentage transform.
         A translate(-100%) that had to flip to translate(0) on reverse simply
         would not budge - not from the .rev rule, not from an inline style,
         not even from inline !important - and the turned engine stayed parked
         a whole train-length off screen. `left` is plain layout and always
         obeys. Running right the engine is the right-hand vehicle so the
         consist hangs back to the left; turned, it leads and trails right. */
      suuEl.style.left = (facing < 0 ? curX : curX - CONSIST_W) + "px";
      /* No bob. This carried Suu's walking bounce, oscillating several times a
         second, which on a locomotive reads as the train hopping along the
         rail instead of rolling down it.
         Anchored by whichever end the ENGINE is on, so the engine always stops
         at the platform and stays in shot. Running right the engine is the
         right-hand vehicle, so the consist hangs back to the left; once turned
         it leads on the left, so the consist trails off to the right instead.
         Anchoring by the right edge in both cases put the turned engine a
         whole train-length left of the station, outside the camera entirely -
         measured at x=-32, i.e. off screen. */
      /* The anchor is NOT set here. It is driven by the .rev class in CSS, so
         there is exactly one source of truth for which end the engine is on -
         setting it per-frame here raced the class and left the turned engine
         parked a whole train-length off screen. paint() only owns `left`. */
      var cam = Math.max(0, Math.min(Math.max(0, trackW - stageW), curX - stageW * 0.3));
      track.style.transform = "translateX(" + (-cam).toFixed(1) + "px)";
      mid.style.transform = "translateX(" + (-cam * 0.55).toFixed(1) + "px)";
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
      var sgn = track.querySelectorAll(".ja-sign")[mi];
      if (sgn) sgn.classList.add("lit");
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
    function closeChapter() { closeJourneyModal(); }
    function showCard(mi) { openJourneyModal(stops[mi], mi); }

    function walkTo(target, done) {
      target = Math.max(0, Math.min(n - 1, target));
      if (jState.busy) return;
      /* Arriving no longer OPENS the chapter. The card used to sit below and
         could appear on every arrival harmlessly; a modal cannot - under "let
         Suu walk" it would slam open every six seconds on top of the train.
         Travelling now only lights things up, and reading is opt-in: callers
         that represent an explicit request (clicking a carriage, a signboard
         or a station) pass a `done` that opens it. */
      if (target === jState.at) { visit(target); syncUI(); if (done) done(); return; }
      jState.busy = true;
      closeChapter();                              // the chapter closes as she leaves
      var from = stationX[jState.at], to = stationX[target];
      function land() {
        jState.at = target; curX = to; paint(0);
        visit(target); syncUI();
        jState.busy = false;
        if (done) done();
      }
      if (reduced) {
        facing = target > jState.at ? 1 : -1;
        suuEl.classList.toggle("rev", facing < 0);
        var lo = Math.min(target, jState.at), hi = Math.max(target, jState.at);
        for (var k = lo; k <= hi; k++) visit(k);
        land();
        return;
      }

      /* ---------- departure procedure ----------
         A train does not simply start. The signal at the platform it is
         standing at clears first, and if it is about to run the other way the
         engine has to be turned before it can lead. Only the LOCOMOTIVE
         pivots: mirroring the whole consist would reverse the carriages on
         screen and carriage 3 would stop being chapter 3. */
      var turning = (target < jState.at) !== (facing < 0);
      facing = target > jState.at ? 1 : -1;
      var leaving = track.querySelector('.ja-post[data-mi="' + jState.at + '"]');
      /* THE DEPARTURE, in the order a real one happens:
           0ms    the consist swings edge-on, pivoting on the signpost (the
                  transform-origin is the engine's leading edge, which sits
                  exactly on stationX - the same point the signboard and the
                  semaphore are drawn at)
           250ms  order and engine mirror swap, hidden at the midpoint
           520ms  turn complete - the train is STOPPED, facing the new way
           660ms  only now does the signal clear: permission to proceed
           1020ms it pulls away
         The whole consist turns as ONE piece. Easing the engine separately is
         what used to make the head twist before the tail followed. */
      if (turning) {
        suuEl.classList.add("turning");
        setTimeout(function () { suuEl.classList.toggle("rev", facing < 0); }, 250);
        setTimeout(function () { if (leaving) leaving.classList.add("clearing"); }, 660);
      } else {
        suuEl.classList.toggle("rev", facing < 0);
        if (leaving) leaving.classList.add("clearing");
      }
      // a turn buys a real stand at the platform; a straight run just a beat
      setTimeout(function () { depart(); }, turning ? 1020 : 320);

      function depart() {
      if (leaving) leaving.classList.remove("clearing");
      suuEl.classList.remove("turning");
      var dur = Math.max(1100, Math.min(3600, Math.abs(to - from) / 0.34));
      var t0 = performance.now();
      if (raf) cancelAnimationFrame(raf);
      suuEl.classList.add("moving");     // steam works harder under way
      (function step(now) {
        var k = Math.min(1, (now - t0) / dur);
        curX = from + (to - from) * trainEase(k);
        stationX.forEach(function (sx, si) {        // stations passed light up
          if (sx >= Math.min(from, curX) - 2 && sx <= Math.max(from, curX) + 2) visit(si);
        });
        paint(0);
        if (k < 1) { raf = requestAnimationFrame(step); return; }
        suuEl.classList.remove("moving");
        land();
      })(t0);
      }
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
      if (jState.at >= n - 1) { jState.at = 0; curX = stationX[0]; paint(0); syncUI(); }
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
    /* Explicit "show me this chapter" gestures: the station, its signboard and
       its carriage. All three drive the train there first, THEN pop the card -
       so the reading is always anchored to where the train actually is. */
    function goRead(mi) {
      stopAuto();
      walkTo(mi, function () { showCard(mi); });
    }
    $all(".ja-post", track).forEach(function (g) {
      g.addEventListener("click", function () { goRead(parseInt(g.getAttribute("data-mi"), 10)); });
    });
    $all(".ja-sign", track).forEach(function (s, si) {
      s.addEventListener("click", function () { goRead(si); });
    });

    /* ---------- boot ---------- */
    measure();
    Object.keys(jState.visited).forEach(function (k) {
      var p = track.querySelector('.ja-post[data-mi="' + k + '"]');
      if (p) p.classList.add("lit");
    });
    paint(0);
    visit(jState.at);
    syncUI();          // NO showCard here - the page must not load with a modal open
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
  /* ---------- registering the scene to the PAINTING ----------
     `#achievements::before` draws hall-dusk.webp with `cover` over the section,
     so the crop moves with the viewport - measured scale .56 to .84 and an x
     offset from 0 to -271px across 420-1440. The hall SVG used to be a fixed
     736px box with its own 900x470 coordinates, which means a prop stood on the
     painted grass at exactly ONE window size and floated or sank at every
     other. So the SVG now takes its viewBox FROM the plate's cover mapping:
     one user unit is one pixel of hall-dusk.webp, and every prop is placed at
     the coordinate read straight off blueprint/achievement blueprint.png. */
  var HALL_IW = 1718, HALL_IH = 916;      // hall-dusk.webp natural size
  /* Painted station entrance. Percentage geometry shares the image's2:1 frame. */
  function buildHall(hall, content) {
    hall.className = "ach-hall hall-painted hall-approved seen";
    hall._busy = false;
    hall.removeAttribute("role");hall.removeAttribute("tabindex");hall.removeAttribute("aria-label");
    hall.onclick = null;hall.onkeydown = null;
    hall.innerHTML = '<button type="button" class="hall-painted-door hall-hit" aria-label="Open the Hall of Achievements"><span class="hall-door-l" aria-hidden="true"></span><span class="hall-door-r" aria-hidden="true"></span></button>' +
      '<button type="button" class="hall-enter">Enter the hall <span aria-hidden="true">→</span></button>' +
      '<button type="button" class="hall-suu" aria-label="Let Suu open the hall"></button>' +
      '<p class="hall-painted-caption">Follow the warm light. Click the doors or enter the hall.</p>';
    if (window.PORTFOLIO_HALL_DOOR) window.PORTFOLIO_HALL_DOOR.mount(hall);
    hall._suuWalk = {x:75.3,y0:23,y1:23};
    var suu = hall.querySelector(".hall-suu");
    suu.style.left = "75.3%";suu.style.bottom = "23%";suu.style.width = "3%";
    hall.querySelectorAll("button").forEach(function(button){
      button.addEventListener("click",function(){openHall(hall,content,button);});
    });
  }

  function openHall(hall, content, opener) {
    if (hall._busy) return;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var entryHash = location.hash;
    function finish(fromDoor) {
      hall._busy = false;
      if (!hall.isConnected || location.hash !== entryHash || document.body.classList.contains("editing") || document.body.classList.contains("presenting")) {
        if (window.PORTFOLIO_HALL_DOOR) window.PORTFOLIO_HALL_DOOR.cancel(hall, false);
        else hall.classList.remove("opening");
        return;
      }
      // Desktop walks through the door into a full-screen room; everywhere
      // else the doors still open the rail in place.
      if (roomAvailable()) { openHallRoom(content, fromDoor); return; }
      hallOpen = true;
      hallBurst = true;
      renderAchievements(content);
      if (fromDoor) {
        var rail = $("#ach-rail");
        rail.classList.remove("hall-rail-reveal");
        void rail.offsetWidth;
        rail.classList.add("hall-rail-reveal");
      }
      if (window.PORTFOLIO_MOTION) window.PORTFOLIO_MOTION.rewire();
    }
    if (window.PORTFOLIO_HALL_DOOR) {
      window.PORTFOLIO_HALL_DOOR.start(hall, function () { finish(true); }, opener);
      return;
    }
    if (reduced) { finish(); return; }
    hall._busy = true;
    hall.classList.add("opening");
    setTimeout(finish, 650);
  }

  /* ---------- the room behind the doors ----------
     Opening the doors used to hide the facade and render the projects-grid
     cards on the outdoor valley sky - you walked through a door and ended up
     outdoors. This is the place the doors always promised: the ivy wall, vine
     shelves, and a framed certificate per category.

     Every offset below is a fraction of the WALL, derived from the natural
     sizes in ACHIEVEMENT_ART, so re-cropping the art re-fits the room instead
     of starting another round of hand-tuned pixels. */

  // category -> the frame its certificate hangs in (assets/hall/frame-*.webp).
  // "sports" carries no records today; it falls back to gold rather than 404.
  var ACH_FRAME = {
    academic: "gold", certification: "star",
    cocurricular: "wood", volunteering: "cream", sports: "gold"
  };
  /* Layout defaults, in three layers: the builder's MEASURED values (in
     ACHIEVEMENT_ART), these defaults, and then any overrides the scene editor
     saved into js/scene-layout.js. Named rather than inline so the editor can
     write to them - see docs/superpowers/specs/2026-08-05-scene-editor-design.md

     Note what is NOT here: seating. A certificate's height above its plank is
     always recomputed from the measured plank line, never stored, so no
     override can put one back in mid-air. */
  var HALL_DEFAULTS = {
    // Shelves start where the measured clear plaster does (x0 0.2893) - far
    // enough right to leave the window, the lantern, the sideboard AND the XE
    // Studio banner uncovered. An earlier x0 of 0.18 draped the first shelf
    // straight across the banner.
    "shelf.x0": 0.30,
    // the rack stops short of the right, where the filter column hangs: the
    // column's left edge is tags.x - tags.w/2 = 0.8175, so this leaves a gap
    "shelf.x1": 0.79,
    "shelf.edgeClear": 0.015,   // never flush against a cropped edge
    "shelf.footClear": 0.02,    // floorboard showing below the lowest shelf
    "shelf.perShelf": 4,
    "cert.height": 0.18,        // fraction of wall height
    "cert.inset": 0.08,         // kept off the shelf's end brackets
    // How far a certificate's foot tucks into the board's painted face, as a
    // fraction of the board's thickness. Seated exactly on the top edge it
    // reads as hovering; sunk a little, it stands on the shelf.
    "cert.sink": 0.22,
    "title.bandMin": 150, "title.bandVh": 0.185, "title.bandMax": 200,
    "title.signH": 0.62, "title.signW": 0.52,
    // the filter column: five hanging signs down the right-hand wall
    "tags.x": 0.865, "tags.y": 0.13, "tags.w": 0.078, "tags.gap": 0.014,
    // the page control hugs the right-hand wall; the default margin is derived
    // from the filter column above it, so the two share one right edge
    "pager.h": 0.075, "pager.right": 0.096,
    "suu.left": 0.075, "suu.bottom": 0.03, "suu.width": 0.054
  };
  /* Bounds the editor clamps to. An override outside these lands at the bound
     rather than off the visible wall. */
  var HALL_BOUNDS = {
    "shelf.x0": [0.05, 0.60], "shelf.x1": [0.40, 0.995],
    "shelf.edgeClear": [0, 0.10], "shelf.footClear": [0, 0.20],
    "shelf.perShelf": [1, 8],
    "cert.height": [0.04, 0.30], "cert.inset": [0, 0.30], "cert.sink": [0, 1],
    "title.bandMin": [60, 400], "title.bandVh": [0.05, 0.45], "title.bandMax": [80, 500],
    "title.signH": [0.2, 1], "title.signW": [0.1, 0.95],
    "tags.x": [0.05, 0.98], "tags.y": [0, 0.8],
    "tags.w": [0.03, 0.30], "tags.gap": [0, 0.10],
    "pager.h": [0.03, 0.20], "pager.y": [0.02, 0.97], "pager.right": [0.005, 0.40],
    // absolute wall fractions; defaults are computed from the rack
    "title.signY": [0, 0.96], "title.x": [0.02, 0.98],
    "suu.left": [0, 0.95], "suu.bottom": [0, 0.9], "suu.width": [0.01, 0.30]
  };
  var HALL_SHELF_Y = "shelf.y.";     // per-shelf overrides: shelf.y.0, shelf.y.1 ...
  var RACKS_PER_PAGE = 3;
  var hallPage = 0;                  // derived view state, never saved

  /* An override if there is a valid one, otherwise the given default - clamped
     either way. Used for the per-shelf and per-certificate keys, which have no
     entry in HALL_DEFAULTS because their default is computed. */
  function ovNum(key, fallback, lo, hi) {
    var o = window.SCENE_LAYOUT && window.SCENE_LAYOUT.hall;
    var v = o ? o[key] : undefined;
    if (typeof v !== "number" || !isFinite(v)) return fallback;
    if (typeof lo === "number") v = Math.max(lo, v);
    if (typeof hi === "number") v = Math.min(hi, v);
    return v;
  }

  function hallVal(key) {
    var o = window.SCENE_LAYOUT && window.SCENE_LAYOUT.hall;
    var v = o ? o[key] : undefined;
    if (typeof v !== "number" || !isFinite(v)) return HALL_DEFAULTS[key];
    var b = HALL_BOUNDS[key];
    return b ? Math.min(b[1], Math.max(b[0], v)) : v;
  }

  /* The room fills the screen the way `background-size: cover` would, but
     ANCHORED TO THE FLOOR rather than centred.

     The wall is 1.499 and laptop viewports run 1.89-2.02, so cover crops
     21-26% of the painting. Cropping that centred puts the measured floor line
     (0.9268) BELOW the viewport at every common size - 1035 of 980, 816 of 760,
     789 of 760 - which deletes the floor, the sideboard and Suu and keeps the
     ceiling beam. Anchoring to the floor crops the beam instead, which is the
     right half to lose. (It also means the title cannot live on the beam.)

     The formula covers both directions without branching: a viewport wider
     than the wall crops height, a narrower one crops width. */
  function fitWall(A, vw, vh) {
    var W = A.pieces.wall[0], H = A.pieces.wall[1];
    var s = Math.max(vw / W, vh / H);
    var rw = W * s, rh = H * s;
    var ox = (vw - rw) / 2, oy = vh - rh;
    return {
      rw: rw, rh: rh, ox: ox, oy: oy,
      // where a point of the PAINTING lands in the visible room, 0..1
      toX: function (px) { return (px * rw + ox) / vw; },
      toY: function (py) { return (py * rh + oy) / vh; }
    };
  }

  /* Paint a chrome piece as a 9-slice. The insets are measured by the builder;
     the border width is those insets scaled to the rendered height, so a board
     keeps its proportions at any size. */
  function nineSlice(node, slug, renderedH) {
    var A = window.ACHIEVEMENT_ART;
    var nat = A.pieces[slug], ins = A.slice[slug];
    if (!nat || !ins) return;
    var k = renderedH / nat[1];
    node.style.borderStyle = "solid";
    node.style.borderColor = "transparent";
    node.style.borderWidth = ins.map(function (v) {
      return Math.max(1, Math.round(v * k)) + "px";
    }).join(" ");
    node.style.borderImageSource = "url(assets/hall/" + slug + ".webp)";
    node.style.borderImageSlice = ins.join(" ") + " fill";
    node.style.borderImageRepeat = "stretch";
  }

  function roomArt() {
    var A = window.ACHIEVEMENT_ART;
    if (!A || !A.pieces || !A.pieces.wall) {
      console.warn("hall: js/achievement-art.js did not load before app.js - " +
                   "the room cannot be laid out, falling back to the rail");
      return null;
    }
    return A;
  }

  /* Eras with nothing stay unfurnished, and a long era wraps onto a second
     shelf. Measured against the content: University 7, Foundation 3,
     Secondary 2, Work 0, Primary 0 - so a literal shelf-per-era would give two
     empty shelves and one overflowing one. */
  function shelfRows(list) {
    var rows = [];
    var per = Math.max(1, Math.round(hallVal("shelf.perShelf")));
    ACH_ERA_ORDER.forEach(function (eraKey) {
      var items = [];
      list.forEach(function (a, i) { if (a.era === eraKey) items.push({ a: a, i: i }); });
      for (var n = 0; n < items.length; n += per) {
        rows.push({ era: eraKey, items: items.slice(n, n + per), cont: n > 0 });
      }
    });
    return rows;
  }

  function buildRoom(room, content, filter) {
    var A = roomArt();
    if (!A) return false;
    var list = content.achievements || [], eras = content.achievementEras || {};
    var allRows = shelfRows(list);
    if (!allRows.length) return false;
    /* Three rack slots per page, ALWAYS three - unused ones render as bare
       shelves so the hall reads as having room to grow and every page is the
       same height. Era order already runs newest-first, so a new achievement
       lands on the top rack and cascades down and across on its own. */
    var pageCount = Math.max(1, Math.ceil(allRows.length / RACKS_PER_PAGE));
    if (hallPage >= pageCount) hallPage = pageCount - 1;   // clamp, never strand
    if (hallPage < 0) hallPage = 0;
    var rows = allRows.slice(hallPage * RACKS_PER_PAGE,
                             hallPage * RACKS_PER_PAGE + RACKS_PER_PAGE);
    while (rows.length < RACKS_PER_PAGE) rows.push(null);   // reserved slot

    var shelfAspect = A.pieces.shelf[0] / A.pieces.shelf[1];

    /* The room fills its container, so the usable band is no longer a constant
       - it depends on how much of the painting the viewport crops away. */
    var vw = room.clientWidth, vh = room.clientHeight;
    // Inserted this tick, so layout is not real yet - fitWall would divide by a
    // zero-sized wall and write NaN into every offset. The deferred build that
    // openHallRoom schedules does the real one.
    if (!vw || !vh) return false;
    /* fitWall now only says where the PAINTING's features land; the room box is
       the viewport itself, so every fraction below is a fraction of what you can
       see. Measured against the old model: the same layout put the plates 0.023
       clear of the top certificates at aspect 1.78 and 0.070 ON TOP of them at
       2.00, because layout was wall-relative while the chrome was
       visible-relative. Now both are the same thing. */
    var fit = fitWall(A, vw, vh);
    /* Fractions are viewport-relative now, so turning a height fraction into a
       width fraction takes the VIEWPORT's aspect. Leaving the painting's 1.499
       here stretched every certificate wide, which grew its cqw-sized type
       until the titles overflowed - the check caught it, a screenshot would
       not have. */
    var viewAspect = vw / vh;
    /* The board's own moulding eats half its height - the measured 9-slice
       insets are 74 top and 52 bottom of 252 - so a band sized only by "looks
       about right" leaves a content box too short for the title, and it spills
       up over its own carved crown. Floored at 150px for that reason. */
    var edge = hallVal("shelf.edgeClear");
    var titleBand = Math.min(hallVal("title.bandMax"),
                    Math.max(hallVal("title.bandMin"), hallVal("title.bandVh") * vh));
    // the painting's own landmarks, mapped into the visible room
    var floorV = fit.toY(A.floor || 0.93);
    var furnitureV = fit.toX((A.plaster && A.plaster.x0) || 0.29);
    var band = {
      x0: Math.max(hallVal("shelf.x0"), furnitureV + edge, edge),
      x1: Math.min(hallVal("shelf.x1"), 1 - edge),
      y0: titleBand / vh,
      y1: floorV - hallVal("shelf.footClear")
    };
    var span = band.x1 - band.x0;
    // the shelf's own height, expressed against the WALL's height so the plank
    // can be placed without measuring the DOM
    var shelfH = span * viewAspect / shelfAspect;
    var pitch = (band.y1 - band.y0) / rows.length;
    /* The board hangs BELOW its own standing line, so a shelf needs room for a
       certificate plus the thickness of the board above it. Get this wrong and
       the overlap is silent - the first build hid the top of every row behind
       the beam above. */
    var boardH = shelfH * (A.shelf.board || 0);
    if (hallVal("cert.height") + boardH > pitch) {
      console.warn("hall: " + rows.length + " shelves leave " +
                   pitch.toFixed(3) + " of wall height each, but a certificate " +
                   "plus the board above it needs " +
                   (hallVal("cert.height") + boardH).toFixed(3) +
                   " - rows will overlap");
    }

    // Filtering rebuilds the room. If a certificate was open, its Esc handler
    // is on the document and would outlive the panel it closes - one orphaned
    // listener per filter click.
    if (room._closeCert) room._closeCert();
    room.innerHTML = "";
    // the painting, sized and positioned by the fit; every child below keeps
    // its percentage layout, so only this box changes when the viewport does
    // the painting is drawn by CSS (cover, anchored to the floor); this box is
    // the visible room, so children lay out against what you actually see
    var wall = el("div", "ach-wall");

    /* ONE size for every certificate in the hall.
       The slot cap is per-shelf, so a rack of two used to get visibly bigger
       frames than a rack of four and the wall looked ragged. Take the tightest
       slot across ALL racks - every page, not just this one - and let it set a
       single height. The widest frame aspect is used so the cap holds whichever
       category lands in that slot. */
    var certInset = hallVal("cert.inset");
    var clearFrac = 1 - certInset * 2;
    var maxAspect = 0;
    Object.keys(ACH_FRAME).forEach(function (k) {
      var n = A.pieces["frame-" + ACH_FRAME[k]];
      if (n) maxAspect = Math.max(maxAspect, n[0] / n[1]);
    });
    var meanAspect = 0, nAspect = 0;
    Object.keys(ACH_FRAME).forEach(function (k) {
      var n = A.pieces["frame-" + ACH_FRAME[k]];
      if (n) { meanAspect += n[0] / n[1]; nAspect++; }
    });
    meanAspect = nAspect ? meanAspect / nAspect : 1.45;
    var uniformH = hallVal("cert.height");
    allRows.forEach(function (r, i) {
      var x0 = ovNum("shelf.x0." + i, band.x0, 0.01, 0.97);
      var x1 = ovNum("shelf.x1." + i, band.x1, 0.03, 0.999);
      if (x1 - x0 < 0.08) x1 = x0 + 0.08;
      var slotW = (x1 - x0) * clearFrac / Math.max(1, r.items.length);
      var h = slotW * 0.94 * viewAspect / maxAspect;
      if (h < uniformH) uniformH = h;
    });

    var burst = 0;
    // the rack's real extent, accumulated as the shelves are laid out
    var rackX0 = 1, rackX1 = 0, rackTop = 1;
    rows.forEach(function (row, ri) {
      /* Per-shelf overrides. Each shelf carries its own y, left and right, so
         one can be moved or resized without disturbing the others - the even
         pitch and the shared span are only the DEFAULTS. */
      var plankY = ovNum(HALL_SHELF_Y + ri, band.y0 + pitch * (ri + 1), band.y0, band.y1);
      var sx0 = ovNum("shelf.x0." + ri, band.x0, 0.01, 0.97);
      var sx1 = ovNum("shelf.x1." + ri, band.x1, 0.03, 0.999);
      if (sx1 - sx0 < 0.08) sx1 = sx0 + 0.08;      // never collapse to nothing
      var sspan = sx1 - sx0;
      if (sx0 < rackX0) rackX0 = sx0;
      if (sx1 > rackX1) rackX1 = sx1;
      /* A narrower shelf is a shorter shelf, because the art is 4:1 - but that
         only sets the NATURAL height. shelf.sy.N squeezes it thinner or
         thicker on top of that, and because `top` is derived from the plank
         line, the certificates stay seated while it happens. */
      var syScale = ovNum("shelf.sy." + ri, 1, 0.3, 3);
      var sShelfH = sspan * viewAspect / shelfAspect * syScale;
      var shelf = el("div", "ach-shelf");
      shelf.style.left = (sx0 * 100) + "%";
      shelf.style.width = (sspan * 100) + "%";
      shelf.style.height = (sShelfH * 100) + "%";
      shelf.style.top = ((plankY - sShelfH * A.shelf.plank) * 100) + "%";
      var plank = document.createElement("img");
      plank.src = "assets/hall/shelf.webp";
      plank.alt = "";
      plank.className = "ach-plank";
      shelf.appendChild(plank);

      if (!row) { wall.appendChild(shelf); return; }   // reserved: bare shelf
      var meta = eras[row.era] || { label: row.era, caption: "" };
      var plate = el("span", "ach-plate" + (row.cont ? " cont" : ""),
                     row.cont ? meta.label + " (cont.)" : meta.label);
      plate.title = meta.caption || "";
      // centred on the board's painted face, so it reads as fixed TO the beam -
      // and inset past the end bracket, where an earlier build put it on foliage
      plate.style.bottom = ((1 - (A.shelf.plank + (A.shelf.board || 0) / 2)) * 100) + "%";
      shelf.appendChild(plate);

      // certificates stand ON the measured plank line, inset off the brackets
      var slots = row.items.length;
      var inset = hallVal("cert.inset");
      var clear = 1 - inset * 2;
      row.items.forEach(function (it, ci) {
        var a = it.a;
        var slug = ACH_FRAME[a.category] || "gold";
        var nat = A.pieces["frame-" + slug];
        /* Per-certificate overrides, keyed by the achievement's own index so
           they survive re-ordering: cert.x.<i> slides one along its shelf,
           cert.h.<i> sizes one on its own. Both default to the shared rule. */
        var certH = ovNum("cert.h." + it.i, uniformH, 0.03, 0.32);
        // cert.w.<i> squeezes one certificate horizontally against its natural
        // frame aspect, so both axes are independently adjustable
        var cwScale = ovNum("cert.w." + it.i, 1, 0.35, 2.5);
        /* One WIDTH too, not just one height. The four frames carry four
           different aspects (1.410 to 1.531), so matching only the height still
           left a ragged row. They share the MEAN aspect instead, which stretches
           the narrowest by ~4% and squeezes the widest by ~4% - under a tenth of
           a frame's own moulding, and invisible next to the raggedness it
           removes. A certificate sized by hand keeps its own shape. */
        var handW = typeof ((window.SCENE_LAYOUT || {}).hall || {})["cert.w." + it.i] === "number";
        var aspect = handW ? (nat[0] / nat[1]) : meanAspect;
        var certW = certH * aspect / viewAspect * cwScale;
        /* A certificate may never be wider than its slot. cert.height sets the
           HEIGHT, and the width follows the frame's aspect - at 0.18 that made
           205px frames in 185px slots and the top row overlapped. Capping the
           width and deriving the height back keeps them apart without anyone
           having to hand-tune the two against each other. */
        /* No per-shelf cap any more: uniformH already respects the tightest
           slot in the hall, so re-capping here would shrink the roomier racks
           back to different sizes - exactly the raggedness this removes. A
           certificate sized by hand in the editor still wins, as with
           title.signH. */
        var cx = ovNum("cert.x." + it.i, inset + clear * ((ci + 0.5) / slots), 0.01, 0.99);

        var cert = el("button", "ach-cert");
        cert.type = "button";
        cert.setAttribute("data-ai", it.i);
        cert.setAttribute("data-shelf", ri);
        cert.style.width = (certW / sspan * 100) + "%";
        // explicit height, as a fraction of THIS shelf's box, so width and
        // height are independent; aspect-ratio would have re-linked them
        cert.style.height = (certH / sShelfH * 100) + "%";
        cert.style.left = (cx * 100) + "%";
        // the highest certificate: the chrome above must clear it
        var certTop = plankY + (A.shelf.board || 0) * sShelfH * hallVal("cert.sink") - certH;
        if (certTop < rackTop) rackTop = certTop;
        // Feet on the board's top edge, sunk a little into its painted face.
        // Both numbers are measured; only the sink fraction is a choice.
        cert.style.bottom =
          ((1 - (A.shelf.plank + (A.shelf.board || 0) * hallVal("cert.sink"))) * 100) + "%";
        cert.style.backgroundImage = "url(assets/hall/frame-" + slug + ".webp)";
        /* Only on the way in. The delay used to be set on every build, so a
           filter click or a resize re-ran the whole twelve-certificate
           entrance - and anything measuring mid-flight saw them up to 14px
           adrift of their plank line, because certIn animates translateY. */
        if (hallBurst) {
          cert.classList.add("burst");
          cert.style.animationDelay = (0.1 + (burst++) * 0.08).toFixed(2) + "s";
        }
        if (filter !== "all" && a.category !== filter) cert.classList.add("dim");

        // the text block lands inside the MEASURED opening, never padded by eye
        var op = A.opening[slug];
        var inner = el("span", "ach-cert-in");
        inner.style.left = (op[0] * 100) + "%";
        inner.style.top = (op[1] * 100) + "%";
        inner.style.width = ((op[2] - op[0]) * 100) + "%";
        inner.style.height = ((op[3] - op[1]) * 100) + "%";
        /* A long title in a small opening either overflows or gets clipped, so
           the type shrinks as the title grows. The bands come from the actual
           content, not round numbers: titles cluster at 13-30 characters and
           then jump straight to 43 and 47, so the last band is deliberately
           much smaller. Past that the CSS clamps with an ellipsis and the
           panel carries the whole thing. Tightened once the scene editor made
           cert.height tunable: the bands were set at the old default size, and
           a smaller certificate clipped "AI in Application Design". */
        var n = (a.title || "").length;
        inner.style.setProperty(
          "--fs", n <= 17 ? ".94" : n <= 25 ? ".76" : n <= 32 ? ".70" : ".58");
        inner.appendChild(el("span", "ach-cert-title", a.title));
        if (a.year) inner.appendChild(el("span", "ach-cert-year", a.year));
        cert.appendChild(inner);

        var label = a.title + (a.org ? ", " + a.org : "") + (a.year ? ", " + a.year : "");
        cert.setAttribute("aria-label", label);
        cert.addEventListener("click", function () { openCert(room, content, it.i, cert); });
        shelf.appendChild(cert);
      });
      wall.appendChild(shelf);
    });

    /* The heading and the filters live INSIDE the room. They used to sit above
       it on the outdoor valley sky - grey text over drifting clouds, at the
       point in the page where the sky has already gone to dusk - announcing a
       room you could not yet see. */
    var visTop = 0;
    /* Centred on the RACK, not on the default band. Moving or resizing the
       shelves used to leave the heading board and the plates behind, because
       they were centred on band.x0/x1 - which the per-shelf overrides no
       longer describe. title.x moves the board off-centre by hand; the filter
       column has its own tags.x and does not follow the rack. */
    if (rackX1 <= rackX0) { rackX0 = band.x0; rackX1 = band.x1; }
    if (rackTop > 0.99) rackTop = band.y0;
    var rackSpan = rackX1 - rackX0;
    var rackMid = (rackX0 + rackX1) / 2;
    var midX = ovNum("title.x", rackMid, 0.02, 0.98);

    /* The measured insets are 74 top + 52 bottom of 252, so the moulding eats
       almost exactly HALF the board's height and the writable plank is only
       signH/2. Sized at 0.62 it came to a 50px plank holding 52px of text at
       1600x860 - which 1280x900 could not catch, because that aspect crops
       width instead of height. */
    /* Stacked upward from the rack: plates just above the highest certificate,
       board just above the plates. Anchoring them to a fraction of the title
       band left them sitting ON the top shelf as soon as a shelf was dragged,
       because the band stopped describing where the shelves are. */
    var signH = titleBand * hallVal("title.signH");

    var minY = 0.008;
    var GAP = 0.012;
    /* Fit the stack to the room ABOVE the rack. Drag the top shelf up and the
       space shrinks; without this the board simply overlapped the plates and
       then the certificates. Shrinking both keeps the order intact, and the
       type is sized from the board (below) so it shrinks with it rather than
       spilling over its own moulding. */
    var hall = (window.SCENE_LAYOUT && window.SCENE_LAYOUT.hall) || {};
    var signHSet = typeof hall["title.signH"] === "number";
    var avail = Math.max(0.04, rackTop - minY - GAP);
    var needed = signH / vh + GAP;
    /* Auto-fit only governs the DEFAULT. Once a size is set by hand it is
       honoured, and a tall certificate is allowed to overlap up into the
       chrome rather than shrinking the board it collides with. */
    if (!signHSet && needed > avail) {
      signH *= avail / needed;
    }
    var signY = ovNum("title.signY", minY, 0, 0.96);


    var sign = el("div", "hall-sign");
    sign.style.width = (Math.min(hallVal("title.signW"), rackSpan * 0.95) * 100) + "%";
    sign.style.height = signH + "px";
    sign.style.left = (midX * 100) + "%";
    sign.style.top = (signY * vh) + "px";
    nineSlice(sign, "sign", signH);
    // the writable plank is signH/2 (measured insets 74+52 of 252), so the type
    // is a fraction of the BOARD - viewport-sized type overflowed a shrunk one
    /* The heading sits in the sign's MEASURED panel - x .058-.940, y .320-.820
       of the board, because 03_Sign_Crest_Diamond gives its top third to the
       crest. Sizing the type off the whole board would run it under the crest. */
    var sp = (A.panel && A.panel.sign) || [0.06, 0.32, 0.94, 0.82];
    var inner = el("span", "hall-sign-in");
    inner.style.left = (sp[0] * 100) + "%";
    inner.style.top = (sp[1] * 100) + "%";
    inner.style.width = ((sp[2] - sp[0]) * 100) + "%";
    inner.style.height = ((sp[3] - sp[1]) * 100) + "%";
    sign.style.setProperty("--sign-fs",
      (signH * (sp[3] - sp[1]) * 0.62).toFixed(2) + "px");
    var sec = (content.sections && content.sections.achievements) || {};
    inner.appendChild(el("span", "hall-sign-title", sec.heading || "Hall of Achievements"));
    sign.appendChild(inner);
    wall.appendChild(sign);

    /* Five hanging signs down the right-hand wall, each on its own rope and
       bar, one design throughout - the active one is marked by warmth, not by a
       different asset, so the column reads as a matched set. They hang over the
       painted ivy (plaster stops at x 0.81), which is why the rack stops at
       0.75. */
    var tagNat = A.pieces.tag || [360, 215];
    var tagAspect = tagNat[0] / tagNat[1];
    var tagW = hallVal("tags.w");
    var tagH = tagW * viewAspect / tagAspect;          // fraction of viewport height
    var tagGap = hallVal("tags.gap");
    var tags = el("div", "hall-tags");
    /* Centred down the wall by DEFAULT, computed from the column's real height
       rather than pinned, so it stays centred when the signs are resized or a
       filter appears. tags.y still overrides it by hand. */
    var tagCount = 1 + Object.keys(ACH_CATEGORIES).filter(function (k) {
      return list.some(function (a) { return a.category === k; });
    }).length;
    var colH = tagCount * tagH + (tagCount - 1) * tagGap;
    tags.style.left = (hallVal("tags.x") * 100) + "%";
    tags.style.top = (ovNum("tags.y", Math.max(0.01, (1 - colH) / 2), 0, 0.9) * 100) + "%";
    tags.style.width = (tagW * 100) + "%";
    /* px, not a percentage: row-gap percentages resolve against the container's
       own height, and .hall-tags is content-sized, so the gap silently
       collapsed to zero - the signs touched and the centring was off by 34px. */
    tags.style.gap = (tagGap * vh).toFixed(1) + "px";
    /* Type sized off the SIGN, not the viewport. At 0.62vw it came out 8px on a
       1280 room, which is what "too small" was. */
    tags.style.setProperty("--tag-fs", (tagH * vh * 0.17).toFixed(2) + "px");
    var tp = (A.panel && A.panel.tag) || [0.15, 0.20, 0.84, 0.85];
    var counts = { all: list.length };
    list.forEach(function (a) { counts[a.category] = (counts[a.category] || 0) + 1; });
    ["all"].concat(Object.keys(ACH_CATEGORIES).filter(function (k) { return counts[k]; }))
      .forEach(function (cat) {
        var on = filter === cat;
        var t = el("button", "hall-tag" + (on ? " on" : ""));
        t.type = "button";
        t.setAttribute("role", "tab");
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.style.paddingBottom = (100 / tagAspect) + "%";   // hold the sign's shape
        var ti = el("span", "hall-tag-in");
        ti.style.left = (tp[0] * 100) + "%";
        ti.style.top = (tp[1] * 100) + "%";
        ti.style.width = ((tp[2] - tp[0]) * 100) + "%";
        ti.style.height = ((tp[3] - tp[1]) * 100) + "%";
        ti.innerHTML = (cat === "all" ? "All" : ACH_CATEGORIES[cat].label) +
          "<span class='n'>" + (counts[cat] || 0) + "</span>";
        t.appendChild(ti);
        t.addEventListener("click", function () {
          achFilter = cat;
          hallBurst = false;               // filtering is not a re-entrance
          buildRoom(room, content, cat);
        });
        tags.appendChild(t);
      });
    wall.appendChild(tags);

    // Suu walks in and stays, then reacts when a certificate opens. Decoration
    // only: aria-hidden and pointer-events:none, so she can never swallow a
    // click meant for a certificate behind her.
    /* The pager: painted plaques at the bottom RIGHT of the room, lined up under
       the filter column so the right-hand wall reads as one edge. Back appears
       whenever this is not the first page, Forward whenever a next page exists,
       so page 2 of 2 shows only Back and gains Forward the moment a third page
       appears. */
    if (pageCount > 1) {
      var pgNat = A.pieces.pager || [346, 123];
      var pgH = hallVal("pager.h");
      /* Kept fully inside the room: pgY + pgH must land above the bottom edge,
         or the plaques hang off the floor. band.y1 + 0.05 alone put them at
         1.005 of the room at 1600x860. */
      var pgY = ovNum("pager.y", band.y1 + 0.04, 0.02, 0.97);
      pgY = Math.min(pgY, 0.985 - pgH);
      var pager = el("div", "hall-pager");
      /* Mirrors the way out: .hall-bar carries padding .7rem 1rem, so "Back to
         the story" sits 16px in from the LEFT edge and this sits 16px in from
         the right. Held in px (16 / vw), not a fraction, or the two margins
         drift apart as the window changes. It used to stop at the rack's right
         edge, stranded mid-wall with the filter column outboard of it. */
      pager.style.right = (ovNum("pager.right", 16 / vw, 0.002, 0.40) * 100) + "%";
      pager.style.top = (pgY * vh) + "px";
      pager.style.height = (pgH * vh) + "px";
      function plaque(label, delta, cls, usable) {
        var b = el("button", "hall-pg " + cls + (usable ? "" : " off"));
        b.type = "button";
        /* Drawn on every page whether or not it leads anywhere, and disabled
           when it does not. Rendering it conditionally is what made the one
           visible plaque jump a slot sideways on each turn. */
        b.disabled = !usable;
        /* px, not %. .hall-pager is absolutely positioned and shrink-wraps its
           content, so a percentage width resolves against a box whose width is
           being derived FROM it - the plaques collapsed to thumbnails. */
        b.style.height = (pgH * vh) + "px";
        b.style.width = (pgH * vh * (pgNat[0] / pgNat[1])) + "px";
        nineSlice(b, "pager", pgH * vh);
        var pp = (A.panel && A.panel.pager) || [0.10, 0.14, 0.89, 0.83];
        var pi = el("span", "hall-pg-in", label);
        pi.style.left = (pp[0] * 100) + "%";
        pi.style.top = (pp[1] * 100) + "%";
        pi.style.width = ((pp[2] - pp[0]) * 100) + "%";
        pi.style.height = ((pp[3] - pp[1]) * 100) + "%";
        b.appendChild(pi);
        b.style.setProperty("--pg-fs", (pgH * vh * 0.30).toFixed(2) + "px");
        b.addEventListener("click", function () {
          hallPage += delta;
          hallBurst = true;            // the next page arrives, it does not filter in
          buildRoom(room, content, achFilter);
          hallBurst = false;
        });
        return b;
      }
      /* Fixed geometry, so paging never moves a control under the cursor. Both
         plaques exist on every page and the counter is drawn FIRST at a fixed
         width, so the row's width is constant and every part is pinned by
         construction rather than by arithmetic. An earlier attempt reserved a
         spacer where a plaque was missing: that held the CONTAINER still while
         the one plaque you can actually see jumped a whole slot sideways. */
      var pgW = pgH * vh * (pgNat[0] / pgNat[1]);
      var ind = el("span", "hall-pg-num", (hallPage + 1) + " / " + pageCount);
      ind.style.minWidth = (pgW * 0.5).toFixed(1) + "px";
      pager.appendChild(ind);
      pager.appendChild(plaque("← Back", -1, "back", hallPage > 0));
      pager.appendChild(plaque("Continue →", 1, "fwd", hallPage < pageCount - 1));
      wall.appendChild(pager);
    }

    // She walks in on the opening only. hallBurst marks that render; a filter
    // click rebuilds the room too, and having her stroll in again each time you
    // touched a chip would read as a glitch.
    var suu = el("div", "ach-suu" + (hallBurst ? " walk-in" : ""));
    // through a variable, because suuWalkIn's last frame lands on it too -
    // a hardcoded end frame would snap her back after every walk-in
    suu.style.setProperty("--suu-left", (hallVal("suu.left") * 100) + "%");
    suu.style.bottom = (hallVal("suu.bottom") * 100) + "%";
    suu.style.width = (hallVal("suu.width") * 100) + "%";
    suu.setAttribute("aria-hidden", "true");
    suu.innerHTML = suuSpriteSVG();
    wall.appendChild(suu);

    room.appendChild(wall);
    room.appendChild(buildCertPanel());
    return true;
  }

  function buildCertPanel() {
    var panel = el("div", "ach-panel");
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.innerHTML =
      '<button class="ach-panel-x" type="button" aria-label="Close">&#10005;</button>' +
      '<p class="ach-panel-cat"></p><h4 class="ach-panel-title"></h4>' +
      '<p class="ach-panel-org"></p><p class="ach-panel-desc"></p>';
    return panel;
  }

  /* An OPAQUE cream panel, not a translucent one: the ivy wall is far too busy
     to read a sentence through, and the brief's own rule says long-form text
     sits on an opaque surface. */
  function openCert(room, content, idx, opener) {
    var a = (content.achievements || [])[idx];
    if (!a) return;
    // Retire any previous opening FIRST. There is one shared panel, so closing
    // the old one afterwards would hide the panel we just filled in.
    if (room._closeCert) room._closeCert();
    var panel = room.querySelector(".ach-panel");
    var cat = ACH_CATEGORIES[a.category] || ACH_CATEGORIES.academic;
    panel.querySelector(".ach-panel-cat").textContent = cat.icon + " " + cat.label;
    panel.querySelector(".ach-panel-title").textContent = a.title;
    panel.querySelector(".ach-panel-org").textContent =
      (a.org || "") + (a.org && a.year ? " · " : "") + (a.year || "");
    panel.querySelector(".ach-panel-desc").textContent = a.description || "";
    panel.hidden = false;
    room.classList.add("cert-open");
    /* Suu cheers, then goes back to idling. The class has to come OFF when the
       cheer ends: suuCheer is a one-shot with no fill-mode, so leaving .react
       on her would park her on a finished animation and she would never bob
       again after the first certificate you opened. */
    var suu = room.querySelector(".ach-suu");
    if (suu) {
      suu.classList.remove("react", "walk-in");
      void suu.offsetWidth;                      // restart, even on a re-open
      suu.classList.add("react");
      suu.addEventListener("animationend", function done() {
        suu.classList.remove("react");
        suu.removeEventListener("animationend", done);
      });
    }

    function close(silent) {
      panel.hidden = true;
      room.classList.remove("cert-open");
      document.removeEventListener("keydown", onKey, true);
      room._closeCert = null;
      // focus returns to what opened it - but not when the room is being
      // rebuilt under us, where the opener is already detached
      if (!silent && opener && opener.isConnected) opener.focus();
    }
    /* stopImmediatePropagation, not stopPropagation: the room's own Esc handler
       is on `document` too, and a merely-stopped event still reaches it - one
       Esc would close the certificate AND leave the room. Stopping immediately
       is what makes Esc layered. */
    function onKey(e) {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      close();
    }
    room._closeCert = function () { close(true); };
    panel.querySelector(".ach-panel-x").onclick = function () { close(); };
    document.addEventListener("keydown", onKey, true);
    panel.querySelector(".ach-panel-x").focus();
  }

  /* ---------- the room as a destination ----------
     The same shape as worldmap.js's openMap/closeMap, because the valley
     already solved this: an overlay on <body>, the page scroll locked, #hall in
     the address bar, a wipe, and LAYERED Esc - an open certificate closes
     first, and only a second Esc leaves the room. */
  var hallRoom = null, hallResizeTimer = 0;

  function roomAvailable() {
    return !document.body.classList.contains("editing") &&
           !window.matchMedia("(max-width: 760px)").matches &&
           !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
           !!roomArt();
  }

  function openHallRoom(content, fromDoor) {
    if (hallRoom || !roomArt()) return;
    var ov = el("div", "hall-overlay");
    ov.id = "hall-overlay";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-label", "The Hall of Achievements");
    var bar = el("div", "hall-bar");
    var back = el("button", "btn btn-small", "← Back to the story");
    back.addEventListener("click", function () { closeHallRoom(); });
    bar.appendChild(back);
    ov.appendChild(bar);
    var stage = el("div", "hall-stage");
    stage.id = "hall-stage";
    ov.appendChild(stage);
    document.body.appendChild(ov);
    document.body.style.overflow = "hidden";
    hallRoom = { ov: ov, stage: stage, content: content };
    hallPage = 0;                      // every entrance starts at the first page

    hallBurst = true;
    buildRoom(stage, content, achFilter);
    /* clientWidth is 0 in the tick an element is inserted, so the first fit can
       read the wrong viewport and lay the room out at the wrong size. Build
       again once layout is real - the lesson worldmap.js already paid for with
       frameBuildings. Still the entrance, so the burst plays on the good one. */
    setTimeout(function () {
      if (!hallRoom) return;
      hallBurst = true;
      buildRoom(stage, content, achFilter);
      hallBurst = false;
    }, 0);

    if (fromDoor) {
      ov.classList.add("hall-door-reveal");
    } else if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ov.classList.add("hall-wipe");
      setTimeout(function () { ov.classList.remove("hall-wipe"); }, 900);
    }
    if (location.hash !== "#hall") history.pushState(null, "", "#hall");
    window.addEventListener("resize", onHallResize);
    back.focus();
  }

  function closeHallRoom(keepHash) {
    if (!hallRoom) return;
    window.removeEventListener("resize", onHallResize);
    clearTimeout(hallResizeTimer);
    if (hallRoom.stage._closeCert) hallRoom.stage._closeCert();
    hallRoom.ov.remove();
    hallRoom = null;
    hallOpen = false;                 // the facade goes back to waiting
    document.body.style.overflow = "";
    if (!keepHash && location.hash === "#hall") {
      history.pushState(null, "", location.pathname + location.search);
    }
    var hall = $("#ach-hall");
    if (hall) hall.classList.remove("opening", "leaving");
    if (App.content) renderAchievements(App.content);
  }

  function onHallResize() {
    clearTimeout(hallResizeTimer);
    hallResizeTimer = setTimeout(function () {
      if (!hallRoom) return;
      hallBurst = false;              // a resize is not a re-entrance
      buildRoom(hallRoom.stage, hallRoom.content, achFilter);
    }, 150);
  }

  /* ---------- the Hall's scene-editor adapter ----------
     Registered for js/scene-editor.js (owner-only, ?editor=1). The editor knows
     how to draw and drag a handle; only this knows what a shelf is.

     Every handle reports `perPx` - how much its value changes per pixel dragged -
     which is what lets one generic drag routine serve fractions of the wall,
     fractions of the title band, and plain counts alike. */
  function hallHandleList() {
    var stage = hallRoom && hallRoom.stage;
    var wall = stage && stage.querySelector(".ach-wall");
    if (!wall) return [];
    var wr = wall.getBoundingClientRect();
    var A = window.ACHIEVEMENT_ART;
    var perX = 1 / wr.width, perY = 1 / wr.height;
    var out = [];
    function rectOf(node) {
      var r = node.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }
    function frac(node, side) {
      var r = node.getBoundingClientRect();
      return (r[side] - (side === "top" || side === "bottom" ? wr.top : wr.left)) /
             (side === "top" || side === "bottom" ? wr.height : wr.width);
    }

    /* One handle per shelf. Dragging the body writes y AND both edges, so the
       shelf translates; the west and east grips write one edge each, so it
       resizes. Every path is per-shelf, so no other shelf moves. */
    [].forEach.call(stage.querySelectorAll(".ach-shelf"), function (sh, i) {
      var plate = sh.querySelector(".ach-plate");
      var name = plate ? plate.textContent.replace(/\s+/g, " ").trim() : "Shelf " + (i + 1);
      var x0 = frac(sh, "left"), x1 = frac(sh, "right");
      var plankY = frac(sh, "top") + A.shelf.plank * (sh.getBoundingClientRect().height / wr.height);
      var yW = { path: HALL_SHELF_Y + i, axis: "y", perPx: perY, value: plankY,
                 min: 0.05, max: 0.99, step: 0.001, label: name + " · height" };
      var x0W = { path: "shelf.x0." + i, axis: "x", perPx: perX, value: x0,
                  min: 0.01, max: 0.97, step: 0.001, label: name + " · left" };
      var x1W = { path: "shelf.x1." + i, axis: "x", perPx: perX, value: x1,
                  min: 0.03, max: 0.999, step: 0.001, label: name + " · right" };
      /* Thickness. The north grip drags UP to get thicker, so its perPx is
         negative; the south grip drags down for the same result. */
      var syNow = ovNum("shelf.sy." + i, 1, 0.3, 3);
      var natH = (x1 - x0) * (wr.width / wr.height) / (A.pieces.shelf[0] / A.pieces.shelf[1]);
      var syPer = natH > 0 ? 1 / (natH * wr.height) : 0;
      function syW(sign, label) {
        return { path: "shelf.sy." + i, axis: "y", perPx: sign * syPer, value: syNow,
                 min: 0.3, max: 3, step: 0.01, label: name + " · " + label };
      }
      out.push({
        path: "shelf." + i, label: name, kind: "rule", rect: rectOf(sh),
        moves: [yW, x0W, x1W],
        grips: [{ dir: "w", writes: [x0W] }, { dir: "e", writes: [x1W] },
                { dir: "n", writes: [syW(-1, "thickness")] },
                { dir: "s", writes: [syW(1, "thickness")] }],
        props: [yW, x0W, x1W, syW(1, "thickness")]
      });
    });

    /* One handle per certificate: drag to slide it along its shelf, corner grip
       to size that one alone. Keyed by the achievement index, so moving one
       leaves every other exactly where it was. */
    [].forEach.call(stage.querySelectorAll(".ach-cert"), function (c, n) {
      var ai = c.getAttribute("data-ai");
      var shelfEl = c.parentNode;
      var sw = shelfEl.getBoundingClientRect().width || 1;
      var r = c.getBoundingClientRect();
      var title = (c.querySelector(".ach-cert-title") || {}).textContent || ("Certificate " + (n + 1));
      title = title.replace(/\s+/g, " ").trim().slice(0, 22);
      var cx = (r.left + r.width / 2 - shelfEl.getBoundingClientRect().left) / sw;
      var xW = { path: "cert.x." + ai, axis: "x", perPx: 1 / sw, value: cx,
                 min: 0.01, max: 0.99, step: 0.002, label: title + " · across" };
      var hW = { path: "cert.h." + ai, axis: "y", perPx: perY, value: r.height / wr.height,
                 min: 0.03, max: 0.32, step: 0.001, label: title + " · height" };
      var wNow = ovNum("cert.w." + ai, 1, 0.35, 2.5);
      var wW = { path: "cert.w." + ai, axis: "x", perPx: r.width ? wNow / r.width : 0,
                 value: wNow, min: 0.35, max: 2.5, step: 0.01, label: title + " · width" };
      out.push({
        path: "cert." + ai, label: title, kind: "item", rect: rectOf(c),
        moves: [xW],
        grips: [{ dir: "e", writes: [wW] }, { dir: "s", writes: [hW] },
                { dir: "se", writes: [wW, hW] }],
        props: [xW, hW, wW]
      });
    });

    function rackCentre() {
      var lo = 1, hi = 0;
      [].forEach.call(stage.querySelectorAll(".ach-shelf"), function (sh) {
        var r = sh.getBoundingClientRect();
        lo = Math.min(lo, (r.left - wr.left) / wr.width);
        hi = Math.max(hi, (r.right - wr.left) / wr.width);
      });
      return hi > lo ? (lo + hi) / 2 : 0.5;
    }
    var mid = rackCentre();

    /* The heading board: drag it to MOVE (it used to resize on drag, which is
       why it could not be recentred), grips resize it. Its default position is
       the rack's centre, so it follows the shelves unless you move it. */
    var signEl = stage.querySelector(".hall-sign");
    if (signEl) {
      var sx = { path: "title.x", axis: "x", perPx: perX,
                 value: ovNum("title.x", mid, 0.02, 0.98),
                 min: 0.02, max: 0.98, step: 0.002, label: "Heading board · across" };
      var sy = { path: "title.signY", axis: "y", perPx: perY,
                 value: (signEl.getBoundingClientRect().top - wr.top) / wr.height,
                 min: 0, max: 0.96, step: 0.002, label: "Heading board · height" };
      var sw = { path: "title.signW", axis: "x", perPx: 2 * perX,
                 value: hallVal("title.signW"),
                 min: 0.10, max: 0.95, step: 0.002, label: "Heading board · width" };
      var shh = { path: "title.signH", axis: "y", perPx: 1 / 180,
                  value: hallVal("title.signH"),
                  min: 0.2, max: 1, step: 0.01, label: "Heading board · thickness" };
      // NB the board is drawn at exactly this size now: an explicit signH is
      // no longer auto-shrunk, so the handle and the render agree
      out.push({ path: "title.sign", label: "Heading board", kind: "item",
                 rect: rectOf(signEl), moves: [sx, sy],
                 grips: [{ dir: "e", writes: [sw] }, { dir: "s", writes: [shh] }],
                 props: [sx, sy, sw, shh] });
    }

    var tagsEl = stage.querySelector(".hall-tags");
    if (tagsEl) {
      var tx = { path: "tags.x", axis: "x", perPx: perX, value: hallVal("tags.x"),
                 min: 0.05, max: 0.98, step: 0.002, label: "Filter column · across" };
      var ty = { path: "tags.y", axis: "y", perPx: perY, value: hallVal("tags.y"),
                 min: 0, max: 0.8, step: 0.002, label: "Filter column · height" };
      var tsz = { path: "tags.w", axis: "x", perPx: perX, value: hallVal("tags.w"),
                  min: 0.03, max: 0.30, step: 0.002, label: "Filter column · size" };
      var tgap = { path: "tags.gap", axis: "y", perPx: perY, value: hallVal("tags.gap"),
                   min: 0, max: 0.10, step: 0.002, label: "Filter column · spacing" };
      out.push({ path: "tags", label: "Filter column", kind: "item",
                 rect: rectOf(tagsEl), moves: [tx, ty],
                 grips: [{ dir: "e", writes: [tsz] }],
                 props: [tx, ty, tsz, tgap] });
    }

    /* The shared rules: panel-only, so draw() skips them (no rect) but they stay
       tunable AND clampable. Swallowed once by a refactor of this function -
       the handle count dropping from 20 to 19 was the tell. */
    out.push({
      path: "room.shared", label: "Shared rules", kind: "rule", rect: null, moves: [],
      props: [
        ["cert.height", "All certificates · size", 0.001],
        ["cert.inset", "Certificate inset from brackets", 0.005],
        ["cert.sink", "Certificate sink into the board", 0.01],
        ["shelf.perShelf", "Certificates per shelf", 1]
      ].map(function (r) {
        var b = HALL_BOUNDS[r[0]] || [0, 1];
        return { path: r[0], label: r[1], value: hallVal(r[0]),
                 min: b[0], max: b[1], step: r[2], axis: "y", perPx: 0 };
      })
    });

    var suuEl = stage.querySelector(".ach-suu");
    if (suuEl) {
      var ux = { path: "suu.left", axis: "x", perPx: perX, value: hallVal("suu.left"),
                 min: 0, max: 0.95, step: 0.002, label: "Suu · across" };
      var uy = { path: "suu.bottom", axis: "y", perPx: -perY, value: hallVal("suu.bottom"),
                 min: 0, max: 0.9, step: 0.002, label: "Suu · up the wall" };
      var uw = { path: "suu.width", axis: "x", perPx: perX, value: hallVal("suu.width"),
                 min: 0.01, max: 0.30, step: 0.002, label: "Suu · size" };
      out.push({ path: "suu", label: "Suu", kind: "item", rect: rectOf(suuEl),
                 moves: [ux, uy], grips: [{ dir: "e", writes: [uw] }],
                 props: [ux, uy, uw] });
    }

    return out;
  }

  window.SCENE_ADAPTERS = window.SCENE_ADAPTERS || [];
  window.SCENE_ADAPTERS.push({
    id: "hall",
    label: "Hall of Achievements",
    handles: hallHandleList,
    activate: function () { if (!hallRoom && App.content) openHallRoom(App.content); },
    render: function () {
      if (hallRoom) {
        hallBurst = false;                    // tuning is not a re-entrance
        buildRoom(hallRoom.stage, hallRoom.content, achFilter);
      }
    },
    defaults: HALL_DEFAULTS,
    bounds: HALL_BOUNDS,
    // what the layout was tuned against; a re-cropped wall changes this
    fingerprint: function () {
      var A = window.ACHIEVEMENT_ART;
      if (!A) return null;
      return [A.pieces.wall.join("x"), A.pieces.shelf.join("x"),
              A.shelf.plank, A.shelf.board, A.floor].join("|");
    }
  });

  /* The toolbox workshop. Second in the list on purpose: the admin enables
     whichever adapter comes first, and that has always been the hall. */
  window.SCENE_ADAPTERS.push({
    id: "toolbox",
    label: "Toolbox workshop",
    handles: tbHandleList,
    render: function () { applyToolboxLayout(document.querySelector(".tb-stage")); },
    defaults: TB_DEFAULTS,
    bounds: TB_BOUNDS,
    // re-cropping the plate or rebuilding the bench invalidates a saved layout
    fingerprint: function () { return "bg1500x844|counter2172x724|stage1500:844"; }
  });

  function doRenameHandleList() {
    var scene = doLayoutScene();
    if (!scene) return [];
    var out = [];
    function rectOf(node) {
      var r = node.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }
    doRenameTargets(scene).forEach(function (target) {
      var node = doLayoutElement(scene, target);
      if (!node) return;
      var r = node.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var parent = node.offsetParent || node.parentElement;
      var pr = parent && parent.getBoundingClientRect();
      var perX = pr && pr.width ? 100 / pr.width : 0;
      var perY = pr && pr.height ? 100 / pr.height : 0;
      var id = target[0], label = target[1];
      var x = { path: id + ".x", axis: "x", perPx: perX,
                value: doLayoutVal(id + ".x"), min: -100, max: 100, step: 0.1,
                label: label + " · horizontal position" };
      var y = { path: id + ".y", axis: "y", perPx: perY,
                value: doLayoutVal(id + ".y"), min: -100, max: 100, step: 0.1,
                label: label + " · vertical position" };
      var sxNow = doLayoutVal(id + ".sx"), syNow = doLayoutVal(id + ".sy");
      var sx = { path: id + ".sx", axis: "x", perPx: r.width ? sxNow / r.width : 0,
                 value: sxNow, min: 0.2, max: 3, step: 0.01,
                 label: label + " · width" };
      var sy = { path: id + ".sy", axis: "y", perPx: r.height ? syNow / r.height : 0,
                 value: syNow, min: 0.2, max: 3, step: 0.01,
                 label: label + " · height" };
      out.push({
        path: id, label: label, kind: "item", rect: rectOf(node),
        moves: [x, y],
        grips: [{ dir: "e", writes: [sx] }, { dir: "s", writes: [sy] },
                { dir: "se", writes: [sx, sy] }],
        props: [x, y, sx, sy]
      });
    });
    return out;
  }

  window.SCENE_ADAPTERS.push({
    id: "do-rename",
    label: "DO Rename",
    handles: doRenameHandleList,
    waitForReady: waitForDoRenameWorkbench,
    activate: function () {
      closeHallRoom(true);
      var scene = doLayoutScene();
      if (scene) {
        /* The public page uses smooth scrolling. An editor scene switch must
           be immediate or its handles are drawn thousands of pixels below the
           preview while the page is still animating toward the section. */
        var root = document.documentElement;
        var prior = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        scene.scrollIntoView({ block: "center", inline: "nearest" });
        root.style.scrollBehavior = prior;
      }
    },
    render: function () { applyDoRenameLayout(); },
    defaults: DO_LAYOUT_DEFAULTS,
    bounds: DO_LAYOUT_BOUNDS,
    fingerprint: function () { return "painted-mill-v3|1774x887"; }
  });

  window.addEventListener("resize", function () { applyDoRenameLayout(); });

  function renderAchievements(content) {
    var section = $("#achievements");
    var list = content.achievements || [];
    var eras = content.achievementEras || {};
    var editing = document.body.classList.contains("editing");
    section.style.display = list.length || editing ? "" : "none";
    var filter = editing ? "all" : achFilter;

    /* The room is a full-screen destination now, so on desktop the facade
       simply stays in the page as the door and the rail is never used. Where
       the room cannot go - phones, reduced motion, edit mode (every data-edit
       hook lives on the rail) - the facade still opens the rail in place,
       exactly as before. The rail is kept, not replaced. */
    var hall = $("#ach-hall");
    var overlayPath = roomAvailable() && !!list.length;
    var closed = !editing && list.length && (overlayPath || !hallOpen);
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
    var mail = el("a", "btn btn-primary", content.contact.cta || "Send a letter");
    mail.href = "mailto:" + content.identity.email;
    row.appendChild(mail);
    // a résumé chip - opens the ATS résumé page (view + download PDF there)
    var cv = el("a", "contact-chip contact-resume");
    cv.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm8 1.5V8h4.5L14 3.5zM8 12h8v1.6H8V12zm0 3.4h8V17H8v-1.6zM8 8.6h4v1.6H8V8.6z"/></svg>';
    cv.appendChild(document.createTextNode("Résumé"));
    cv.href = "resume.html";
    row.appendChild(cv);
    var em = el("span", "contact-meta", content.identity.email);
    em.setAttribute("data-edit", "identity.email");
    row.appendChild(em);
    var loc = el("span", "contact-meta", content.identity.location);
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

  /* Footer links share the editable identity source with the contact board. */
  function renderFooter(content) {
    var links = $("#footer-links");
    if (!links) return;
    links.innerHTML = "";
    function add(label, href, external) {
      var link = el("a", "", label);
      link.href = href;
      if (external) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
      links.appendChild(link);
    }
    if (content.identity.email) add("Email", "mailto:" + content.identity.email);
    var profiles = content.identity.links || [];
    ["linkedin", "github"].forEach(function (label) {
      profiles.forEach(function (profile) {
        if ((profile.label || "").toLowerCase() === label && profile.url) add(profile.label, profile.url, true);
      });
    });
    profiles.forEach(function (profile) {
      if (profile.url && !/^(linkedin|github)$/i.test(profile.label || "")) add(profile.label, profile.url, true);
    });
    add("R\u00e9sum\u00e9", "resume.html");
    $("#footer-year").textContent = new Date().getFullYear();
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
    renderProjectsInline();
    renderAvatar(c);
    renderSkills(c);
    renderJourney(c);
    renderAchievements(c);
    renderContact(c);
    renderFooter(c);
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
    buildOverview: buildOverview,
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
    /* ---------- the Hall is a destination, like the valley map ---------- */
    window.addEventListener("hashchange", function () {
      if (location.hash === "#hall") {
        if (roomAvailable()) openHallRoom(App.content);
      } else {
        closeHallRoom(true);          // the hash already moved; do not push again
      }
    });
    document.addEventListener("keydown", function (ev) {
      if (!hallRoom) return;
      // An open certificate stops the event immediately, so reaching here means
      // nothing is layered above the room.
      if (ev.key === "Escape") { closeHallRoom(); return; }
      // arrows page, but only where a pager exists to page with
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      var dir = ev.key === "ArrowRight" ? 1 : -1;
      var pg = hallRoom.stage.querySelector(dir > 0 ? ".hall-pg.fwd" : ".hall-pg.back");
      /* Both plaques exist on every page now, so presence no longer means the
         page can turn - the disabled one is the end of the run. A disabled
         button ignores .click() anyway; this says so out loud, so a refactor
         cannot drop the guard by accident and let hallPage run off the end. */
      if (!pg || pg.disabled) return;
      ev.preventDefault();
      pg.click();
    });
    // a cold load straight to #hall
    if (location.hash === "#hall" && roomAvailable()) openHallRoom(App.content);

    /* the overlay's tools delegate to the desktop bar's own handlers */
    $("#ov-theme").addEventListener("click", function () { $("#btn-theme").click(); });
    $("#ov-weather").addEventListener("click", function () { $("#btn-weather").click(); });
    $("#ov-present").addEventListener("click", function () {
      navOverlay.close();
      $("#btn-present").click();
    });
  });
})();
