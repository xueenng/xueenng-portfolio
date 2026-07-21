/* ============================================================
   tour.js - Suu's guided tour.
   Two scripted walks over the live page: "hurry" (the 60-second
   pitch, auto-advances) and "full" (the whole valley, manual).
   Suu walks along the bottom of the viewport as progress, a
   parchment speech bubble follows her, and the current stop is
   spotlit (a box-shadow vignette; the page stays interactive).
   Entry: the hero "in a hurry?" line, or clicking valley-Suu.
   Guards: never during edit mode or Present. Esc leaves.
   Coarse pointers: no walker - the bubble docks to the bottom
   with Suu's face in its corner. Debug: window.PORTFOLIO_TOUR.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function coarse() {
    return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 700;
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function suuSVG() {
    return window.PORTFOLIO_APP && window.PORTFOLIO_APP.suuSprite
      ? window.PORTFOLIO_APP.suuSprite() : "";
  }

  /* ---------- things Suu opens as she arrives ---------- */
  function openHall() {
    var sec = document.getElementById("achievements");
    if (!sec || sec.className.indexOf("hall-closed") < 0) return;   // already open
    var hit = document.querySelector("#ach-hall .hall-hit");
    if (hit) hit.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }
  function openToolboxes() {
    var latch = document.querySelector(".toolbox-all");
    if (!latch) return;
    var closed = Array.prototype.some.call(
      document.querySelectorAll(".skill-group.toolbox"),
      function (b) { return !b.classList.contains("open"); });
    if (closed) latch.click();
  }
  function showAdventureMap() {
    var chips = document.querySelectorAll("#journey-view .chip");
    if (chips[1] && chips[1].className.indexOf("on") < 0) chips[1].click();
  }
  function showTimeline() {
    var chips = document.querySelectorAll("#journey-view .chip");
    if (chips[0] && chips[0].className.indexOf("on") < 0) chips[0].click();
  }

  /* ---------- the two scripts ---------- */
  var SCRIPTS = {
    hurry: [
      { sel: "#top",
        say: "Hello! I'm Suu. This is Xue En's valley - Business System Analyst by day, world-builder by night. Give me 60 seconds." },
      { sel: '.feature[data-project="do-pipeline"]',
        say: "By day: a production AI pipeline that reads, verifies and files every scanned delivery order. Zero-touch - humans only see the exceptions. Press Run later and watch it think." },
      { sel: '.feature[data-project="vr-escape-room"]',
        say: "By night: a VR escape room inside a real Malaysian heritage castle - modelled in Blender and built in Unity, solo. 90-200 FPS, 25 of 25 tests passed." },
      { sel: "#achievements", act: openHall, dwell: 11000,
        say: "Watch - I'll push these doors open. Inside: President's List three semesters, Dean's List two, and 10 As at SPM, collected era by era." },
      { sel: "#skills", act: openToolboxes,
        say: "The toolbox - let me flip every lid at once: SQL and SSRS, n8n automation, Python, AI pipelines, Unity and Blender." },
      { sel: "#contact",
        say: "That's the short of it. Stay and run something - or send a letter, the email is right here. Thank you for walking with me!" }
    ],
    full: [
      { sel: "#top",
        say: "Welcome to the painted valley! I'm Suu. Scrolling moves time here - the deeper you go, the darker the sky. Let me show you everything." },
      { sel: '.nav-links a[href="#map"]', noscroll: true,
        say: "This opens the valley map - every project is a building on the land. Arrow keys or WASD walk me around; click a roof to open the work." },
      { sel: "#selected",
        say: "The selected work runs for real: press the wax-seal buttons and watch the pipelines think. Mock data, real logic." },
      { sel: "#projects",
        say: "All the builds live here - filter with the chips. When a trail holds more than six, my signpost shows the way onward." },
      { sel: "#btn-lantern", noscroll: true,
        say: "When dusk makes the words hard to read, press this lantern (or the L key) - I'll carry a reading light to your cursor." },
      { sel: "#journey", act: showTimeline,
        say: "The journey, as a plain timeline: SPM in Ipoh, foundation in Sepang, Computer Science at UTAR, an internship in Taiping, and now analyst work." },
      { sel: "#journey-adventure", act: showAdventureMap, keep: true, dwell: 11000,
        say: "Or switch to the adventure map - and I walk the road myself. Click any signpost to send me there, or press 'let Suu walk' and I'll travel the whole route." },
      { sel: "#achievements", act: openHall, dwell: 11000,
        say: "The Hall of Achievements - stand back, I'll climb the steps and push the bronze doors open. Every honour is in there, era by era." },
      { sel: "#skills", act: openToolboxes,
        say: "Six toolboxes of skills - here, every lid at once. Click any one again to close it." },
      { sel: ".castle-scene",
        say: "And when night falls... a light is on in Kellie's Castle. Step inside if you dare - the full story of the VR project lives in there." },
      { sel: "#contact",
        say: "That's the whole valley. Send a letter any time - and thank you for visiting!" }
    ]
  };

  /* ---------- state ---------- */
  var active = null;   // { mode, stops, idx, auto }
  var dim = null, suu = null, bubble = null, chooseEl = null;
  var rafId = null, autoTimer = null, hoverPause = false;
  var suuX = -80, faceRight = true;

  function targetOf(stop) { return document.querySelector(stop.sel); }
  function visible(stop) {
    var t = targetOf(stop);
    if (!t) return false;
    var r = t.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  }
  function blocked() {
    var present = document.getElementById("present");
    return document.body.classList.contains("editing") || (present && !present.hidden);
  }

  /* ---------- overlay elements ---------- */
  function buildEls() {
    document.body.classList.add("touring");   // valley-Suu steps aside for the walker
    dim = el("div"); dim.id = "tour-dim"; dim.setAttribute("aria-hidden", "true");
    document.body.appendChild(dim);
    if (!coarse()) {
      suu = el("div"); suu.id = "tour-suu"; suu.setAttribute("aria-hidden", "true");
      suu.innerHTML = suuSVG();
      document.body.appendChild(suu);
      suuX = -60;
    }
    bubble = el("div", "tour-bubble" + (coarse() ? " dock" : ""));
    bubble.setAttribute("role", "dialog");
    bubble.setAttribute("aria-label", "Suu's guided tour");
    bubble.addEventListener("mouseenter", function () { hoverPause = true; stopAutoTimer(); });
    bubble.addEventListener("mouseleave", function () { hoverPause = false; armAuto(4000); });
    document.body.appendChild(bubble);
  }
  function removeEls() {
    document.body.classList.remove("touring");
    [dim, suu, bubble].forEach(function (n) { if (n) n.remove(); });
    dim = suu = bubble = null;
  }

  /* ---------- bubble content per stop ---------- */
  function renderBubble() {
    var st = active.stops[active.idx], n = active.stops.length, last = active.idx === n - 1;
    bubble.innerHTML = "";
    var x = el("button", "tour-x", "✕");
    x.title = "leave the tour (Esc)";
    x.addEventListener("click", end);
    bubble.appendChild(x);

    var say = el("p", "tour-say");
    if (coarse()) {
      var face = el("span", "tour-face");
      face.innerHTML = suuSVG();
      say.appendChild(face);
    }
    say.appendChild(document.createTextNode(st.say));
    bubble.appendChild(say);

    var ctl = el("div", "tour-ctl");
    var back = el("button", "chip", "◄ back");
    back.disabled = active.idx === 0;
    back.addEventListener("click", function () { manualGo(active.idx - 1); });
    ctl.appendChild(back);
    var next = el("button", "chip tour-next", last ? "done ✓" : "next ►");
    next.addEventListener("click", function () {
      if (last) end(); else manualGo(active.idx + 1);
    });
    ctl.appendChild(next);
    var dots = el("span", "tour-dots");
    for (var i = 0; i < n; i++) dots.appendChild(el("span", "tour-dot" + (i === active.idx ? " on" : "")));
    ctl.appendChild(dots);
    bubble.appendChild(ctl);

    bubble.appendChild(el("p", "tour-note",
      active.auto && !last
        ? "auto-playing - rest your mouse here to pause · Esc to leave"
        : "← / → keys work too · Esc to leave"));
  }

  /* ---------- movement ---------- */
  function navHeight() {
    var nav = document.querySelector(".nav");
    return nav ? nav.getBoundingClientRect().height : 72;
  }
  /* A tall section centred by scrollIntoView pushes its own heading off the
     top of the screen - which is why Selected work / All projects / Journey
     showed no title. Pin tall targets just under the sticky nav instead;
     only short ones get centred. */
  /* Where a stop's content really begins. A section's box top is its PADDING
     edge, so both the scroll and the spotlight start from this instead - the
     header (or the contact letter) is the first thing inside the glow. */
  function spotAnchor(t) {
    return (t.querySelector &&
      t.querySelector(".section-head, .contact-card, .feature-info h3, h2, h3")) || null;
  }
  /* The rect the tour actually cares about - shared by the scroll AND the
     spotlight so they can never disagree:
       - anchor that IS the content (the contact letter) -> just that,
         so a padded section still centres on its card;
       - anchor that is only a heading -> from the heading down, but ONLY when
         it sits >40px in (real section padding). A project card's title is
         ~30px below its own top, and cropping there sliced through the
         "WORK SYSTEMS - 2026" label above it. */
  function focusRect(t) {
    var r = t.getBoundingClientRect();
    var box = { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    var a = spotAnchor(t);
    if (a) {
      var ar = a.getBoundingClientRect();
      if (ar.height > r.height * 0.6) return { top: ar.top, bottom: ar.bottom, left: ar.left, right: ar.right };
      if (ar.top - r.top > 40) box.top = ar.top - 10;
    }
    return box;
  }
  function desiredY(t) {
    var fr = focusRect(t);
    var vh = window.innerHeight, pad = navHeight() + 16;
    var docTop = fr.top + window.pageYOffset, h = fr.bottom - fr.top;
    return Math.max(0, Math.round(h <= vh - pad - 40
      ? docTop - pad - Math.max(0, (vh - pad - h) / 2)   // fits: centre it
      : docTop - pad));                                  // taller: pin its top
  }
  /* Anchors let the tour tell a LAYOUT SHIFT (a section above expanded) from
     the visitor scrolling on purpose: same scrollY but a moved target means
     the page grew under us, so we re-aim; a changed scrollY is the visitor's
     choice and we simply re-baseline instead of fighting them. */
  var anchor = null, holdUntil = 0;
  function placeStop(st, smooth) {
    var t = targetOf(st);
    if (!t || st.noscroll) { anchor = null; return; }
    var glide = smooth && !reduced;
    window.scrollTo({ top: desiredY(t), behavior: glide ? "smooth" : "auto" });
    holdUntil = performance.now() + (glide ? 950 : 280);
    // Verify the LANDING, not just later drift: the page can grow while the
    // glide is in flight (a toolbox tray opened at the previous stop left
    // contact 665px short), and a drift anchor taken after that would happily
    // baseline the wrong position.
    [glide ? 900 : 240, glide ? 1500 : 600].forEach(function (ms) {
      setTimeout(function () {
        if (!active || active.stops[active.idx] !== st) return;
        var tt = targetOf(st);
        if (!tt) return;
        var want = desiredY(tt);
        if (Math.abs(window.pageYOffset - want) > 40) window.scrollTo({ top: want, behavior: "auto" });
        anchor = { st: st, docTop: tt.getBoundingClientRect().top + window.pageYOffset, scrollY: window.pageYOffset };
      }, ms);
    });
  }
  function trackDrift() {
    if (!anchor || !active || anchor.st !== active.stops[active.idx]) return;
    if (performance.now() < holdUntil) return;
    var t = targetOf(anchor.st);
    if (!t) return;
    var docTop = t.getBoundingClientRect().top + window.pageYOffset;
    if (Math.abs(window.pageYOffset - anchor.scrollY) > 6) {   // visitor scrolled
      anchor.scrollY = window.pageYOffset;
      anchor.docTop = docTop;
      return;
    }
    if (Math.abs(docTop - anchor.docTop) > 24) placeStop(anchor.st, false);  // layout moved
  }
  function go(i) {
    if (!active) return;
    active.idx = Math.max(0, Math.min(active.stops.length - 1, i));
    var st = active.stops[active.idx];
    if (st.act) { try { st.act(); } catch (e) {} }     // Suu opens what she introduces
    renderBubble();
    var mine = function () { return active && active.stops[active.idx] === st; };
    // let anything she just opened lay itself out before we measure the scroll
    setTimeout(function () {
      if (!mine()) return;
      placeStop(st, true);
    }, st.act ? 110 : 0);
    armAuto(st.dwell || 8000);
  }
  function manualGo(i) { stopAutoTimer(); go(i); }

  function stopAutoTimer() { clearTimeout(autoTimer); autoTimer = null; }
  function armAuto(ms) {
    stopAutoTimer();
    if (!active || !active.auto || hoverPause) return;
    if (active.idx >= active.stops.length - 1) return;   // rest at the last stop
    autoTimer = setTimeout(function () { if (active) go(active.idx + 1); }, ms);
  }

  function frame() {
    if (!active) return;
    if (blocked()) { end(); return; }
    trackDrift();          // the spotlight is tied to the element, so is the scroll
    var vw = window.innerWidth, vh = window.innerHeight;

    // spotlight follows the current stop (clamped into the viewport so very
    // tall sections still show a visible ring)
    var t = targetOf(active.stops[active.idx]);
    if (t) {
      var fr = focusRect(t);
      // never let the ring slide under the fixed nav - unless the target IS
      // in the nav (the valley-map and lantern buttons live there)
      var inNav = !!(t.closest && t.closest(".nav"));
      var minTop = inNav ? 6 : navHeight() + 10;
      var top = Math.max(fr.top - 12, minTop);
      var bottom = Math.min(fr.bottom + 12, vh - 8);
      dim.style.left = Math.max(fr.left - 12, 6) + "px";
      dim.style.top = top + "px";
      dim.style.width = Math.min((fr.right - fr.left) + 24, vw - 12) + "px";
      dim.style.height = Math.max(bottom - top, 40) + "px";
      dim.style.opacity = "1";
    } else {
      dim.style.opacity = "0";
    }

    // Suu walks the bottom edge: her position doubles as a progress bar
    if (suu) {
      var n = active.stops.length;
      var tx = vw * (0.06 + 0.84 * (n > 1 ? active.idx / (n - 1) : 0));
      var d = tx - suuX;
      suuX = reduced ? tx : suuX + d * 0.06;
      if (Math.abs(d) > 4) faceRight = d > 0;
      var bob = reduced ? 0 : Math.abs(Math.sin(performance.now() / 130)) * Math.min(Math.abs(d) / 6, 1) * 5;
      suu.style.transform = "translate(" + (suuX - 26) + "px," + (-bob).toFixed(1) + "px) scaleX(" + (faceRight ? 1 : -1) + ")";
      // the bubble rides just above Suu, clamped to the viewport
      var bw = bubble.offsetWidth || 320;
      bubble.style.left = Math.max(12, Math.min(suuX - 38, vw - bw - 12)) + "px";
    }
    rafId = requestAnimationFrame(frame);
  }

  /* ---------- keyboard ---------- */
  function onKey(ev) {
    if (!active) return;
    var tag = (document.activeElement || {}).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" ||
        (document.activeElement && document.activeElement.isContentEditable)) return;
    if (ev.key === "Escape") { end(); return; }
    if (ev.key === "ArrowRight" || ev.key === "Enter") {
      if (ev.target && ev.target.closest && ev.target.closest(".tour-bubble") && ev.key === "Enter") return;
      ev.preventDefault(); manualGo(active.idx + 1);
    } else if (ev.key === "ArrowLeft") {
      ev.preventDefault(); manualGo(active.idx - 1);
    }
  }

  /* ---------- lifecycle ---------- */
  function start(mode) {
    end();
    closeOffer();
    if (blocked()) {
      if (window.PORTFOLIO_APP) window.PORTFOLIO_APP.toast("Finish editing first - then take the tour.");
      return;
    }
    // `keep` stops are hidden until Suu's own action reveals them
    var stops = (SCRIPTS[mode] || []).filter(function (s) { return s.keep || visible(s); });
    if (!stops.length) return;
    active = { mode: mode, stops: stops, idx: 0, auto: mode === "hurry" };
    hoverPause = false;
    buildEls();
    document.addEventListener("keydown", onKey, true);
    go(0);
    frame();
  }
  function end() {
    if (!active) { closeOffer(); return; }
    active = null;
    anchor = null;
    stopAutoTimer();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    document.removeEventListener("keydown", onKey, true);
    removeEls();
  }

  /* ---------- the chooser: how much time do you have? ---------- */
  function closeOffer() { if (chooseEl) { chooseEl.remove(); chooseEl = null; } }
  function offer() {
    if (active) { end(); return; }
    if (blocked()) return;
    if (chooseEl) { closeOffer(); return; }
    chooseEl = el("div", "tour-bubble tour-choose" + (coarse() ? " dock" : ""));
    chooseEl.setAttribute("role", "dialog");
    chooseEl.setAttribute("aria-label", "Choose a tour");
    var x = el("button", "tour-x", "✕");
    x.addEventListener("click", closeOffer);
    chooseEl.appendChild(x);
    var say = el("p", "tour-say");
    var face = el("span", "tour-face");
    face.innerHTML = suuSVG();
    say.appendChild(face);
    say.appendChild(document.createTextNode("Hello! I'm Suu, the valley spirit. How much time do you have?"));
    chooseEl.appendChild(say);
    var ctl = el("div", "tour-ctl");
    var b1 = el("button", "chip tour-next", "▶ the 60-second pitch");
    b1.addEventListener("click", function () { start("hurry"); });
    var b2 = el("button", "chip", "walk me through everything");
    b2.addEventListener("click", function () { start("full"); });
    ctl.appendChild(b1); ctl.appendChild(b2);
    chooseEl.appendChild(ctl);
    document.body.appendChild(chooseEl);
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("btn-tour");
    if (btn) btn.addEventListener("click", offer);
    // clicking valley-Suu offers the tour too (she hops as well - that's fine)
    var sprite = document.getElementById("sprite");
    if (sprite) sprite.addEventListener("click", offer);
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && chooseEl) closeOffer();
    });
  });

  window.PORTFOLIO_TOUR = {
    start: start, end: end, offer: offer,
    state: function () { return active ? { mode: active.mode, idx: active.idx, stops: active.stops.length } : null; }
  };
})();
