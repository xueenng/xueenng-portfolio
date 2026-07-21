/* ============================================================
   world.js - the painted valley (v3 "Painted Valley" shell).
   One fixed canvas behind the whole page paints a Ghibli-
   inspired scene where SCROLLING MOVES TIME: dawn at the hero,
   noon over the work systems, golden hour over the academics,
   and night at the bottom - where Kellie's Castle appears.
   Also owns: paper-grain overlay, the sprite companion, and
   the hand-painted hero vignette. All original art, in code.
   Respects prefers-reduced-motion (static paint, no creature).
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- tiny helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function hexRgb(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }
  function mix(h1, h2, k) {
    var a = hexRgb(h1), b = hexRgb(h2);
    return "rgb(" + Math.round(lerp(a[0], b[0], k)) + "," + Math.round(lerp(a[1], b[1], k)) + "," + Math.round(lerp(a[2], b[2], k)) + ")";
  }
  function mixN(h1, h2, k) { // numeric rgb triple (for gradients built by hand)
    var a = hexRgb(h1), b = hexRgb(h2);
    return [Math.round(lerp(a[0], b[0], k)), Math.round(lerp(a[1], b[1], k)), Math.round(lerp(a[2], b[2], k))];
  }
  // seeded random so the sky is the same painting on every visit
  function makeRand(seed) {
    return function () {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  /* ---------- the day: color keyframes along scroll ---------- */
  var KEYS = [
    { t: 0.00, sky: ["#a9c0dd", "#dcc9d2", "#f7d9ba"], hills: ["#96a9be", "#7ba077", "#5c8b62"], cloud: 0.94 }, // dawn
    { t: 0.35, sky: ["#7fb5e6", "#b7daf0", "#eaf3e8"], hills: ["#9cc3e0", "#7fae6b", "#54934f"], cloud: 0.96 }, // noon
    { t: 0.62, sky: ["#8ea6cf", "#e6b98e", "#f6d89a"], hills: ["#b9a48a", "#8f9a5e", "#5f8a4d"], cloud: 0.85 }, // golden
    { t: 0.82, sky: ["#41476e", "#8a6a8e", "#e08f6a"], hills: ["#5c5a80", "#3e5060", "#2c4245"], cloud: 0.55 }, // dusk
    { t: 1.00, sky: ["#0d1424", "#1b2640", "#2c3a5c"], hills: ["#1d2940", "#151f33", "#0e1626"], cloud: 0.22 }  // night
  ];
  function sample(t) {
    t = clamp(t, 0, 1);
    var i = 0;
    while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
    var a = KEYS[i], b = KEYS[i + 1];
    var k = (t - a.t) / (b.t - a.t || 1);
    k = clamp(k, 0, 1);
    // luminance of the mid/low sky (where the copy sits) so text ink can
    // follow the actual paint instead of a hardcoded scroll window
    var m1 = mixN(a.sky[1], b.sky[1], k), m2 = mixN(a.sky[2], b.sky[2], k);
    var lum = (0.2126 * (m1[0] + m2[0]) + 0.7152 * (m1[1] + m2[1]) + 0.0722 * (m1[2] + m2[2])) / 2;
    return {
      sky: [mix(a.sky[0], b.sky[0], k), mix(a.sky[1], b.sky[1], k), mix(a.sky[2], b.sky[2], k)],
      hills: [mix(a.hills[0], b.hills[0], k), mix(a.hills[1], b.hills[1], k), mix(a.hills[2], b.hills[2], k)],
      cloud: lerp(a.cloud, b.cloud, k),
      lum: lum
    };
  }

  /* ---------- canvas + layers ---------- */
  var canvas, ctx, W = 0, H = 0, DPR = 1;
  var tCur = 0, tTarget = 0;           // time-of-day 0..1
  var scrollPar = 0;                    // scroll parallax for hills
  var rand = makeRand(20260714);

  var stars = [];
  for (var s = 0; s < 110; s++) stars.push([rand(), rand() * 0.62, 0.4 + rand() * 1.1, rand() * 6.28]);

  function makeCloudSprite(seedN, dark) {
    var r = makeRand(seedN);
    var c = document.createElement("canvas");
    c.width = 280; c.height = 130;
    var g = c.getContext("2d");
    g.fillStyle = dark ? "#3a4560" : "#ffffff";
    for (var i = 0; i < 8; i++) {
      var cx = 40 + r() * 200, cy = 55 + r() * 40, rx = 26 + r() * 46, ry = 14 + r() * 22;
      g.globalAlpha = 0.5 + r() * 0.4;
      g.beginPath();
      g.ellipse(cx, cy, rx, ry, 0, 0, 6.29);
      g.fill();
    }
    return c;
  }
  var clouds = [];
  for (var cN = 0; cN < 7; cN++) {
    clouds.push({
      lite: makeCloudSprite(100 + cN, false),
      dark: makeCloudSprite(100 + cN, true),
      x: rand(), y: 0.06 + rand() * 0.38,
      v: 0.004 + rand() * 0.012,          // viewport-widths per second
      sc: 0.55 + rand() * 1.15
    });
  }

  /* particles: one pool, leaves by day / fireflies by night (clear weather);
     re-tinted to red-gold petals in festival; the same pool rises as sky
     lanterns after dusk in festival */
  var parts = [];
  for (var pN = 0; pN < 22; pN++) {
    parts.push({ x: rand(), y: rand(), r: rand(), ph: rand() * 6.28, v: 0.35 + rand() * 0.65 });
  }

  /* rain has its own denser pool of falling streaks (kept off the shared pool
     so a downpour never thins the leaves/lanterns budget) */
  var rain = [];
  for (var rN = 0; rN < 140; rN++) {
    rain.push({ x: rand(), y: rand(), len: 9 + rand() * 15, sp: 0.55 + rand() * 0.7, w: rand() });
  }

  /* ---------- weather over the scroll-time sky ----------
     A layer ON TOP of the day: the sky/sun/moon still move with the scroll,
     weather only adds rain or festival particles + a mood wash. Mode is
     auto | clear | rain | festival; auto is deterministic from the calendar
     so every visitor sees the same valley on the same day. */
  var WMODES = ["auto", "clear", "rain", "festival"];
  var WICON = { auto: "🌦", clear: "☀", rain: "🌧", festival: "🎆" };
  var WLABEL = { auto: "automatic", clear: "clear skies", rain: "rain over the valley", festival: "festival lanterns" };
  var weatherMode = "auto", weatherActive = "clear";

  function autoWeather() {
    var d = new Date(), m = d.getMonth() + 1, day = d.getDate();
    // lunar festivals approximated by fixed Gregorian windows (no API/lookup):
    // Chinese New Year lantern season, and Mid-Autumn (lantern/mooncake).
    if ((m === 1 && day >= 22) || (m === 2 && day <= 15)) return "festival";
    if ((m === 9 && day >= 15) || (m === 10 && day <= 6)) return "festival";
    // otherwise roughly one day in four rains - seeded by the date so it is
    // stable for the whole day and identical for everyone
    var doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    var r = makeRand(d.getFullYear() * 400 + doy + 7);
    r();                       // discard the first (small-seed bias)
    return r() < 0.25 ? "rain" : "clear";
  }
  function resolveWeather() {
    weatherActive = weatherMode === "auto" ? autoWeather() : weatherMode;
    document.body.classList.toggle("weather-rain", weatherActive === "rain");
    document.body.classList.toggle("weather-festival", weatherActive === "festival");
  }
  function setWeather(mode) {
    if (WMODES.indexOf(mode) < 0) mode = "auto";
    weatherMode = mode;
    resolveWeather();
    try { localStorage.setItem("xe-weather", mode); } catch (e) {}
    var b = document.getElementById("btn-weather");
    if (b) {
      b.textContent = WICON[mode];
      b.classList.toggle("on", weatherActive !== "clear");   // glows when the sky is actually doing something
      b.setAttribute("title", "Weather: " + (mode === "auto" ? "auto (" + weatherActive + ")" : WLABEL[mode]) + " - click to change");
    }
    if (reduced) paint(performance.now());
  }
  function cycleWeather() {
    var i = WMODES.indexOf(weatherMode);
    var next = WMODES[(i + 1) % WMODES.length];
    setWeather(next);
    if (window.PORTFOLIO_APP && window.PORTFOLIO_APP.toast) {
      window.PORTFOLIO_APP.toast("Weather: " + (next === "auto" ? "automatic (" + weatherActive + " today)" : WLABEL[next]));
    }
  }
  function buildWeatherBtn() {
    var b = document.getElementById("btn-weather");
    if (b) b.addEventListener("click", cycleWeather);
    var saved = "auto";
    try { saved = localStorage.getItem("xe-weather") || "auto"; } catch (e) {}
    setWeather(saved);
  }

  /* rain: slanted streaks (skipped under reduced-motion - the grey wash alone
     becomes the "static haze") */
  function drawRain(now) {
    ctx.strokeStyle = "rgba(188,202,220,.5)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (var i = 0; i < rain.length; i++) {
      var d = rain[i];
      var yy = ((d.y + (now / 1000) * d.sp) % 1) * (H + 40) - 20;
      var xx = d.x * W + Math.sin(now / 3200 + d.w * 6.28) * 7;
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx - 3, yy + d.len);
    }
    ctx.stroke();
  }
  /* festival: a warm paper lantern rising through the dusk */
  function drawLantern(x, y, a) {
    ctx.globalAlpha = a;
    var g = ctx.createRadialGradient(x, y, 0, x, y, 15);
    g.addColorStop(0, "rgba(255,184,96,.85)");
    g.addColorStop(1, "rgba(255,150,60,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 15, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#ff7a3c";
    ctx.beginPath(); ctx.ellipse(x, y, 4.6, 6.4, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#ffe1a6";
    ctx.fillRect(x - 2, y - 1.4, 4, 3);
    ctx.globalAlpha = 1;
  }

  function drawHill(baseY, amp, phase, color, par) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    var y0 = baseY + par;
    for (var i = 0; i <= 26; i++) {
      var x = (i / 26) * W;
      var y = y0 + Math.sin(i * 0.55 + phase) * amp + Math.sin(i * 0.21 + phase * 1.7) * amp * 1.6;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  /* text sitting directly on the canvas re-inks itself as the sky darkens,
     so the journey / section copy stays readable at dusk and night even in
     the light theme (styles.css consumes these as --scene-ink*) */
  var inkLast = -1, inkK = 0;
  function syncInk(lum) {
    // ink follows the painted sky's actual luminance - immune to sections
    // being added or removed shifting where dusk lands on the page.
    // SNAP, never mix: a half-mixed grey ink always crosses the sky's own
    // luminance somewhere and vanishes into it (the blurry mid-dusk text).
    // 152 is the contrast crossover where light-ink+halo beats dark ink;
    // the CSS color/text-shadow transition turns the flip into a soft fade.
    var k = lum < 152 ? 1 : 0;
    if (k === inkLast) return;
    inkLast = k;
    var st = document.documentElement.style;
    st.setProperty("--scene-ink", mix("#191712", "#f6f1e6", k));
    st.setProperty("--scene-ink-2", mix("#5c564a", "#cdc5b6", k));
    st.setProperty("--scene-ink-3", mix("#9a9284", "#a7b0c4", k));
    st.setProperty("--scene-paper", mix("#faf7f2", "#12100d", k));
    // dark halo behind the light text - keeps it readable even when a white
    // cloud drifts behind a line. k-squared so it stays OFF while the text
    // is still dark (a glow behind dark text just reads as blur)
    st.setProperty("--scene-halo", "rgba(12,16,28," + (0.62 * k * k).toFixed(3) + ")");
    inkK = k;
    syncDisc();
  }

  function paint(now) {
    var st = sample(tCur);
    syncInk(st.lum);
    // sky
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, st.sky[0]);
    sky.addColorStop(0.55, st.sky[1]);
    sky.addColorStop(1, st.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // stars (fade in after dusk)
    var starA = clamp((tCur - 0.72) / 0.22, 0, 1);
    if (starA > 0) {
      for (var i = 0; i < stars.length; i++) {
        var stp = stars[i];
        var tw = reduced ? 1 : (0.55 + 0.45 * Math.sin(now / 750 + stp[3]));
        ctx.globalAlpha = starA * tw * 0.9;
        ctx.fillStyle = "#e8eeff";
        ctx.beginPath();
        ctx.arc(stp[0] * W, stp[1] * H, stp[2], 0, 6.29);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // sun (dawn -> dusk) and moon (night)
    if (tCur < 0.86) {
      var sunK = clamp(tCur / 0.86, 0, 1);
      var sx = W * (0.12 + sunK * 0.78);
      var sy = H * (0.58 - Math.sin(sunK * Math.PI) * 0.4);
      var warm = tCur > 0.55 ? mixN("#ffd98a", "#ff9a5c", clamp((tCur - 0.55) / 0.3, 0, 1)) : mixN("#fff3c4", "#ffd98a", clamp(tCur / 0.55, 0, 1));
      var glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, H * 0.26);
      glow.addColorStop(0, "rgba(" + warm[0] + "," + warm[1] + "," + warm[2] + ",.95)");
      glow.addColorStop(0.25, "rgba(" + warm[0] + "," + warm[1] + "," + warm[2] + ",.35)");
      glow.addColorStop(1, "rgba(" + warm[0] + "," + warm[1] + "," + warm[2] + ",0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
    }
    var moonA = clamp((tCur - 0.78) / 0.18, 0, 1);
    if (moonA > 0) {
      var mx = W * 0.78, my = H * 0.2;
      ctx.globalAlpha = moonA;
      var mglow = ctx.createRadialGradient(mx, my, 2, mx, my, H * 0.16);
      mglow.addColorStop(0, "rgba(228,234,255,.6)");
      mglow.addColorStop(1, "rgba(228,234,255,0)");
      ctx.fillStyle = mglow;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#e9edfa";
      ctx.beginPath(); ctx.arc(mx, my, 26, 0, 6.29); ctx.fill();
      ctx.fillStyle = st.sky[0];
      ctx.beginPath(); ctx.arc(mx - 10, my - 6, 22, 0, 6.29); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // clouds (rain pulls the darker sprites in even by day, and thickens them)
    var raining = weatherActive === "rain";
    for (var ci = 0; ci < clouds.length; ci++) {
      var cl = clouds[ci];
      var img = (tCur > 0.8 || raining) ? cl.dark : cl.lite;
      var cw = cl.sc * W * 0.24, ch = cw * 0.46;
      var cx = ((cl.x % 1) + 1) % 1 * (W + cw * 2) - cw;
      var cy = cl.y * H + scrollPar * (0.25 + cl.sc * 0.2) * -40;
      ctx.globalAlpha = Math.min(1, st.cloud * (0.5 + cl.sc * 0.3) * (raining ? 1.5 : 1));
      ctx.drawImage(img, cx, cy, cw, ch);
      ctx.globalAlpha = 1;
    }

    // rain mood wash: dims sky/sun/clouds toward overcast grey (this is also
    // the "static haze" reduced-motion visitors get in place of streaks)
    if (raining) {
      ctx.fillStyle = reduced ? "rgba(96,104,118,.3)" : "rgba(96,104,118,.22)";
      ctx.fillRect(0, 0, W, H);
    }

    // hills (three parallax layers)
    drawHill(H * 0.68, 9, 1.3, st.hills[0], scrollPar * -18);
    drawHill(H * 0.78, 12, 4.1, st.hills[1], scrollPar * -34);
    drawHill(H * 0.88, 14, 7.7, st.hills[2], scrollPar * -55);

    // weather particles (rain streaks always; festival & clear only in motion)
    if (raining) {
      if (!reduced) drawRain(now);
    } else if (!reduced) {
      var leafA = tCur > 0.1 && tCur < 0.6 ? 1 : 0;
      var flyA = clamp((tCur - 0.72) / 0.18, 0, 1);
      var festival = weatherActive === "festival";
      for (var pi = 0; pi < parts.length; pi++) {
        var p = parts[pi];
        if (festival && flyA > 0) { // festival dusk/night: paper lanterns rise
          var lnx = p.x * W + Math.sin(now / 2600 * p.v + p.ph) * 22;
          var lny = H - ((p.y + now / 9000 * p.v) % 1.15) * H * 0.95;
          var lnP = 0.55 + 0.45 * Math.abs(Math.sin(now / 1400 * p.v + p.ph));
          drawLantern(lnx, lny, flyA * lnP);
        } else if (flyA > 0) { // clear night: fireflies wander + pulse
          var fx = p.x * W + Math.sin(now / 1400 * p.v + p.ph) * 46;
          var fy = H * 0.45 + p.y * H * 0.5 + Math.cos(now / 1700 * p.v + p.ph) * 30;
          var pulse = 0.25 + 0.75 * Math.abs(Math.sin(now / 900 * p.v + p.ph));
          ctx.globalAlpha = flyA * pulse * 0.9;
          var fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 7);
          fg.addColorStop(0, "rgba(255,236,150,1)");
          fg.addColorStop(1, "rgba(255,236,150,0)");
          ctx.fillStyle = fg;
          ctx.beginPath(); ctx.arc(fx, fy, 7, 0, 6.29); ctx.fill();
        } else if (leafA > 0 && (festival || pi % 2 === 0)) {
          // daytime drift: green leaves in clear, red-gold petals in festival
          var ly = ((p.y + now / 22000 * p.v) % 1) * H;
          var lx = p.x * W + Math.sin(now / 1600 + p.ph) * 34;
          ctx.globalAlpha = festival ? 0.8 : 0.7;
          ctx.fillStyle = festival
            ? (pi % 3 === 0 ? "#e8b23a" : "#c94f3d")   // gold + vermilion petals
            : (tCur < 0.45 ? "#7ea45f" : "#c8973f");
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(Math.sin(now / 900 + p.ph) * 1.2);
          ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 2.6, 0, 0, 6.29); ctx.fill();
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- scroll -> time of day ---------- */
  var tHold = null;   // presentation mode pins the time of day here
  function readScroll() {
    var doc = document.documentElement;
    var max = Math.max(1, doc.scrollHeight - window.innerHeight);
    var p = clamp(window.scrollY / max, 0, 1);
    var dark = doc.getAttribute("data-theme") === "dark";
    tTarget = tHold !== null ? tHold : (dark ? 1 : p);
    scrollPar = p;
    syncNight();
  }
  function syncNight() {
    document.body.classList.toggle("night", Math.max(tCur, tTarget * 0.999) > 0.78);
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (reduced) { tCur = tTarget; paint(0); }
  }

  var rafOn = false;
  function loop(now) {
    if (!rafOn) return;
    tCur += (tTarget - tCur) * 0.07;
    if (Math.abs(tTarget - tCur) < 0.0004) tCur = tTarget;
    syncNight();
    for (var i = 0; i < clouds.length; i++) clouds[i].x += clouds[i].v * 0.016;
    paint(now);
    spriteFrame(now);
    lanternFrame();
    requestAnimationFrame(loop);
  }

  /* ---------- sprite companion: "Suu" the valley spirit ---------- */
  var sprite, spriteX = 40, spriteTargetX = 40, hopUntil = 0, faceRight = true;
  function buildSprite() {
    if (reduced) return;
    sprite = document.createElement("div");
    sprite.id = "sprite";
    sprite.setAttribute("aria-hidden", "true");
    sprite.title = "Suu, the valley spirit";
    sprite.innerHTML =
      '<svg viewBox="0 0 64 64" width="46" height="46">' +
      '<g class="suu-legs"><rect x="24" y="50" width="4" height="9" rx="2" fill="#221d16"/><rect x="36" y="50" width="4" height="9" rx="2" fill="#221d16"/></g>' +
      '<path d="M32 8 C14 8 8 24 10 36 C12 50 20 55 32 55 C44 55 52 50 54 36 C56 24 50 8 32 8 Z" fill="#2a251d"/>' +
      '<path d="M32 8 C 30 4 34 2 33 6 M22 11 C 19 7 24 5 23 9 M42 11 C 45 7 40 5 41 9" stroke="#2a251d" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="24" cy="30" r="6.5" fill="#fffdf4"/><circle cx="40" cy="30" r="6.5" fill="#fffdf4"/>' +
      '<circle class="suu-eye" cx="25.5" cy="31" r="2.6" fill="#17130d"/><circle class="suu-eye" cx="41.5" cy="31" r="2.6" fill="#17130d"/>' +
      '<g class="suu-lantern" opacity="0"><path d="M52 34 L58 30" stroke="#4a3d28" stroke-width="2" stroke-linecap="round"/>' +
      '<rect x="55" y="30" width="7" height="9" rx="2.5" fill="#ffd98a" stroke="#4a3d28" stroke-width="1.4"/>' +
      '<circle cx="58.5" cy="34.5" r="7" fill="rgba(255,222,140,.35)"/></g>' +
      "</svg>";
    document.body.appendChild(sprite);

    // Suu hops when you greet a project card
    document.addEventListener("mouseover", function (ev) {
      if (ev.target.closest && ev.target.closest(".grid-card, .feature, .castle-scene")) {
        hopUntil = performance.now() + 620;
      }
    });
    sprite.addEventListener("click", function () { hopUntil = performance.now() + 900; });
  }
  var spriteY = 0;
  function spriteFrame(now) {
    if (!sprite) return;
    // while the reading lantern is on, Suu carries it beside the cursor;
    // otherwise Suu walks the bottom of the valley with the scroll
    var carrying = lanternOn && mlTX > -500;
    spriteTargetX = carrying ? mlTX - 62 : 24 + scrollPar * (window.innerWidth * 0.82);
    var d = spriteTargetX - spriteX;
    spriteX += d * (carrying ? 0.09 : 0.045);
    if (Math.abs(d) > (carrying ? 40 : 2)) faceRight = d > 0;
    var tyT = carrying ? (mlTY + 36 - (window.innerHeight - 4)) : 0;
    spriteY += (tyT - spriteY) * 0.09;
    var walk = Math.min(Math.abs(d), 14);
    var bob = Math.abs(Math.sin(now / 130)) * clamp(walk / 5, 0, 1) * 4;
    var hop = now < hopUntil ? Math.abs(Math.sin((hopUntil - now) / 90)) * 14 : 0;
    sprite.style.transform = "translate(" + spriteX + "px," + (spriteY - bob - hop) + "px) scaleX(" + (faceRight ? 1 : -1) + ")";
    var lantern = sprite.querySelector(".suu-lantern");
    if (lantern) lantern.setAttribute("opacity", lanternOn ? "1" : clamp((tCur - 0.72) / 0.18, 0, 1).toFixed(2));
  }

  /* ---------- Suu's reading lantern (toggle: nav button or L key) ----------
     The light is a disc BETWEEN the painted sky and the words (z-index -1),
     so it never tints the glyphs. It pushes the background OPPOSITE to the
     current ink - warm paper under dark ink, smoked glass under light ink -
     which mathematically raises contrast under the light every time. */
  var lanternOn = false, lanternDisc = null, discPaper = null, discGlass = null;
  var mlX = -600, mlY = -600, mlTX = -600, mlTY = -600;
  var coarse = window.matchMedia("(pointer: coarse)").matches;

  function buildLantern() {
    if (coarse) return;
    lanternDisc = document.createElement("div");
    lanternDisc.id = "lantern-disc";
    lanternDisc.setAttribute("aria-hidden", "true");
    discPaper = document.createElement("div"); discPaper.className = "ld-paper";
    discGlass = document.createElement("div"); discGlass.className = "ld-glass";
    var rim = document.createElement("div"); rim.className = "ld-rim";
    lanternDisc.appendChild(discPaper);
    lanternDisc.appendChild(discGlass);
    lanternDisc.appendChild(rim);
    document.body.appendChild(lanternDisc);
    syncDisc();

    document.addEventListener("mousemove", function (ev) {
      mlTX = ev.clientX; mlTY = ev.clientY;
      if (reduced && lanternOn) {
        mlX = mlTX; mlY = mlTY;
        lanternDisc.style.transform = "translate(" + mlX + "px," + mlY + "px)";
      }
    }, { passive: true });
    document.documentElement.addEventListener("mouseleave", function () {
      mlTX = -600; mlTY = -600;
    });

    var btn = document.getElementById("btn-lantern");
    if (btn) btn.addEventListener("click", function () { setLantern(!lanternOn); });
    document.addEventListener("keydown", function (ev) {
      if ((ev.key || "").toLowerCase() !== "l") return;
      var t = ev.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      setLantern(!lanternOn);
    });
    var saved = "0";
    try { saved = localStorage.getItem("xe-lantern") || "0"; } catch (e) {}
    if (saved === "1") setLantern(true);
  }
  function setLantern(on) {
    if (!lanternDisc) return;
    lanternOn = !!on;
    document.body.classList.toggle("lantern-on", lanternOn);
    var b = document.getElementById("btn-lantern");
    if (b) { b.classList.toggle("on", lanternOn); b.setAttribute("aria-pressed", lanternOn ? "true" : "false"); }
    try { localStorage.setItem("xe-lantern", lanternOn ? "1" : "0"); } catch (e) {}
    if (lanternOn && reduced && mlTX > -500) {
      mlX = mlTX; mlY = mlTY;
      lanternDisc.style.transform = "translate(" + mlX + "px," + mlY + "px)";
    }
  }
  function syncDisc() {
    if (!discPaper) return;
    var g = clamp((inkK - 0.35) / 0.3, 0, 1);
    discPaper.style.opacity = (1 - g).toFixed(2);
    discGlass.style.opacity = g.toFixed(2);
  }
  function lanternFrame() {
    if (!lanternDisc || !lanternOn) return;
    mlX += (mlTX - mlX) * 0.22;
    mlY += (mlTY - mlY) * 0.22;
    lanternDisc.style.transform = "translate(" + mlX + "px," + mlY + "px)";
  }

  /* ---------- hero vignette: painted studio-on-a-hill ---------- */
  function buildHeroScene() {
    var box = document.getElementById("hero-scene");
    if (!box) return;
    box.innerHTML =
      '<svg viewBox="0 0 460 420" role="img" aria-label="a painted studio desk on a valley hill">' +
      '<defs>' +
      '<linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9c0dd"/><stop offset=".6" stop-color="#e8d3c4"/><stop offset="1" stop-color="#f7dfbe"/></linearGradient>' +
      '<radialGradient id="hs-sun" cx=".72" cy=".28" r=".5"><stop offset="0" stop-color="rgba(255,240,190,.95)"/><stop offset="1" stop-color="rgba(255,240,190,0)"/></radialGradient>' +
      '</defs>' +
      '<rect width="460" height="420" rx="18" fill="url(#hs-sky)"/>' +
      '<rect width="460" height="420" rx="18" fill="url(#hs-sun)"/>' +
      '<g data-depth="6"><ellipse cx="90" cy="86" rx="52" ry="18" fill="#fff" opacity=".85"/><ellipse cx="130" cy="96" rx="40" ry="14" fill="#fff" opacity=".7"/><ellipse cx="330" cy="60" rx="46" ry="15" fill="#fff" opacity=".8"/></g>' +
      '<g data-depth="12"><path d="M0 300 Q 120 240 250 285 T 460 270 L 460 420 L 0 420 Z" fill="#8fae6d"/></g>' +
      '<g data-depth="20">' +
      '<path d="M0 330 Q 150 290 300 330 T 460 325 L 460 420 L 0 420 Z" fill="#6c9a58"/>' +
      // tree
      '<rect x="332" y="208" width="13" height="96" rx="6" fill="#6b4f33"/>' +
      '<ellipse cx="338" cy="176" rx="64" ry="46" fill="#5d9455"/><ellipse cx="300" cy="204" rx="42" ry="30" fill="#6ca25e"/><ellipse cx="378" cy="204" rx="40" ry="28" fill="#549049"/>' +
      // desk under the tree
      '<rect x="130" y="292" width="132" height="10" rx="4" fill="#8a6844"/>' +
      '<rect x="140" y="302" width="9" height="34" fill="#75563a"/><rect x="244" y="302" width="9" height="34" fill="#75563a"/>' +
      // laptop (systems by day)
      '<rect x="152" y="262" width="52" height="32" rx="3" fill="#3a3f4c"/><rect x="156" y="266" width="44" height="22" rx="2" fill="#9fd0a6"/>' +
      '<rect x="148" y="292" width="60" height="5" rx="2" fill="#2c303a"/>' +
      // tea, steam
      '<rect x="218" y="278" width="16" height="14" rx="4" fill="#e8e0cd"/><path class="hs-steam" d="M226 274 q 4 -7 0 -13 q -4 -6 0 -12" stroke="#ffffff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>' +
      // grass tufts
      '<path d="M96 352 q 3 -14 0 -18 M104 352 q -2 -12 2 -20 M112 352 q 3 -10 0 -16" stroke="#4c7f42" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M300 366 q 3 -14 0 -18 M308 366 q -2 -12 2 -20" stroke="#4c7f42" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '</g>' +
      '<text x="26" y="398" font-family="Georgia, serif" font-size="13" fill="#5d5340" font-style="italic">the valley wakes with you</text>' +
      "</svg>";
    if (reduced) return;
    var hero = document.querySelector(".hero");
    if (!hero) return;
    hero.addEventListener("pointermove", function (ev) {
      var r = box.getBoundingClientRect();
      var dx = (ev.clientX - (r.left + r.width / 2)) / r.width;
      var dy = (ev.clientY - (r.top + r.height / 2)) / r.height;
      box.querySelectorAll("[data-depth]").forEach(function (g) {
        var depth = parseFloat(g.getAttribute("data-depth"));
        g.style.transform = "translate(" + (-dx * depth) + "px," + (-dy * depth * 0.6) + "px)";
      });
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    canvas = document.createElement("canvas");
    canvas.id = "valley";
    canvas.setAttribute("aria-hidden", "true");
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext("2d");

    var grain = document.createElement("div");
    grain.className = "grain";
    grain.setAttribute("aria-hidden", "true");
    document.body.appendChild(grain);

    buildHeroScene();
    buildSprite();
    buildLantern();
    buildWeatherBtn();

    resize();
    readScroll();
    tCur = tTarget;   // land on the right time of day - no dawn sweep on load
    syncNight();
    window.addEventListener("resize", resize);

    if (reduced) {
      var thr = null;
      window.addEventListener("scroll", function () {
        if (thr) return;
        thr = setTimeout(function () {
          thr = null;
          readScroll();
          tCur = tTarget;
          paint(performance.now());
        }, 140);
      }, { passive: true });
      tCur = tTarget;
      paint(performance.now());
    } else {
      window.addEventListener("scroll", readScroll, { passive: true });
      rafOn = true;
      requestAnimationFrame(loop);
    }

    // theme flips are instant nights
    new MutationObserver(readScroll).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  window.PORTFOLIO_WORLD = {
    repaint: function () { readScroll(); if (reduced) { tCur = tTarget; paint(performance.now()); } },
    lantern: setLantern,
    /* presentation mode: pin the sky to a time of day (0 dawn .. 1 night);
       the rAF loop eases toward it, so slide changes get a free sky transition */
    holdTime: function (t) {
      tHold = t == null ? null : clamp(t, 0, 1);
      readScroll();
      if (reduced) { tCur = tTarget; paint(performance.now()); }
    },
    weather: setWeather,
    weatherState: function () { return { mode: weatherMode, active: weatherActive }; },
    release: function () { window.PORTFOLIO_WORLD.holdTime(null); }
  };

  document.addEventListener("DOMContentLoaded", boot);
})();
