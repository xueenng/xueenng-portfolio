/* ============================================================
   origami.js - the paper crane that opens and closes the deck.

   OVERTURE (slide 1, ~5.7s): a sealed yellow envelope waits alone,
   reclined on the valley floor. A crisp vector paper crane (warm
   painted origami, side profile) flies in from the upper right with
   Suu on its back, drawing a dashed airmail route and dragging a
   painted shadow across the valley. It flares, lands on the envelope,
   then the crane fades as a sheet grows into the title panel. The name
   writes itself, the seal drops, the postmark thunks, and Suu leaps
   into the HUD road.

   FINALE (closing slide, ~2.9s): Suu leaps back up, a ghost sheet
   lifts OFF the letter, folds up into the crane, and perches above it,
   the wing easing to a slow breath. The letter is never covered - the
   audience keeps reading the email address.

   Flight is driven by getPointAtLength() on the real <path>, so the
   crane and its route stay in lockstep on every browser and the bank
   angle comes from the actual tangent. No animation library; every
   effect is transform/opacity. prefers-reduced-motion skips it all.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVG_NS = "http://www.w3.org/2000/svg";

  var timers = [], raf = 0, layer = null, cleanup = null, running = false;
  /* only the overture is skippable. The finale ENDS in a resting state (the
     crane perched, breathing forever), so leaving skip() armed there would let
     it swallow the first press of the key that walks off the closing slide. */
  var skippable = false;
  /* the finale leaves the perched crane in place so flyOff() can fold the letter
     into it and fly it away on "Back to the site" */
  var perched = null;

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }
  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function box(n) { return n.getBoundingClientRect(); }
  function mid(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function reflow(n) { void n.offsetWidth; }
  function suuSVG() {
    var App = window.PORTFOLIO_APP;
    return App && App.suuSprite ? App.suuSprite() : "";
  }

  /* ---------- painted pieces ---------- */
  var INK = "#5d4a33";

  /* The crane is the detailed reference origami crane (also assets/origami-crane.svg),
     split into wingL/wingR/body groups so the wings flap - origami.js rotates those
     groups in flight. Inlined (not <img>) so the groups are live in the DOM. CSS
     warm-tints it and mirrors it to face LEFT (.og-crane-svg). */
  var CRANE_SVG = '<svg class="og-crane-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1752 1334" style="display:block;overflow:visible;"> <defs> <linearGradient id="lgWingBig" x1="1842.8571" y1="283.00073" x2="1399.8188" y2="1200.932" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fefbef"></stop><stop offset="0.81" stop-color="#fdf9e6"></stop><stop offset="0.9" stop-color="#faf0c9"></stop><stop offset="0.95" stop-color="#f9ecbb"></stop><stop offset="1" stop-color="#f8e8ac"></stop></linearGradient> <linearGradient id="lgWingShade" x1="1845" y1="284" x2="873.3" y2="611" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fefbed"></stop><stop offset="0.87" stop-color="#fcf6de"></stop><stop offset="0.9" stop-color="#fffefa"></stop><stop offset="1" stop-color="#fffffc"></stop></linearGradient> <linearGradient id="lgHead" x1="1043.9286" y1="838.07141" x2="934.28571" y2="869.5" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fffefa"></stop><stop offset="1" stop-color="#fefcf2"></stop></linearGradient> <linearGradient id="lgNeck" x1="1206.1221" y1="1018.2995" x2="1175.8175" y2="1031.5632" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#faefc6"></stop><stop offset="1" stop-color="#f8e7a9"></stop></linearGradient> <linearGradient id="lgSpike" x1="381.83765" y1="221.42096" x2="739.43164" y2="882.06073" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fdfaec"></stop><stop offset="1" stop-color="#fefcf3"></stop></linearGradient> <linearGradient id="lgTailR1" x1="1212.1831" y1="1421.4822" x2="1563.7162" y2="985.09625" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f7e7a7"></stop><stop offset="1" stop-color="#f8e7a9"></stop></linearGradient> <linearGradient id="lgTailR2" x1="1539.0962" y1="994.18762" x2="1797.0613" y2="948.91382" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f8e7a9"></stop><stop offset="0.098" stop-color="#fcf6de"></stop><stop offset="1" stop-color="#fdfaec"></stop></linearGradient> <linearGradient id="lgTailR3" x1="1615" y1="1035.5714" x2="1685" y2="962" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f8e8ab"></stop><stop offset="0.29" stop-color="#fcf7df"></stop><stop offset="1" stop-color="#fefbf0"></stop></linearGradient> <linearGradient id="lgBodyR" x1="1525.7142" y1="962" x2="1189.9999" y2="1024.8572" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fffffd"></stop><stop offset="0.913" stop-color="#fefaec"></stop><stop offset="1" stop-color="#f8e8ac"></stop></linearGradient> <linearGradient id="lgBodyRsh" x1="1313.1616" y1="1402.3938" x2="1213.894" y2="1371.7872" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fefdf7"></stop><stop offset="0.858" stop-color="#fefbee"></stop><stop offset="1" stop-color="#f8e8ab"></stop></linearGradient> <linearGradient id="lgTail" x1="1043.2142" y1="1355.2144" x2="1187.1429" y2="1388.0715" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fefdf5"></stop><stop offset="0.922" stop-color="#fefdf7"></stop><stop offset="1" stop-color="#f9eab4"></stop></linearGradient> <linearGradient id="lgTailsh" x1="1119.9857" y1="1483.6016" x2="1195.7109" y2="1254.7313" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fefdf5"></stop><stop offset="0.619" stop-color="#fefdf7"></stop><stop offset="1" stop-color="#f9eab4"></stop></linearGradient> <linearGradient id="lgBellyU" x1="1058.6399" y1="850.74597" x2="904.08649" y2="1033.5835" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fffffd"></stop><stop offset="0.9" stop-color="#fdf9e7"></stop><stop offset="1" stop-color="#f9edbd"></stop></linearGradient> <linearGradient id="lgBellyL" x1="1078.8429" y1="859.83734" x2="916.20831" y2="1037.6241" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fffffd"></stop><stop offset="0.9" stop-color="#fdf9e7"></stop><stop offset="1" stop-color="#f9edbd"></stop></linearGradient> <linearGradient id="lgWingLbig" x1="28.462877" y1="1002.3038" x2="1004.0916" y2="1146.7206" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fefcf3"></stop><stop offset="0.55" stop-color="#fdfaeb"></stop><stop offset="1" stop-color="#fcf5db"></stop></linearGradient> <linearGradient id="lgWingLshade" x1="887.96283" y1="1476.7208" x2="999.30591" y2="1149.7089" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fdf7e1"></stop><stop offset="0.65" stop-color="#fdfaea"></stop><stop offset="1" stop-color="#fefcf2"></stop></linearGradient> </defs> <g transform="translate(-121.486,-142.52737)"> <g data-role="wingR" class="og-wingR" ref="{{ setWingR }}"> <path fill="url(#lgWingBig)" stroke="#000" stroke-width="3" d="M 1870.8025,257.78645 L 1024.2947,653.76624 L 928.83526,860.34243 L 1280.5738,1200.432 L 1531.1534,1049.0332 L 1870.8025,257.78645 z"></path> <path fill="url(#lgWingShade)" d="M 1866.9035,261.91394 L 1026.5321,655.25794 L 929.99572,861.146 L 954.95023,884.39012 L 1083.5655,896.11639 L 1236.1532,930.46177 L 1866.9035,261.91394 z"></path> </g> <g ref="{{ setBody }}"> <path fill="url(#lgHead)" stroke="#000" stroke-width="4" d="M 929.01785,861.73214 L 926.96428,886.82143 L 1079.4527,829.97451 L 929.01785,861.73214 z"></path> <path fill="url(#lgSpike)" stroke="#000" stroke-width="3" d="M 340.9244,144.02737 L 728.85858,1024.4931 L 887.69971,1032.8368 L 340.9244,144.02737 z"></path> <path fill="url(#lgNeck)" stroke="#000" stroke-width="3" d="M 1078.8546,828.25898 L 1289.9648,1149.7511 L 1132.381,1208.34 L 1078.8546,828.25898 z"></path> <path fill="url(#lgTailR1)" stroke="#000" stroke-width="3" d="M 1220.7143,1442 L 1584.1334,1013.3358 L 1539.4725,957.56962 L 1178.3429,1400.774 L 1220.7143,1442 z"></path> <path fill="url(#lgTailR3)" stroke="#000" stroke-width="4" d="M 1804.8901,1221.7245 L 1631.9014,959.33738 L 1519.9098,944.03716 L 1511.2392,972.70226 L 1804.8901,1221.7245 z"></path> <path fill="url(#lgTailR2)" stroke="#000" stroke-width="3" d="M 1804.6016,1221.9866 L 1522.4236,988.35193 L 1546.6971,962.54381 L 1553.8482,966.84572 L 1804.6016,1221.9866 z"></path> <path fill="url(#lgBodyR)" stroke="#000" stroke-width="3" d="M 1164.2857,1473.4286 L 1552.8571,966.28572 L 1518.5714,943.42858 L 1075.7143,1226.2857 L 1164.2857,1473.4286 z"></path> <path fill="url(#lgBodyRsh)" opacity="0.6" d="M 1163.4015,1471.7875 L 1550.3314,966.53863 L 1518.4448,945.70179 L 1237.301,1294.7709 L 1163.4015,1471.7875 z"></path> <path fill="url(#lgTail)" stroke="#000" stroke-width="3" d="M 1163.0644,1472.8737 L 1011.1627,1267.939 L 1188.2376,1283.0499 L 1205.565,1298.058 L 1163.0644,1472.8737 z"></path> <path fill="url(#lgTailsh)" opacity="0.5" d="M 1183.2375,1352.7904 L 1011.163,1267.9389 L 1188.2379,1283.0498 L 1204.0501,1295.7454 L 1183.2375,1352.7904 z"></path> <path fill="url(#lgBellyU)" stroke="#000" stroke-width="3" d="M 773.77685,936.60896 L 1079.1108,829.77263 L 1205.2682,1295.7852 L 1160.6514,1293.2918 L 773.77685,936.60896 z"></path> <path fill="url(#lgBellyL)" stroke="#000" stroke-width="3" d="M 1024.0939,1215.7719 L 1078.8431,828.87957 L 1205.2684,1295.785 L 1160.6516,1293.2916 L 1024.0939,1215.7719 z"></path> </g> <g data-role="wingL" class="og-wingL" ref="{{ setWingL }}"> <path fill="url(#lgWingLbig)" stroke="#000" stroke-width="3" d="M 797.01035,928.4015 L 619.72857,878.14642 L 122.98606,1123.3609 L 1098.2883,1328.4218 L 1204.1649,1296.9177 L 1007.3745,1143.3115 L 797.01035,928.4015 z"></path> <path fill="url(#lgWingLshade)" stroke="#000" stroke-width="3" d="M 122.986,1123.3609 L 1098.2883,1328.4218 L 1203.8491,1296.8546 L 1007.3744,1143.3115 L 122.986,1123.3609 z"></path> </g> </g> </svg>';
  function craneSVG() { return CRANE_SVG; }

  /* the plain yellow letter cover: gold body, closed flap, one stamp corner */
  function envelopeSVG() {
    return '<svg viewBox="0 0 300 200" aria-hidden="true">' +
      '<ellipse cx="150" cy="196" rx="118" ry="9" fill="rgba(60,50,30,.18)"/>' +
      '<rect x="8" y="26" width="284" height="164" rx="9" fill="#f0b53a" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M8 34 L150 128 L292 34" fill="#e3a621" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M8 186 L112 108 M292 186 L188 108" stroke="' + INK + '" stroke-width="2" opacity=".35" fill="none"/>' +
      '<rect x="228" y="42" width="42" height="50" rx="3" fill="#fdf3d8" stroke="' + INK + '" stroke-width="2" stroke-dasharray="5 4"/>' +
      '<text x="249" y="74" text-anchor="middle" font-size="19" font-weight="700" fill="' + INK + '" font-family="Georgia, serif">XE</text>' +
      '<circle cx="150" cy="126" r="13" fill="#c0552f" stroke="#8d3a1d" stroke-width="2"/>' +
      '</svg>';
  }

  /* ---------- the flight path ----------
     Built from the live viewport so the crane always lands on the envelope:
     enters top right, one long descending sweep, dives into a landing flare,
     then rises onto the flap - always travelling leftward, never backwards
     (a crane drawn facing left that flew right would read as flying blind). */
  function flightPath(cx, cy) {
    var W = window.innerWidth, H = window.innerHeight;
    var k = Math.min(1, W / 980);
    function n(v) { return Math.round(v * 10) / 10; }
    return "M " + n(W + 140) + " " + n(H * 0.10) +
      " C " + n(W * 0.86) + " " + n(H * 0.03) +
      ", " + n(cx + 520 * k) + " " + n(H * 0.30) +
      ", " + n(cx + 330 * k) + " " + n(cy - 40) +
      " C " + n(cx + 250 * k) + " " + n(cy + 30) +
      ", " + n(cx + 230 * k) + " " + n(cy + 150 * k) +
      ", " + n(cx + 120 * k) + " " + n(cy + 118 * k) +
      " C " + n(cx + 52 * k) + " " + n(cy + 96 * k) +
      ", " + n(cx + 34 * k) + " " + n(cy + 10) +
      ", " + n(cx) + " " + n(cy - 30);
  }

  /* ---------- scaffolding ---------- */
  function makeLayer() {
    var l = el("div", "og-layer");
    l.setAttribute("aria-hidden", "true");
    document.getElementById("present").appendChild(l);
    return l;
  }

  function hudParts() {
    var road = document.querySelector("#present .pr-road");
    return {
      suu: road ? road.querySelector(".pr-suu") : null,
      dot: road ? road.querySelector(".pr-dot") : null
    };
  }

  /* Suu, as two nested nodes: the outer carries X at a constant rate, the inner
     carries Y over an arc. That split is what makes a jump read as a jump
     instead of a straight diagonal slide. */
  function makeSuu(px) {
    var outer = el("span", "og-suu");
    var inner = el("span", "og-suu-y");
    inner.innerHTML = suuSVG();
    outer.appendChild(inner);
    outer.style.setProperty("--og-w", px + "px");
    return outer;
  }
  function placeSuu(node, p) {
    node.style.left = p.x + "px";
    node.style.top = p.y + "px";
  }
  function leap(node, from, to, ms, up) {
    var dx = to.x - from.x, dy = to.y - from.y;
    placeSuu(node, from);
    node.style.setProperty("--og-dx", dx + "px");
    node.style.setProperty("--og-dy", dy + "px");
    node.style.setProperty("--og-apex", (Math.min(0, dy) - up) + "px");
    node.style.setProperty("--og-ms", ms + "ms");
    node.classList.remove("leaping");
    reflow(node);
    node.classList.add("leaping");
  }

  function stop() {
    timers.forEach(clearTimeout);
    timers = [];
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (cleanup) { var c = cleanup; cleanup = null; c(); }
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    layer = null;
    running = false;
    skippable = false;
  }

  /* ============================================================
     OVERTURE
     ============================================================ */
  function overture(stage, done) {
    var panel = stage.querySelector(".ps-panel");
    if (reduced || !panel) { if (done) done(); return; }
    stop();
    running = true;
    skippable = true;

    var pr = box(panel);
    var pc = mid(pr);
    var hud = hudParts();

    layer = makeLayer();
    panel.classList.add("og-wait");
    document.body.classList.add("og-playing");

    /* one exit for both the natural end and an impatient presenter: the panel
       renders at full strength by default, so dropping og-wait IS the finished
       state - no half-folded frame can survive a skip */
    cleanup = function () {
      panel.classList.remove("og-wait");
      document.body.classList.remove("og-playing");
      if (done) done();
    };

    /* --- the airmail route --- */
    var d = flightPath(pc.x, pc.y);
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "og-trail");
    svg.setAttribute("viewBox", "0 0 " + window.innerWidth + " " + window.innerHeight);
    /* the visible line is permanently dashed (airmail), so the "drawing on"
       effect rides a mask instead of the line's own dash pattern */
    var defs = document.createElementNS(SVG_NS, "defs");
    var mask = document.createElementNS(SVG_NS, "mask");
    mask.setAttribute("id", "og-trail-mask");
    var reveal = document.createElementNS(SVG_NS, "path");
    reveal.setAttribute("d", d);
    reveal.setAttribute("fill", "none");
    reveal.setAttribute("stroke", "#fff");
    reveal.setAttribute("stroke-width", "16");
    mask.appendChild(reveal);
    defs.appendChild(mask);
    svg.appendChild(defs);
    var line = document.createElementNS(SVG_NS, "path");
    line.setAttribute("d", d);
    line.setAttribute("class", "og-trail-line");
    line.setAttribute("mask", "url(#og-trail-mask)");
    svg.appendChild(line);
    layer.appendChild(svg);

    var len = reveal.getTotalLength();
    reveal.style.strokeDasharray = len + " " + len;
    reveal.style.strokeDashoffset = len;

    /* --- envelope, shadow, crane --- */
    var env = el("div", "og-envelope");
    env.innerHTML = envelopeSVG();
    env.style.left = pc.x + "px";
    env.style.top = pc.y + "px";
    layer.appendChild(env);

    var shadow = el("div", "og-shadow");
    layer.appendChild(shadow);

    var flier = el("div", "og-flier og-crane");
    flier.innerHTML = craneSVG();
    var wingL = flier.querySelector(".og-wingL"), wingR = flier.querySelector(".og-wingR");
    var rider = makeSuu(52);
    rider.className = "og-suu og-rider";
    flier.appendChild(rider);
    layer.appendChild(flier);
    flier.style.opacity = "0";     // hidden until the flight positions it (no corner flash)

    /* --- 0.0s: the envelope arrives alone --- */
    at(30, function () { env.classList.add("in"); });

    /* --- 0.6s -> 3.0s: the flight; the wings flap by rotating the wingL/wingR
       groups at their hinges (the crane's own fold points), strong on entry and
       easing to a rest as it flares to land --- */
    var FLY = 2400, t0 = 0;
    function flap(now, p) {
      var amp = 3 + 14 * (1 - Math.pow(p, 1.4));     // beats hard in flight, calms on approach
      var wig = amp * Math.sin((now - t0) / 1000 * Math.PI * 2 * 2.1);
      if (wingL) wingL.setAttribute("transform", "rotate(" + (-wig).toFixed(2) + " 900 1050)");
      if (wingR) wingR.setAttribute("transform", "rotate(" + wig.toFixed(2) + " 1130 850)");
    }
    at(600, function () {
      t0 = performance.now();
      raf = requestAnimationFrame(step);
    });

    function step(now) {
      var t = Math.min(1, (now - t0) / FLY);
      var p = 1 - Math.pow(1 - t, 3);                 // fast in, settles slow
      var here = reveal.getPointAtLength(p * len);
      var a = reveal.getPointAtLength(Math.min(len, p * len + 6));
      var b = reveal.getPointAtLength(Math.max(0, p * len - 6));
      var ang = Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI + 180;
      if (ang > 180) ang -= 360;
      var s = 0.3 + 0.7 * Math.pow(p, 0.8);

      /* the trailing translate(-50%,-50%) is applied FIRST, so the crane rotates
         and scales about its own centre rather than its top-left corner */
      flier.style.transform = "translate(" + here.x.toFixed(1) + "px," + here.y.toFixed(1) + "px) rotate(" +
        (ang * 0.75).toFixed(2) + "deg) scale(" + s.toFixed(3) + ") translate(-50%,-50%)";
      if (flier.style.opacity !== "1") flier.style.opacity = "1";   // reveal once positioned
      reveal.style.strokeDashoffset = (len * (1 - p)).toFixed(1);

      var near = Math.pow(p, 1.6);
      shadow.style.transform = "translate(" + here.x.toFixed(1) + "px," + (pc.y + 96) +
        "px) scale(" + (1.9 - 1.0 * near).toFixed(3) + "," + (0.7 + 0.3 * near).toFixed(3) +
        ") translate(-50%,-50%)";
      shadow.style.opacity = (0.08 + 0.24 * near).toFixed(3);
      flap(now, p);

      if (t < 1) raf = requestAnimationFrame(step);
      else { raf = 0; land(); }
    }

    function land() {
      env.classList.add("bump");
      shadow.style.transition = "opacity .35s ease";    // shadow clears BEFORE the unwrap
      shadow.style.opacity = "0";
      if (wingL) wingL.setAttribute("transform", "rotate(0 900 1050)");   // wings settle
      if (wingR) wingR.setAttribute("transform", "rotate(0 1130 850)");
      svg.classList.add("fade");
      for (var i = 0; i < 3; i++) {
        var mote = el("span", "og-mote");
        mote.style.left = (pc.x - 26 + i * 24) + "px";
        mote.style.top = (pc.y - 26) + "px";
        mote.style.animationDelay = (i * 90) + "ms";
        layer.appendChild(mote);
      }
    }

    var sheet = el("div", "og-sheet");
    var creases = el("span", "og-creases");
    sheet.appendChild(creases);
    layer.appendChild(sheet);

    /* --- 3.70s: the crane fades as the sheet takes over and grows into the panel
       (a raster crane can't literally fold, so this is a crossfade unfold) --- */
    at(3700, function () {
      /* Re-measure here rather than reusing the t=0 rect: a late webfont can
         reflow the panel's height in the seconds while the crane is still in
         the air, and the sheet has to land on the panel's ACTUAL box. */
      var pnl = box(panel);
      sheet.style.left = pnl.left + "px";
      sheet.style.top = pnl.top + "px";
      sheet.style.width = pnl.width + "px";
      sheet.style.height = pnl.height + "px";

      /* FLIP: the sheet sits at the panel's rect, so we only transform it back
         onto the landed crane and then release it. The inline transform must be
         CLEARED to animate home - an inline style outranks any class rule, so
         a `.grow { transform: none }` would never win. */
      var cb = box(flier), cm = mid(cb);
      var s = Math.max(0.05, cb.width / Math.max(1, pnl.width));
      sheet.style.transform = "translate(" + (cm.x - (pnl.left + pnl.width / 2)).toFixed(1) + "px," +
        (cm.y - (pnl.top + pnl.height / 2)).toFixed(1) + "px) scale(" + s.toFixed(4) + ") rotateX(-38deg)";
      sheet.classList.add("in");
      reflow(sheet);
      sheet.classList.add("grow");
      requestAnimationFrame(function () { sheet.style.transform = ""; });

      flier.classList.add("gone");

      /* Suu steps off the crane and rides the growing sheet down to its edge */
      var rb = mid(box(rider));
      flier.removeChild(rider);
      rider.className = "og-suu og-free";
      rider.style.setProperty("--og-w", "40px");
      placeSuu(rider, rb);
      layer.appendChild(rider);
      reflow(rider);
      rider.classList.add("riding");
      placeSuu(rider, { x: pnl.left + pnl.width * 0.26, y: pnl.top + pnl.height - 24 });
    });

    at(3900, function () { creases.classList.add("fade"); });

    /* --- 4.25s: the sheet hands over to the real letter --- */
    at(4250, function () {
      panel.classList.remove("og-wait");
      panel.classList.add("og-seq");
      sheet.classList.add("out");
    });

    /* --- 5.10s: Suu leaps down to the road --- */
    at(5100, function () {
      if (!hud.suu) return;
      rider.classList.remove("riding");
      leap(rider, mid(box(rider)), mid(box(hud.suu)), 620, 104);
    });

    at(5700, function () {
      document.body.classList.remove("og-playing");     // the real Suu takes over
      if (hud.dot) {
        hud.dot.classList.remove("og-pop");
        reflow(hud.dot);
        hud.dot.classList.add("og-pop");
      }
      if (hud.suu) {
        var t = box(hud.suu);
        var dust = el("span", "og-dust");
        dust.style.left = (t.left + t.width / 2) + "px";
        dust.style.top = (t.top + t.height - 2) + "px";
        layer.appendChild(dust);
      }
      rider.classList.add("gone");
      at(420, function () { cleanup = null; stop(); if (done) done(); });
    });
  }

  /* ============================================================
     FINALE - reaching the closing slide, the crane simply FADES IN perched at
     the letter's BOTTOM-RIGHT corner, Suu leaping up from the road onto its
     back (same seat as the overture). No paper sheet at all. The real letter
     stays readable. "Back to the site" then runs flyOff().
     ============================================================ */
  function finale(stage) {
    var card = stage.querySelector(".contact-card, .ps-letter");
    if (reduced || !card) return;
    stop();
    running = true;

    var cr = box(card);
    var hud = hudParts();
    // perch right at the letter's bottom-right corner - a bird landed on the edge
    var perch = { x: cr.left + cr.width * 0.93, y: cr.top + cr.height * 0.92 };

    layer = makeLayer();
    document.body.classList.add("og-playing");
    cleanup = function () { document.body.classList.remove("og-playing"); };

    var rider = makeSuu(40);
    rider.className = "og-suu og-free";
    layer.appendChild(rider);

    var flier = el("div", "og-flier og-crane og-perch");
    flier.innerHTML = craneSVG();
    flier.style.transform = "translate(" + perch.x + "px," + perch.y + "px) scale(1) rotate(45deg) translate(-50%,-50%)";
    layer.appendChild(flier);

    /* --- 0.0s: Suu leaps up from the road toward the perch --- */
    if (hud.suu) {
      leap(rider, mid(box(hud.suu)), { x: perch.x, y: perch.y - 6 }, 660, 130);
    }

    /* --- 0.26s: the crane fades in at the corner (no sheet) --- */
    at(260, function () { flier.classList.add("in"); });

    /* --- 0.72s: the crane settles; Suu climbs onto its back and rides it --- */
    at(720, function () {
      flier.classList.add("settle");
      reflow(flier);
      flier.style.transform = "translate(" + perch.x + "px," + (perch.y - 6) + "px) scale(1) rotate(45deg) translate(-50%,-50%)";
      /* re-parent Suu onto the crane: as an og-rider child it sits on the back
         (like page 1) and travels with the crane when it flies off */
      rider.className = "og-suu og-rider";
      rider.style.left = ""; rider.style.top = ""; rider.style.transform = "";
      rider.style.setProperty("--og-w", "34px");
      flier.appendChild(rider);
      perched = { flier: flier, card: card };
    });
  }

  /* Back-to-the-site exit: the letter folds down into the perched crane, then
     the crane + Suu fly off-screen (head-first, up and away), then `done`. */
  function flyOff(done) {
    if (reduced || !perched || !running || !layer) { if (done) done(); return; }
    var flier = perched.flier, card = perched.card;
    skippable = false;

    /* 1. the LETTER ITSELF folds down into the crane - it shrinks toward the
       crane's corner (transform-origin matches the perch) and fades. No separate
       ghost sheet, so nothing lands on top of the crane as a pale block. */
    card.style.transformOrigin = "90% 92%";
    card.style.transition = "transform .6s cubic-bezier(.5,0,.7,.4), opacity .5s ease";
    reflow(card);
    card.style.transform = "perspective(900px) rotateX(-42deg) scale(.05)";
    card.style.opacity = "0";

    /* 2. the crane lifts off and flies away (head-first, up-left), Suu riding,
       WINGS FLAPPING. The exit still ends on a setTimeout (step 3), independent
       of this rAF, so the flap can't stall the return. */
    at(640, function () {
      var wl = flier.querySelector(".og-wingL"), wr = flier.querySelector(".og-wingR");
      var t0 = performance.now();
      raf = requestAnimationFrame(function beat(now) {
        var w = 17 * Math.sin((now - t0) / 1000 * Math.PI * 2 * 2.4);
        if (wl) wl.setAttribute("transform", "rotate(" + (-w).toFixed(2) + " 900 1050)");
        if (wr) wr.setAttribute("transform", "rotate(" + w.toFixed(2) + " 1130 850)");
        if (now - t0 < 1300 && flier.parentNode) raf = requestAnimationFrame(beat);
      });
      flier.style.transition = "transform 1.2s cubic-bezier(.45,0,.65,.45)";
      reflow(flier);
      flier.style.transform = "translate(-160px,-200px) scale(.5) rotate(-14deg) translate(-50%,-50%)";
    });

    /* 3. gone -> hand back to the site */
    at(1980, function () { perched = null; stop(); if (done) done(); });
  }

  window.PORTFOLIO_ORIGAMI = {
    overture: overture,
    finale: finale,
    flyOff: flyOff,
    stop: stop,
    /* any key, click or swipe mid-flight snaps to the finished letter */
    skip: function () {
      if (!running || !skippable) return false;
      stop();
      return true;
    },
    isPlaying: function () { return running; }
  };
})();
