/* ============================================================
   motion.js - the Framer-grade motion layer, hand-built.
   Intro sequence (once per session, skippable), scroll reveals
   with stagger, magnetic buttons, 3D card tilt, stat counters,
   and the Konami-code easter egg. Every effect respects
   prefers-reduced-motion. Transform/opacity only.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* Hover candy (magnetic buttons, 3D card tilt) is for a mouse. On touch its
     pointermove handler fires DURING a tap - pointerdown→pointermove→pointerup→
     click - stamping a 3D perspective/rotate transform onto the card mid-tap,
     and browsers hit-test 3D-transformed elements unreliably, so the click can
     fall through and "tapping does nothing". Gate these to hover-capable,
     fine pointers only. (The CSS :hover equivalents are already guarded.) */
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- intro overlay ---------- */
  function intro() {
    var el = document.getElementById("intro");
    if (!el) return;
    var seen = false;
    try { seen = sessionStorage.getItem("xe.intro") === "1"; } catch (e) {}
    if (reduced || seen) { el.remove(); return; }
    var mark = document.getElementById("intro-mark");
    var App = window.PORTFOLIO_APP;
    if (App && App.content && App.content.identity.monogram) mark.textContent = App.content.identity.monogram;
    el.hidden = false;
    function leave() {
      if (el.classList.contains("leaving")) return;
      el.classList.add("leaving");
      try { sessionStorage.setItem("xe.intro", "1"); } catch (e) {}
      setTimeout(function () { el.remove(); }, 500);
    }
    el.addEventListener("click", leave);
    setTimeout(leave, 1700);
  }

  /* ---------- scroll reveals (re-wireable after re-renders) ---------- */
  var obs = null;
  function wireReveals() {
    if (obs) obs.disconnect();
    obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    var nodes = document.querySelectorAll(".reveal:not(.in)");
    Array.prototype.forEach.call(nodes, function (n, i) {
      // stagger siblings that arrive together
      n.style.setProperty("--d", ((i % 6) * 0.07).toFixed(2) + "s");
      obs.observe(n);
    });
  }

  /* ---------- magnetic buttons ---------- */
  function wireMagnetic() {
    if (reduced || !canHover) return;
    document.querySelectorAll(".magnetic").forEach(function (btn) {
      if (btn._mag) return;
      btn._mag = true;
      btn.addEventListener("pointermove", function (ev) {
        var r = btn.getBoundingClientRect();
        var dx = ev.clientX - (r.left + r.width / 2);
        var dy = ev.clientY - (r.top + r.height / 2);
        btn.style.transform = "translate(" + dx * 0.18 + "px," + dy * 0.28 + "px)";
      });
      btn.addEventListener("pointerleave", function () { btn.style.transform = ""; });
    });
  }

  /* ---------- 3D tilt on cards ---------- */
  function wireTilt() {
    if (reduced || !canHover) return;
    document.querySelectorAll(".grid-card").forEach(function (card) {
      if (card._tilt) return;
      card._tilt = true;
      card.addEventListener("pointermove", function (ev) {
        var r = card.getBoundingClientRect();
        var rx = ((ev.clientY - r.top) / r.height - 0.5) * -6;
        var ry = ((ev.clientX - r.left) / r.width - 0.5) * 8;
        card.style.transform = "perspective(700px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateY(-2px)";
      });
      card.addEventListener("pointerleave", function () { card.style.transform = ""; });
    });
  }

  /* ---------- stat counters ---------- */
  function wireCounters() {
    var stats = document.querySelectorAll(".stat b");
    if (!stats.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var node = e.target;
        var raw = node.getAttribute("data-count-final") || node.textContent;
        var m = raw.match(/^(\d+)(.*)$/);
        if (!m || reduced) return;
        var final = parseInt(m[1], 10), suffix = m[2] || "";
        if (final <= 1) return;
        node.setAttribute("data-count-final", raw);
        var startT = performance.now(), dur = 900;
        (function tick(now) {
          var k = Math.min(1, (now - startT) / dur);
          k = 1 - Math.pow(1 - k, 3);
          node.textContent = Math.round(final * k) + suffix;
          if (k < 1) requestAnimationFrame(tick);
          else node.textContent = raw;
        })(startT);
      });
    }, { threshold: 0.6 });
    stats.forEach(function (s) { io.observe(s); });
  }

  /* ---------- Konami easter egg: the v1 boot terminal ---------- */
  var KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  var kIdx = 0;
  function wireEgg() {
    document.addEventListener("keydown", function (ev) {
      var egg = document.getElementById("egg");
      if (!egg.hidden && ev.key === "Escape") { egg.hidden = true; return; }
      kIdx = (ev.key === KONAMI[kIdx]) ? kIdx + 1 : (ev.key === KONAMI[0] ? 1 : 0);
      if (kIdx === KONAMI.length) {
        kIdx = 0;
        openEgg();
      }
    });
  }
  function openEgg() {
    var egg = document.getElementById("egg");
    var body = document.getElementById("egg-terminal-body");
    egg.hidden = false;
    var App = window.PORTFOLIO_APP;
    var lines = (App && App.content.hero.terminal) || ["$ hello", "you found it."];
    body.innerHTML = "";
    var li = 0, ci = 0;
    var cursor = document.createElement("span");
    cursor.className = "t-cursor";
    body.appendChild(cursor);
    var cur = null;
    (function step() {
      if (egg.hidden || li >= lines.length) return;
      var line = lines[li];
      if (ci === 0) {
        cur = document.createElement("span");
        cur.className = line.indexOf("$") === 0 ? "t-cmd" : (line.indexOf("[OK]") === 0 ? "t-ok" : "");
        body.insertBefore(cur, cursor);
      }
      if (reduced) { cur.textContent = line + "\n"; li++; ci = 0; step(); return; }
      if (ci < line.length) {
        cur.textContent += line[ci++];
        setTimeout(step, line.indexOf("$") === 0 ? 34 : 10);
      } else {
        cur.textContent += "\n"; li++; ci = 0;
        setTimeout(step, 260);
      }
    })();
    egg.addEventListener("click", function (ev) { if (ev.target === egg) egg.hidden = true; });
  }

  /* ---------- public: re-wire after re-renders ---------- */
  window.PORTFOLIO_MOTION = {
    rewire: function () { wireReveals(); wireMagnetic(); wireTilt(); wireCounters(); }
  };

  document.addEventListener("DOMContentLoaded", function () {
    intro();
    wireEgg();
    // first wire happens after app.js renders (app calls rewire)
  });
})();
