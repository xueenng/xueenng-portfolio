/* ============================================================
   kellie.js - the castle after dark.
   Threshold gate (the click that legally unlocks audio), a
   fully synthesized WebAudio soundscape (wind / low drone /
   passing whispers - no audio files needed; real recordings
   can replace it later), panel reveals, the gallery of echoes,
   the 360 night tour (reuses the kellie-vr360 demo), and the
   finale, in order: words -> gameplay film -> playable mini
   escape room -> the FYP poster.

   There is deliberately no browser build. The game is a Meta
   Quest 2 / OpenXR title whose room-scale interaction does not
   survive a browser window, so the film stands in for it.
   ============================================================ */
(function () {
  "use strict";

  var VIDEO_SRC = "assets/kellie/gameplay.mp4";   // the 720p cinematic cut (v3)

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  /* ---------- synthesized soundscape ---------- */
  var actx = null, master = null, muted = false;

  function noiseBuffer(ctx, seconds) {
    var buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function startAudio() {
    if (actx) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return; }
    master = actx.createGain();
    master.gain.value = 0;
    master.connect(actx.destination);
    master.gain.linearRampToValueAtTime(1, actx.currentTime + 4);   // fade the night in

    // wind: looped noise through a slowly-breathing bandpass
    var wind = actx.createBufferSource();
    wind.buffer = noiseBuffer(actx, 3);
    wind.loop = true;
    var wbp = actx.createBiquadFilter();
    wbp.type = "bandpass"; wbp.frequency.value = 380; wbp.Q.value = 0.7;
    var wg = actx.createGain();
    wg.gain.value = 0.055;
    var lfo = actx.createOscillator();
    lfo.frequency.value = 0.06;
    var lfoAmt = actx.createGain();
    lfoAmt.gain.value = 0.035;
    lfo.connect(lfoAmt); lfoAmt.connect(wg.gain);
    wind.connect(wbp); wbp.connect(wg); wg.connect(master);
    wind.start(); lfo.start();

    // low drone: two detuned sines under a heavy lowpass
    var lp = actx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 130;
    var d1 = actx.createOscillator(); d1.frequency.value = 54;
    var d2 = actx.createOscillator(); d2.frequency.value = 56.7;
    var dg = actx.createGain(); dg.gain.value = 0.028;
    d1.connect(dg); d2.connect(dg); dg.connect(lp); lp.connect(master);
    d1.start(); d2.start();

    // whispers: soft high-passed breaths that drift across the room
    function whisper() {
      if (!actx || muted) { schedule(); return; }
      var src = actx.createBufferSource();
      src.buffer = noiseBuffer(actx, 1.6);
      var hp = actx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 1900;
      var bp = actx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 2400 + Math.random() * 1400; bp.Q.value = 2.2;
      var g = actx.createGain();
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(0.05, actx.currentTime + 0.7);
      g.gain.linearRampToValueAtTime(0, actx.currentTime + 1.55);
      var chain = g;
      if (actx.createStereoPanner) {
        var pan = actx.createStereoPanner();
        pan.pan.value = Math.random() * 1.6 - 0.8;
        g.connect(pan); chain = pan;
      }
      src.connect(hp); hp.connect(bp); bp.connect(g); chain.connect(master);
      src.start();
      schedule();
    }
    function schedule() { setTimeout(whisper, 16000 + Math.random() * 26000); }
    schedule();
  }

  function wireSound() {
    var btn = document.getElementById("k-sound");
    btn.addEventListener("click", function () {
      muted = !muted;
      btn.textContent = muted ? "🔇" : "🔊";
      if (master) master.gain.linearRampToValueAtTime(muted ? 0 : 1, actx.currentTime + 0.4);
    });
  }

  /* ---------- threshold ---------- */
  function enter(withSound) {
    var th = document.getElementById("k-threshold");
    if (!th || th.classList.contains("k-leaving")) return;
    th.classList.add("k-leaving");
    document.body.style.overflow = "";
    setTimeout(function () { th.remove(); }, 1200);
    var btn = document.getElementById("k-sound");
    btn.hidden = false;
    if (withSound) {
      startAudio();
    } else {
      muted = true;
      btn.textContent = "🔇";
    }
    if (!reduced) shadowLoop();
  }

  /* ---------- the passing shadow ---------- */
  function shadowLoop() {
    var sh = document.getElementById("k-shadow");
    function pass() {
      sh.classList.remove("k-pass");
      void sh.offsetWidth;              // restart the animation
      sh.classList.add("k-pass");
      setTimeout(pass, 42000 + Math.random() * 30000);
    }
    setTimeout(pass, 14000 + Math.random() * 10000);
  }

  /* ---------- panel reveals ---------- */
  function wireReveals() {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("k-in"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.18 });
    document.querySelectorAll(".k-panel").forEach(function (p) { obs.observe(p); });
    if (reduced) document.querySelectorAll(".k-panel").forEach(function (p) { p.classList.add("k-in"); });
  }

  /* ---------- gallery of echoes ---------- */
  var SHOTS = [
    ["assets/fyp/01-blender-castle.jpg", "the castle, modelled from scratch in Blender"],
    ["assets/fyp/02-blender-rear.jpg", "the rear wing - every balcony accounted for"],
    ["assets/fyp/03-blender-tower.jpg", "the semicircular tower, vertex by vertex"],
    ["assets/fyp/04-blender-staircase.jpg", "the winding staircase takes shape"],
    ["assets/fyp/05-start-menu.jpg", "the main menu - the castle waits"],
    ["assets/fyp/06-options.jpg", "options - tuned down to the turn mode"],
    ["assets/fyp/07-about.jpg", "about the game"],
    ["assets/fyp/08-level-select.jpg", "choosing where to be lost"],
    ["assets/fyp/09-l1-diary.jpg", "level 1 - the diary gives up its story"],
    ["assets/fyp/10-l1-quiz.jpg", "level 1 - five of five, a key appears"],
    ["assets/fyp/11-l2-find.jpg", "level 2 - verses point to the hidden pieces"],
    ["assets/fyp/12-l2-sequence.jpg", "level 2 - the order restored"],
    ["assets/fyp/13-l3-jigsaw.jpg", "level 3 - the floor plan, rebuilt against the clock"],
    ["assets/fyp/14-l3-blueprint.jpg", "level 3 - the blueprint explained"],
    ["assets/fyp/15-l3-numpad.jpg", "level 3 - the year unlocks the way"],
    ["assets/fyp/16-vr360.jpg", "and the castle itself - the 360 view"]
  ];
  /* The gallery shots are 1600px wide but a grid cell is ~262px on a phone,
     so the full-res set cost 2.4MB on load. Thumbnails live alongside in
     assets/fyp/sm/ at 800px; the lightbox still opens the full-res file. */
  function smSrc(src) { return src.replace("assets/fyp/", "assets/fyp/sm/"); }

  function isSmallScreen() {
    return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 700;
  }

  function buildGallery() {
    var g = document.getElementById("k-gallery");
    SHOTS.forEach(function (s) {
      var fig = el("figure", "k-frame");
      var mat = el("div", "k-frame-mat");
      var img = document.createElement("img");
      // a dropped request otherwise leaves a permanently blank tile
      if (window.PORTFOLIO_EXHIBITS) window.PORTFOLIO_EXHIBITS.retryOnce(img);
      img.src = smSrc(s[0]);
      img.srcset = smSrc(s[0]) + " 800w, " + s[0] + " 1600w";
      /* Deliberately declared BELOW the rendered width. srcset picks by device
         pixels, so on a DPR-3 phone an honest 75vw (~292px) asks for 877px and
         jumps to the 1600w original - which is how all 16 full-res shots were
         still being fetched. 260px keeps the 800w copy, which still lands at
         3.3x the 244px render on a 360 screen. Full-res is one tap away. */
      img.sizes = "(max-width: 700px) 260px, 300px";
      img.alt = s[1]; img.loading = "lazy"; img.decoding = "async";
      mat.appendChild(img);
      fig.appendChild(mat);
      fig.appendChild(el("figcaption", null, s[1]));
      fig.addEventListener("click", function () {
        var lb = el("div", "lightbox");
        var big = document.createElement("img");
        big.src = s[0]; big.alt = s[1];
        lb.appendChild(big);
        lb.addEventListener("click", function () { lb.remove(); });
        document.body.appendChild(lb);
      });
      g.appendChild(fig);
    });
  }

  /* ---------- the night tour (reuse the painted 360) ---------- */
  function buildTour() {
    var host = document.getElementById("k-tour");
    if (!window.PORTFOLIO_DEMOS) return;
    var box = el("div", "demo");
    host.appendChild(box);
    try {
      window.PORTFOLIO_DEMOS.mountInto(box, "kellie-vr360");
    } catch (e) {
      box.appendChild(el("p", null, "The tour could not load."));
    }
  }

  /* ---------- the finale ---------- */
  function buildPlay() {
    var host = document.getElementById("k-play");

    /* 1 - words: why this one is not playable in a browser */
    var intro = el("div", "k-play-intro");
    intro.appendChild(el("h3", null, "Why this one isn't playable here"));
    intro.appendChild(el("p", null,
      "Echoes in Kellie's Castle was built for Meta Quest 2 - room-scale " +
      "teleportation, grabbable objects, haptic feedback and hand tracking through " +
      "OpenXR. Take the headset away and none of that survives; a flat browser " +
      "version would be a different, lesser game wearing this one's name."));
    intro.appendChild(el("p", null,
      "So watch it instead. The film below is the real thing, recorded in the " +
      "headset - the escape room played end to end. Under it, a browser-sized " +
      "version of the same puzzles you can play right now, and the poster this " +
      "project was presented with."));
    host.appendChild(intro);

    /* 2 - video: the gameplay film */
    if (VIDEO_SRC) {
      var vf = el("div", "k-film");
      var v = document.createElement("video");
      v.src = VIDEO_SRC; v.controls = true; v.style.width = "100%";
      v.preload = "none";                          // 24MB file - only on play
      /* the poster frame IS fetched eagerly, so it takes the 800px thumbnail
         rather than the 1600px original it renders at ~262px wide */
      v.poster = smSrc("assets/fyp/05-start-menu.jpg");
      v.playsInline = true;
      vf.appendChild(v);
      host.appendChild(vf);
    }

    /* 3 - mini game: the browser-sized escape room. Its puzzle controls are
       too small to play at phone scale, so phones get a note instead. The
       360 tour above stays - that one is drag-to-pan, which suits touch. */
    if (isSmallScreen()) {
      var ddo = el("div", "demo-desktop-only");
      ddo.appendChild(el("span", "ddo-mark", "▶"));
      var body = el("div", "ddo-body");
      body.appendChild(el("b", null, "The escape room is playable on a desktop"));
      body.appendChild(el("p", null,
        "A browser-sized version of the same puzzles runs on this page - the " +
        "diary quiz, the sequence lock, the jigsaw. Its pieces are too small to " +
        "hit accurately on a phone, so open this page on a computer to play it."));
      ddo.appendChild(body);
      host.appendChild(ddo);
    } else if (window.PORTFOLIO_DEMOS) {
      var dwrap = el("div", "k-play-demo");
      var box = el("div", "demo");
      dwrap.appendChild(box);
      host.appendChild(dwrap);
      try {
        window.PORTFOLIO_DEMOS.mountInto(box, "kellie-escape");
      } catch (e) { dwrap.remove(); }
    }

    /* 4 - poster: the FYP academic poster. 720px of body text is unreadable at
       phone width, so tapping it must open the full-size lightbox. */
    var pwrap = el("div", "k-fyp-poster");
    var pbtn = el("button", "k-poster-btn");
    pbtn.setAttribute("aria-label", "Enlarge the project poster");
    var pimg = document.createElement("img");
    pimg.src = "assets/fyp/poster.jpg";
    pimg.alt = "Echoes in Kellie's Castle - final year project poster";
    pimg.loading = "lazy";
    pbtn.appendChild(pimg);
    pwrap.appendChild(pbtn);
    pwrap.appendChild(el("p", "k-poster-cap", "The project poster - tap to enlarge."));
    host.appendChild(pwrap);
    pbtn.addEventListener("click", function () {
      window.PORTFOLIO_EXHIBITS.lightbox("assets/fyp/poster.jpg");
    });
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    document.body.style.overflow = "hidden";   // hold still at the threshold
    document.getElementById("k-enter-sound").addEventListener("click", function () { enter(true); });
    document.getElementById("k-enter-quiet").addEventListener("click", function () { enter(false); });
    wireSound();
    wireReveals();
    buildGallery();
    buildTour();
    buildPlay();
  });
})();
