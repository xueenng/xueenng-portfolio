/* ============================================================
   worldmap.js - map mode: the same valley, explorable.
   One painted SVG valley where every project is a place: the
   castle on the hill is the FYP (clicking it enters kellie.html),
   the works district runs the mills and towers, the school
   quarter holds the academic projects - and the binary search
   tree is, of course, an actual tree.
   Entry: the "Explore the valley" signpost (hero) or #map.
   Same data as the scroll site (PORTFOLIO_APP.content); project
   details open in-map and mount their real exhibits/demos.
   Layout lives HERE (presentation), keyed by project id -
   projects without a place are seated along the south meadow.
   The camera is clamped inside WORLD so the page background can
   never show; WASD / arrow keys walk Suu around the valley.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- where everything lives (id -> place) ---------- */
  var LAYOUT = {
    "vr-escape-room":            { x: 1300, y: 240, kind: "castle",  label: "Kellie's Castle" },
    "do-pipeline":               { x: 300,  y: 490, kind: "mill",    label: "Document Mill" },
    "forex-sync":                { x: 470,  y: 385, kind: "kiosk",   label: "Exchange House" },
    "notify-hub":                { x: 205,  y: 650, kind: "post",    label: "Post Office" },
    "ssrs-monitor":              { x: 165,  y: 335, kind: "tower",   label: "Watchtower" },
    "ops-portal":                { x: 525,  y: 570, kind: "hall",    label: "Town Hall" },
    "work-record":               { x: 685,  y: 455, kind: "print",   label: "Print Shop" },
    "student-routine-organizer": { x: 905,  y: 385, kind: "school",  label: "Schoolhouse" },
    "mindharmony":               { x: 1065, y: 490, kind: "pavilion",label: "Calm Garden" },
    "ai-waste-sorting":          { x: 825,  y: 565, kind: "shed",    label: "Sorting Shed" },
    "ar-fire-extinguisher":      { x: 1200, y: 625, kind: "fire",    label: "Fire Station" },
    "vr-fire-extinguisher":      { x: 1335, y: 705, kind: "drill",   label: "Drill Tower" },
    "math-adventure":            { x: 950,  y: 665, kind: "tent",    label: "Number Tent" },
    "stock-management":          { x: 700,  y: 725, kind: "barn",    label: "Warehouse" },
    "fruit-stall-inventory":     { x: 520,  y: 785, kind: "stall",   label: "Fruit Stall" },
    "food-ordering":             { x: 885,  y: 815, kind: "tavern",  label: "Tavern" },
    "library-student-management":{ x: 1105, y: 785, kind: "library", label: "Library" },
    "student-record-bst":        { x: 1440, y: 520, kind: "tree",    label: "The Sorting Tree" }
  };

  /* ---------- tiny building painters (inner SVG, ground at y=0) ---------- */
  var INK = "#5d4a33";
  function house(body, roof, prop) {
    return '<rect x="-45" y="-70" width="90" height="70" rx="3" fill="' + body + '" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M-56 -70 L0 -112 L56 -70 Z" fill="' + roof + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<rect x="-13" y="-36" width="26" height="36" rx="4" fill="' + INK + '"/>' +
      '<rect x="-37" y="-58" width="19" height="17" rx="2" fill="#fdf6e0" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<rect x="18" y="-58" width="19" height="17" rx="2" fill="#fdf6e0" stroke="' + INK + '" stroke-width="1.6"/>' +
      (prop || "");
  }
  function signPost(inner) {
    return '<g transform="translate(62,0)"><rect x="-2.5" y="-42" width="5" height="42" fill="' + INK + '"/>' +
      '<rect x="-19" y="-62" width="38" height="26" rx="4" fill="#f2e3bd" stroke="' + INK + '" stroke-width="2"/>' + inner + "</g>";
  }
  var PAINTERS = {
    castle: function () {
      return '<ellipse cx="0" cy="6" rx="150" ry="26" fill="#a4bf7d"/>' +
        '<rect x="-95" y="-150" width="54" height="150" fill="#b4573e" stroke="#6e3322" stroke-width="2.5"/>' +
        '<path d="M-95 -150 h54 v-12 h-11 v7 h-9 v-7 h-9 v7 h-9 v-7 h-11 Z" fill="#b4573e" stroke="#6e3322" stroke-width="2"/>' +
        '<path d="M-82 -122 a7 7 0 0 1 14 0 v14 h-14 Z M-62 -122 a7 7 0 0 1 14 0 v14 h-14 Z" fill="#fdf1de"/>' +
        '<path d="M-75 -70 a8 8 0 0 1 16 0 v18 h-16 Z" fill="#fdf1de"/>' +
        '<rect x="-41" y="-96" width="110" height="96" fill="#c26144" stroke="#6e3322" stroke-width="2.5"/>' +
        '<path d="M-28 -72 a8 8 0 0 1 16 0 v18 h-16 Z M0 -72 a8 8 0 0 1 16 0 v18 h-16 Z M28 -72 a8 8 0 0 1 16 0 v18 h-16 Z" fill="#fdf1de"/>' +
        '<path d="M-28 -36 a8 8 0 0 1 16 0 v18 h-16 Z M0 -36 a8 8 0 0 1 16 0 v18 h-16 Z M28 -36 a8 8 0 0 1 16 0 v18 h-16 Z" fill="#f7e3c8"/>' +
        '<rect x="69" y="-118" width="36" height="118" fill="#b4573e" stroke="#6e3322" stroke-width="2.5"/>' +
        '<path d="M69 -118 a18 12 0 0 1 36 0 Z" fill="#8f8578" stroke="#6e3322" stroke-width="2"/>' +
        '<line x1="87" y1="-130" x2="87" y2="-152" stroke="#6e3322" stroke-width="2.5"/>' +
        '<path d="M87 -152 l22 6 l-22 6 Z" fill="#e8a200"/>';
    },
    mill: function () {
      return house("#d9b98c", "#a8552f",
        '<g transform="translate(-64,-6)"><circle r="30" fill="none" stroke="' + INK + '" stroke-width="4"/>' +
        '<path d="M-30 0 H30 M0 -30 V30 M-21 -21 L21 21 M-21 21 L21 -21" stroke="' + INK + '" stroke-width="3.5"/></g>' +
        '<rect x="20" y="-132" width="14" height="24" fill="#8a6242"/>' +
        '<circle class="wm-smoke" cx="27" cy="-144" r="7" fill="#fff" opacity=".7"/>' +
        '<circle class="wm-smoke wm-smoke2" cx="34" cy="-158" r="9" fill="#fff" opacity=".5"/>' +
        signPost('<rect x="-11" y="-56" width="14" height="16" fill="#fff" stroke="' + INK + '"/><path d="M-8 -51 h8 M-8 -47 h8" stroke="#2273cc" stroke-width="1.6"/>'));
    },
    kiosk: function () {
      return '<rect x="-34" y="-62" width="68" height="62" rx="4" fill="#e8d8b0" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<path d="M-42 -62 L0 -92 L42 -62 Z" fill="#4d7f68" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<rect x="-22" y="-50" width="44" height="22" rx="3" fill="#fdf6e0" stroke="' + INK + '" stroke-width="1.6"/>' +
        signPost('<circle cx="0" cy="-49" r="9" fill="#e8b23a" stroke="' + INK + '" stroke-width="1.8"/><text x="0" y="-45" text-anchor="middle" font-size="11" font-weight="bold" fill="' + INK + '">$</text>');
    },
    post: function () {
      return house("#cfd8e8", "#5a7a9e",
        signPost('<rect x="-12" y="-55" width="24" height="15" fill="#fff" stroke="' + INK + '" stroke-width="1.6"/><path d="M-12 -55 L0 -46 L12 -55" fill="none" stroke="' + INK + '" stroke-width="1.6"/>') +
        '<path d="M-70 -96 q 6 -10 14 -2 M-52 -104 q 6 -10 14 -2" stroke="' + INK + '" stroke-width="2" fill="none"/>');
    },
    tower: function () {
      return '<path d="M-26 0 L-18 -120 H18 L26 0 Z" fill="#b0a188" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<rect x="-26" y="-146" width="52" height="28" rx="4" fill="#8a7a5e" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<circle class="wm-night-only" cx="0" cy="-132" r="24" fill="url(#wm-lamp)"/>' +
        '<circle cx="0" cy="-132" r="8" fill="#ffd57e" stroke="' + INK + '" stroke-width="2">' + (reduced ? "" : '<animate attributeName="opacity" values="1;.35;1" dur="2.6s" repeatCount="indefinite"/>') + '</circle>' +
        '<path d="M-14 -60 a7 7 0 0 1 14 0 v12 h-14 Z" fill="#fdf6e0" transform="translate(7,0)"/>';
    },
    hall: function () {
      return '<rect x="-70" y="-72" width="140" height="72" rx="3" fill="#e3d3ae" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<path d="M-80 -72 L0 -104 L80 -72 Z" fill="#9e6b46" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<rect x="-52" y="-58" width="10" height="58" fill="#fdf6e0" stroke="' + INK + '" stroke-width="1.6"/>' +
        '<rect x="-5" y="-58" width="10" height="58" fill="#fdf6e0" stroke="' + INK + '" stroke-width="1.6"/>' +
        '<rect x="42" y="-58" width="10" height="58" fill="#fdf6e0" stroke="' + INK + '" stroke-width="1.6"/>' +
        '<circle cx="0" cy="-86" r="7" fill="#fdf6e0" stroke="' + INK + '" stroke-width="1.6"/>';
    },
    print: function () {
      return house("#d8cbb2", "#6f6353",
        signPost('<rect x="-10" y="-57" width="16" height="18" fill="#fff" stroke="' + INK + '" stroke-width="1.4"/><rect x="-6" y="-53" width="16" height="18" fill="#fff" stroke="' + INK + '" stroke-width="1.4"/>'));
    },
    school: function () {
      return house("#e8c98f", "#b0563a",
        '<circle cx="0" cy="-92" r="10" fill="#fdf6e0" stroke="' + INK + '" stroke-width="2"/>' +
        '<path d="M0 -92 V-98 M0 -92 H5" stroke="' + INK + '" stroke-width="1.8"/>' +
        signPost('<path d="M-10 -54 h20 M-10 -49 h20 M-10 -44 h13" stroke="' + INK + '" stroke-width="1.8"/>'));
    },
    pavilion: function () {
      return '<path d="M-52 -54 Q 0 -102 52 -54 Z" fill="#7fae6b" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<rect x="-40" y="-54" width="7" height="54" fill="#8a6844"/><rect x="33" y="-54" width="7" height="54" fill="#8a6844"/>' +
        '<rect x="-4" y="-54" width="7" height="54" fill="#8a6844"/>' +
        '<circle cx="-58" cy="-8" r="7" fill="#e58fb1"/><circle cx="-70" cy="-2" r="5" fill="#f2c14e"/><circle cx="60" cy="-6" r="6" fill="#b18fe5"/>' +
        '<circle cx="0" cy="-70" r="5" fill="#fdf6e0"/>';
    },
    shed: function () {
      return '<path d="M-44 0 V-58 L44 -74 V0 Z" fill="#b8c4a2" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<rect x="-30" y="-40" width="20" height="40" fill="' + INK + '"/>' +
        '<rect x="4" y="-30" width="14" height="30" fill="#4d7f68"/><rect x="22" y="-30" width="14" height="30" fill="#2273cc"/>' +
        '<path d="M11 -34 h0 M29 -34 h0" stroke="none"/>';
    },
    fire: function () {
      return house("#d96a52", "#8f3b2c",
        '<rect x="-13" y="-36" width="26" height="36" rx="4" fill="#f2c14e"/>' +
        signPost('<path d="M0 -58 q 6 8 0 14 q -8 -4 -4 -12 q 2 3 4 -2 Z" fill="#e2543e"/>'));
    },
    drill: function () {
      return '<path d="M-30 0 L-20 -110 H20 L30 0 Z" fill="none" stroke="' + INK + '" stroke-width="4"/>' +
        '<path d="M-26 -30 H26 M-23 -58 H23 M-21 -84 H21" stroke="' + INK + '" stroke-width="3"/>' +
        '<rect x="-16" y="-130" width="32" height="20" rx="3" fill="#8a7a5e" stroke="' + INK + '" stroke-width="2"/>' +
        '<path d="M0 -136 q 8 10 0 18 q -10 -5 -5 -15 q 3 4 5 -3 Z" fill="#e8843e"/>';
    },
    tent: function () {
      return '<path d="M-52 0 L0 -84 L52 0 Z" fill="#d96a52" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<path d="M-26 0 L0 -84 L26 0 Z" fill="#f2e3bd" stroke="' + INK + '" stroke-width="2"/>' +
        '<path d="M0 -84 V-98" stroke="' + INK + '" stroke-width="2.5"/><path d="M0 -98 l16 4 l-16 5 Z" fill="#2273cc"/>' +
        '<text x="34" y="-40" font-size="15" font-weight="bold" fill="' + INK + '" transform="rotate(8 34 -40)">1+2</text>';
    },
    barn: function () {
      return '<rect x="-56" y="-66" width="112" height="66" rx="3" fill="#c9a06a" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<path d="M-64 -66 L0 -100 L64 -66 Z" fill="#7a5c3e" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<rect x="-22" y="-46" width="44" height="46" fill="' + INK + '"/><path d="M-22 -46 L22 0 M22 -46 L-22 0" stroke="#c9a06a" stroke-width="3"/>' +
        '<rect x="32" y="-24" width="18" height="24" fill="#a8815a" stroke="' + INK + '" stroke-width="1.6"/>';
    },
    stall: function () {
      return '<rect x="-40" y="-40" width="80" height="40" fill="#e8d8b0" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<path d="M-48 -40 h96 l-8 -26 h-80 Z" fill="#e2543e" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<path d="M-48 -40 h96" stroke="#fdf6e0" stroke-width="5" stroke-dasharray="12 12"/>' +
        '<circle cx="-18" cy="-46" r="0"/>' +
        '<circle cx="-16" cy="-50" r="7" fill="#e8b23a"/><circle cx="0" cy="-52" r="7" fill="#d95f52"/><circle cx="16" cy="-50" r="7" fill="#7fae6b"/>';
    },
    tavern: function () {
      return house("#d9b98c", "#5f7d4a",
        signPost('<circle cx="0" cy="-48" r="8" fill="#fdf6e0" stroke="' + INK + '" stroke-width="1.6"/><path d="M-5 -50 q 5 -6 10 0" fill="none" stroke="#c26144" stroke-width="2"/>') +
        '<path class="wm-smoke" d="M30 -118 q 4 -8 0 -14" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/>' +
        '<rect x="22" y="-118" width="13" height="14" fill="#8a6242"/>');
    },
    library: function () {
      return house("#cbb9d8", "#6b5a80",
        signPost('<path d="M-11 -55 q 11 -6 22 0 v14 q -11 -6 -22 0 Z" fill="#fff" stroke="' + INK + '" stroke-width="1.5"/><path d="M0 -55 v13" stroke="' + INK + '" stroke-width="1.4"/>'));
    },
    tree: function () {
      return '<ellipse cx="0" cy="4" rx="90" ry="18" fill="#a4bf7d"/>' +
        '<rect x="-10" y="-84" width="20" height="84" rx="7" fill="#8a6242" stroke="' + INK + '" stroke-width="2"/>' +
        '<circle cx="0" cy="-118" r="52" fill="#5d9455"/><circle cx="-48" cy="-92" r="34" fill="#6ca25e"/><circle cx="46" cy="-94" r="32" fill="#549049"/>' +
        '<g font-size="13" font-weight="bold" text-anchor="middle">' +
        '<line x1="0" y1="-70" x2="0" y2="-56" stroke="' + INK + '" stroke-width="1.6"/><circle cx="0" cy="-46" r="11" fill="#f2e3bd" stroke="' + INK + '" stroke-width="1.8"/><text x="0" y="-42" fill="' + INK + '">8</text>' +
        '<line x1="-44" y1="-66" x2="-44" y2="-50" stroke="' + INK + '" stroke-width="1.6"/><circle cx="-44" cy="-40" r="11" fill="#f2e3bd" stroke="' + INK + '" stroke-width="1.8"/><text x="-44" y="-36" fill="' + INK + '">3</text>' +
        '<line x1="44" y1="-68" x2="44" y2="-52" stroke="' + INK + '" stroke-width="1.6"/><circle cx="44" cy="-42" r="11" fill="#f2e3bd" stroke="' + INK + '" stroke-width="1.8"/><text x="44" y="-38" fill="' + INK + '">13</text>' +
        "</g>";
    },
    generic: function () { return house("#e0d4b6", "#8a6b4a"); }
  };

  /* ---------- state ---------- */
  var open = false, overlay = null, panG = null, suuG = null, svgEl = null;
  var tx = 0, ty = 0, scale = 1;
  /* hard edges of the painted world - the camera is clamped inside these, so
     the plain page background can never peek through */
  var WORLD = { x0: -1500, y0: -750, x1: 3700, y1: 1650 };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function projects() {
    return (window.PORTFOLIO_APP && window.PORTFOLIO_APP.content) ? window.PORTFOLIO_APP.content.projects : [];
  }

  /* ---------- build the valley SVG (day, or night when the site is dark) ---------- */
  function valleySvg(night) {
    var ps = projects();
    var placed = [], southSeat = 0;
    ps.forEach(function (p) {
      var L = LAYOUT[p.id];
      if (!L) { L = { x: 620 + (southSeat++) * 150, y: 920, kind: "generic", label: p.title.slice(0, 16) }; }
      placed.push({ p: p, L: L });
    });

    // jagged mountain ranges along the whole horizon (snow on the tall peaks)
    function mountains(baseY, amp, step, color, snowy, phase) {
      var d = "M" + (WORLD.x0 - 40) + " " + baseY, snow = "";
      for (var x = WORLD.x0 - 40; x < WORLD.x1 + 40; x += step) {
        var h = amp * (0.62 + 0.38 * Math.sin(x * 0.013 + phase));
        var px = x + step / 2, py = Math.round(baseY - h);
        d += " L" + px + " " + py + " L" + (x + step) + " " + baseY;
        if (snowy && h > amp * 0.72) {
          var sw = Math.round(step * 0.09), sy = Math.round(py + h * 0.2);
          snow += '<path d="M' + (px - sw) + " " + sy + " L" + px + " " + py + " L" + (px + sw) + " " + sy +
                  " Q " + px + " " + (sy + 9) + " " + (px - sw) + " " + sy + ' Z" fill="#f4f7fb"/>';
        }
      }
      d += " L" + (WORLD.x1 + 40) + " " + (baseY + 400) + " L" + (WORLD.x0 - 40) + " " + (baseY + 400) + " Z";
      return '<path d="' + d + '" fill="' + color + '"/>' + snow;
    }
    function pine(x, y, sc) {
      return '<g transform="translate(' + x + "," + y + ') scale(' + sc + ')">' +
        '<rect x="-4" y="-13" width="8" height="13" fill="#7a5a3c"/>' +
        '<path d="M-22 -10 L0 -44 L22 -10 Z" fill="#4d7f52"/>' +
        '<path d="M-18 -28 L0 -56 L18 -28 Z" fill="#568a58"/>' +
        '<path d="M-14 -44 L0 -68 L14 -44 Z" fill="#5f9455"/></g>';
    }

    var s = '<svg id="wm-svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid meet">';
    s += '<defs><linearGradient id="wm-sky" x1="0" y1="0" x2="0" y2="1">' +
         '<stop offset="0" stop-color="#8fc3e8"/><stop offset="1" stop-color="#d8ecdf"/></linearGradient>' +
         '<radialGradient id="wm-sun" cx=".5" cy=".5" r=".5">' +
         '<stop offset="0" stop-color="rgba(255,238,170,.9)"/><stop offset="1" stop-color="rgba(255,238,170,0)"/></radialGradient>' +
         // real light: bright warm core, fast falloff (lamp bloom + ground pool)
         '<radialGradient id="wm-lamp" cx=".5" cy=".5" r=".5">' +
         '<stop offset="0" stop-color="rgba(255,232,175,.85)"/><stop offset=".45" stop-color="rgba(255,208,125,.28)"/><stop offset="1" stop-color="rgba(255,208,125,0)"/></radialGradient>' +
         '<radialGradient id="wm-pool" cx=".5" cy=".5" r=".5">' +
         '<stop offset="0" stop-color="rgba(255,206,120,.4)"/><stop offset=".5" stop-color="rgba(255,206,120,.16)"/><stop offset="1" stop-color="rgba(255,206,120,0)"/></radialGradient></defs>';
    s += '<g id="wm-pan">';
    // ground and sky span the entire clamped world
    s += '<rect x="' + WORLD.x0 + '" y="' + WORLD.y0 + '" width="' + (WORLD.x1 - WORLD.x0) + '" height="' + (WORLD.y1 - WORLD.y0) + '" fill="#9dbb79"/>';
    s += '<rect x="' + WORLD.x0 + '" y="' + WORLD.y0 + '" width="' + (WORLD.x1 - WORLD.x0) + '" height="' + (330 - WORLD.y0) + '" fill="url(#wm-sky)"/>';
    // high sky: sun by day; moon and stars once night falls
    s += '<g class="wm-day-only"><circle cx="420" cy="-380" r="210" fill="url(#wm-sun)"/><circle cx="420" cy="-380" r="60" fill="#ffeeb0"/></g>';
    var nightSky = '<g class="wm-night-only">';
    nightSky += '<circle cx="520" cy="-360" r="78" fill="rgba(233,237,250,.1)"/>' +
                '<circle cx="520" cy="-360" r="44" fill="#e9edfa"/>' +
                '<circle cx="504" cy="-372" r="37" fill="#101a30"/>';
    for (var st2 = 0; st2 < 46; st2++) {
      var stx = WORLD.x0 + 120 + ((st2 * 883) % (WORLD.x1 - WORLD.x0 - 240));
      var sty = WORLD.y0 + 40 + ((st2 * 467) % 900);
      nightSky += '<circle cx="' + stx + '" cy="' + sty + '" r="' + (1 + (st2 % 3) * 0.6) + '" fill="#e8eeff" opacity=".8"/>';
    }
    nightSky += "</g>";
    s += nightSky;
    s += '<g transform="translate(2350,-300)"><g class="wm-balloon">' +
         '<path d="M0 -66 C -46 -66 -62 -26 -40 8 C -26 30 26 30 40 8 C 62 -26 46 -66 0 -66 Z" fill="#e2765a"/>' +
         '<path d="M0 -66 C -17 -66 -23 -24 -14 12 M0 -66 C 17 -66 23 -24 14 12" stroke="#f2e3bd" stroke-width="7" fill="none"/>' +
         '<path d="M-30 18 L-12 40 M30 18 L12 40" stroke="#6b4f33" stroke-width="2.5"/>' +
         '<rect x="-15" y="38" width="30" height="21" rx="4" fill="#8a6242" stroke="#5d4a33" stroke-width="2"/></g></g>';
    var flock = '<path d="M0 0 q 9 -9 18 0 q 9 -9 18 0 M52 -16 q 8 -8 16 0 q 8 -8 16 0 M-40 -24 q 7 -7 14 0 q 7 -7 14 0" stroke="#41506b" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
    s += '<g class="wm-day-only" transform="translate(900,-160)"><g class="wm-birds">' + flock + "</g></g>";
    s += '<g class="wm-day-only" transform="translate(2600,-480)"><g class="wm-birds wm-birds2">' + flock + "</g></g>";
    // the horizon: snowy far range, green foothills, then the soft ridge band
    s += mountains(318, 215, 470, "#8fa7c0", true, 0);
    s += mountains(332, 115, 330, "#7d9a6d", false, 2.4);
    s += '<path d="M' + WORLD.x0 + " 330 Q -700 265 200 300 T 1600 285 T 2800 308 T " + WORLD.x1 + " 295 L " + WORLD.x1 + " 405 Q 1000 435 " + WORLD.x0 + ' 405 Z" fill="#b5cfa0"/>';
    s += '<ellipse cx="1300" cy="290" rx="330" ry="90" fill="#8db06c"/>';

    // === west of town: waterfall, rainbow, lake with a rowboat, pine shore ===
    s += '<path d="M-1150 318 q 12 120 -10 182 q -14 58 -6 126" stroke="#cfe6f4" stroke-width="34" fill="none" stroke-linecap="round" opacity=".95"/>';
    s += '<path class="wm-fall" d="M-1150 318 q 12 120 -10 182 q -14 58 -6 126" stroke="#ffffff" stroke-width="14" fill="none" stroke-linecap="round"/>';
    s += '<ellipse cx="-950" cy="720" rx="420" ry="160" fill="#7fb5d8"/><ellipse cx="-950" cy="726" rx="356" ry="126" fill="#a9d0e8" opacity=".75"/>';
    s += '<ellipse cx="-1158" cy="644" rx="48" ry="13" fill="#eaf5fb" opacity=".9"/>';
    s += '<path d="M-1120 700 q 30 10 60 0 M-960 770 q 34 10 68 0 M-780 690 q 26 9 52 0" stroke="#eaf5fb" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>';
    s += '<g class="wm-day-only" fill="none" opacity=".4" stroke-linecap="round">' +
         '<path d="M-1330 560 A 200 200 0 0 1 -940 505" stroke="#e2543e" stroke-width="7"/>' +
         '<path d="M-1322 570 A 190 190 0 0 1 -948 517" stroke="#e8b23a" stroke-width="7"/>' +
         '<path d="M-1314 580 A 180 180 0 0 1 -956 529" stroke="#5d9455" stroke-width="7"/></g>';
    s += '<g transform="translate(-840,708)"><g class="wm-boat">' +
         '<path d="M-36 0 Q 0 16 36 0 L 26 -10 L -26 -10 Z" fill="#8a6242" stroke="#5d4a33" stroke-width="2"/>' +
         '<rect x="-2" y="-36" width="4" height="26" fill="#5d4a33"/><path d="M2 -36 L 24 -16 L 2 -13 Z" fill="#f2e3bd"/></g></g>';
    [[-1080, 762], [-1028, 792], [-696, 664]].forEach(function (dk) {
      s += '<g transform="translate(' + dk[0] + "," + dk[1] + ')"><ellipse rx="7" ry="5" fill="#f4efe2"/><circle cx="6" cy="-5" r="3.5" fill="#f4efe2"/><path d="M9 -5 l6 1.5 l-6 2 Z" fill="#e8963a"/></g>';
    });
    [[-1350, 570, 1.1], [-1272, 618, 0.9], [-556, 545, 1], [-462, 606, 1.2], [-620, 892, 1.1], [-352, 946, 0.9], [-1244, 950, 1.2], [-1390, 1120, 1]].forEach(function (pp) {
      s += pine(pp[0], pp[1], pp[2]);
    });
    s += '<g transform="translate(-478,772)">' +
         '<ellipse class="wm-night-only" cx="0" cy="6" rx="46" ry="12" fill="url(#wm-pool)"/>' +
         '<circle class="wm-night-only" cx="0" cy="-16" r="26" fill="url(#wm-lamp)"/>' +
         '<rect x="-17" y="-5" width="34" height="6" rx="3" fill="#8a6242" transform="rotate(13)"/>' +
         '<rect x="-17" y="-5" width="34" height="6" rx="3" fill="#75563a" transform="rotate(-11)"/>' +
         '<path d="M0 -22 q 9 11 0 18 q -11 -6 -5 -16 q 3 5 5 -2 Z" fill="#e8843e"/>' +
         '<circle class="wm-smoke" cx="2" cy="-32" r="6" fill="#fff" opacity=".6"/>' +
         '<circle class="wm-smoke wm-smoke2" cx="8" cy="-46" r="8" fill="#fff" opacity=".45"/></g>';

    // === east of town: wheat, hay, sheep, an orchard, a hilltop shrine ===
    s += '<ellipse cx="2100" cy="742" rx="292" ry="96" fill="#dcc47e"/>';
    for (var wi = 0; wi < 24; wi++) {
      var wx = 1858 + (wi % 8) * 66 + (((wi / 8) | 0) % 2) * 28, wy = 694 + ((wi / 8) | 0) * 44;
      s += '<path d="M' + wx + " " + wy + " q 2 -14 0 -18 M" + (wx + 6) + " " + (wy + 2) + ' q 2 -12 0 -16" stroke="#b99b50" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
    }
    [[1985, 806], [2170, 828], [2312, 770]].forEach(function (hb) {
      s += '<g transform="translate(' + hb[0] + "," + hb[1] + ')"><circle r="17" fill="#d9b878" stroke="#a8854c" stroke-width="2.2"/><path d="M-9 -4 a 10 10 0 0 1 18 4" stroke="#a8854c" stroke-width="2" fill="none"/></g>';
    });
    [[2062, 936, 1], [2152, 976, -1], [2262, 932, 1], [1988, 988, 1]].forEach(function (sh) {
      s += '<g transform="translate(' + sh[0] + "," + sh[1] + ') scale(' + sh[2] + ',1)">' +
        '<rect x="-7" y="7" width="4" height="9" fill="#3a332a"/><rect x="4" y="7" width="4" height="9" fill="#3a332a"/>' +
        '<ellipse rx="17" ry="11" fill="#f4efe2" stroke="#d8d0bd" stroke-width="2"/>' +
        '<circle cx="15" cy="-5" r="6" fill="#3a332a"/></g>';
    });
    for (var oi = 0; oi < 8; oi++) {
      var ox = 2620 + (oi % 4) * 122 + (oi > 3 ? 58 : 0), oy = 662 + (oi > 3 ? 108 : 0);
      s += '<g transform="translate(' + ox + "," + oy + ')"><rect x="-4" y="-22" width="8" height="22" fill="#8a6242"/><circle cy="-40" r="24" fill="#5f9455"/><circle cx="-9" cy="-44" r="3.2" fill="#d95f52"/><circle cx="8" cy="-34" r="3.2" fill="#d95f52"/><circle cx="1" cy="-52" r="3.2" fill="#d95f52"/></g>';
    }
    s += '<g transform="translate(3170,560)"><ellipse cx="0" cy="8" rx="100" ry="18" fill="#a4bf7d"/>' +
         '<rect x="-46" y="-80" width="11" height="80" fill="#c25742"/><rect x="35" y="-80" width="11" height="80" fill="#c25742"/>' +
         '<path d="M-62 -80 Q 0 -98 62 -80 L 62 -70 Q 0 -88 -62 -70 Z" fill="#a83c2c"/>' +
         '<rect x="-50" y="-62" width="100" height="9" fill="#c25742"/>' +
         '<g transform="translate(84,-6)"><rect x="-5" y="-26" width="10" height="26" fill="#9aa0a8"/><rect x="-10" y="-36" width="20" height="12" rx="3" fill="#8a9098"/></g></g>';
    [[3390, 522, 1.1], [3472, 584, 0.9], [3308, 648, 1], [3556, 764, 1.2], [2552, 486, 0.9], [3480, 1060, 1.1]].forEach(function (pp) {
      s += pine(pp[0], pp[1], pp[2]);
    });

    // === south meadow: pond, picnic, standing stones, flowers ===
    s += '<ellipse cx="540" cy="1368" rx="150" ry="50" fill="#7fb5d8"/><ellipse cx="540" cy="1372" rx="118" ry="36" fill="#a9d0e8" opacity=".8"/>';
    s += '<g transform="translate(1470,1252) rotate(-4)"><rect x="-62" y="-42" width="124" height="84" rx="7" fill="#e2543e"/>' +
         '<path d="M-62 -14 h124 M-62 14 h124 M-34 -42 v84 M-6 -42 v84 M22 -42 v84 M50 -42 v84" stroke="#fdf6e0" stroke-width="5" opacity=".85"/>' +
         '<rect x="34" y="-64" width="36" height="26" rx="6" fill="#a8815a" stroke="#5d4a33" stroke-width="2"/>' +
         '<path d="M40 -64 q 12 -16 24 0" fill="none" stroke="#5d4a33" stroke-width="2.5"/></g>';
    s += '<g transform="translate(2740,1190)">';
    for (var st = 0; st < 6; st++) {
      var an = st * Math.PI / 3;
      s += '<rect x="' + Math.round(Math.cos(an) * 96 - 9) + '" y="' + Math.round(-Math.sin(an) * 30 - 26) + '" width="18" height="36" rx="6" fill="#9aa0a8" stroke="#6d7278" stroke-width="2"/>';
    }
    s += "</g>";
    var FLC = ["#e58fb1", "#f2c14e", "#b18fe5", "#e2543e", "#8fc3e8"];
    for (var fi = 0; fi < 46; fi++) {
      var fx = WORLD.x0 + 260 + ((fi * 977) % (WORLD.x1 - WORLD.x0 - 500));
      var fy = 1075 + ((fi * 613) % 470);
      s += '<g transform="translate(' + fx + "," + fy + ')"><circle r="4.5" fill="' + FLC[fi % 5] + '"/><circle r="1.8" fill="#fdf3d8"/></g>';
    }
    for (var gi = 0; gi < 30; gi++) {
      var gx = WORLD.x0 + 160 + ((gi * 1327) % (WORLD.x1 - WORLD.x0 - 300));
      var gy = 430 + ((gi * 811) % 1120);
      if (gx > -140 && gx < 1660 && gy < 1010) continue; // keep the town itself tidy
      s += '<path d="M' + gx + " " + gy + " q 3 -15 0 -20 M" + (gx + 8) + " " + gy + ' q -2 -13 2 -19" stroke="#6f9a55" stroke-width="3" fill="none" stroke-linecap="round"/>';
    }

    // river through the town, flowing on toward the hills both ways
    var riverD = "M-300 980 Q 200 900 420 760 T 760 560 T 1180 430 T 1700 350";
    s += '<path d="' + riverD + '" fill="none" stroke="#7fb5d8" stroke-width="46" stroke-linecap="round" opacity=".85"/>';
    s += '<path d="' + riverD + '" fill="none" stroke="#a9d0e8" stroke-width="26" stroke-linecap="round" opacity=".9"/>';
    s += '<path d="M1700 350 Q 2010 295 2240 262 T 2720 236" fill="none" stroke="#7fb5d8" stroke-width="32" stroke-linecap="round" opacity=".8"/>';
    s += '<path d="M1700 350 Q 2010 295 2240 262 T 2720 236" fill="none" stroke="#a9d0e8" stroke-width="17" stroke-linecap="round" opacity=".85"/>';
    s += '<path d="M-300 980 Q -520 1062 -700 1184 T -1074 1408" fill="none" stroke="#7fb5d8" stroke-width="44" stroke-linecap="round" opacity=".82"/>';
    s += '<path d="M-300 980 Q -520 1062 -700 1184 T -1074 1408" fill="none" stroke="#a9d0e8" stroke-width="24" stroke-linecap="round" opacity=".88"/>';

    // paths between places
    var roads = [
      [300, 500, 520, 580], [520, 580, 700, 735], [520, 580, 685, 465],
      [685, 465, 905, 385], [905, 385, 1065, 490], [905, 385, 950, 675],
      [950, 675, 885, 825], [885, 825, 1105, 795], [1065, 500, 1200, 635],
      [1200, 635, 1335, 715], [470, 395, 300, 500], [165, 345, 300, 500],
      [205, 660, 300, 500], [1065, 500, 1300, 250], [1300, 250, 1440, 530],
      [520, 795, 700, 735], [825, 575, 905, 395]
    ];
    roads.forEach(function (r) {
      var mx = (r[0] + r[2]) / 2 + 24, my = (r[1] + r[3]) / 2 - 18;
      s += '<path d="M' + r[0] + " " + r[1] + " Q " + mx + " " + my + " " + r[2] + " " + r[3] + '" fill="none" stroke="#d9c49a" stroke-width="15" stroke-linecap="round" opacity=".9"/>';
    });
    // street lanterns along the town roads - plain iron lamps by day,
    // each one a small bright core with its own pool of light at night
    function lamp(x, y) {
      return '<g transform="translate(' + x + "," + y + ')">' +
        '<ellipse class="wm-night-only" cx="0" cy="4" rx="36" ry="10" fill="url(#wm-pool)"/>' +
        '<rect x="-2" y="-46" width="4" height="46" rx="1.5" fill="#3f3428"/>' +
        '<path d="M-7 -46 h14 l-3 -11 h-8 Z" fill="#3f3428"/>' +
        '<rect x="-4.5" y="-56" width="9" height="10" rx="2" fill="#dfe3e8" stroke="#3f3428" stroke-width="1.5"/>' +
        '<rect class="wm-night-only" x="-4.5" y="-56" width="9" height="10" rx="2" fill="#ffd98a" stroke="#3f3428" stroke-width="1.5"/>' +
        '<circle class="wm-night-only" cx="0" cy="-51" r="17" fill="url(#wm-lamp)"/>' +
        "</g>";
    }
    [[395, 545], [612, 522], [795, 432], [1002, 432], [915, 742], [1146, 568], [605, 762], [242, 418]].forEach(function (lp) {
      s += lamp(lp[0], lp[1]);
    });
    // moonlight glinting off the river
    s += '<g class="wm-night-only" stroke="#d8e6f8" stroke-width="3.5" stroke-linecap="round" opacity=".7">' +
         '<path d="M846 520 l26 -10 M956 488 l24 -9 M1064 460 l22 -8 M1172 434 l20 -7 M700 592 l24 -11"/></g>';

    // scattered trees & bushes (town and the wider valley)
    var deco = [[90, 480], [620, 340], [780, 300], [1500, 700], [400, 880], [1250, 880], [60, 800], [1530, 380], [740, 610],
                [1900, 520], [2360, 560], [-210, 700], [2820, 880], [3360, 1010], [-720, 1108], [2060, 1268], [910, 1452], [-1120, 1360], [1760, 866], [3050, 760], [2480, 1120], [130, 1180]];
    deco.forEach(function (d) {
      s += '<g transform="translate(' + d[0] + "," + d[1] + ')"><rect x="-4" y="-26" width="8" height="26" fill="#8a6242"/><circle cx="0" cy="-40" r="22" fill="#6ca25e"/><circle cx="-14" cy="-30" r="14" fill="#5d9455"/></g>';
    });
    // clouds, low and high
    s += '<g class="wm-cloud"><ellipse cx="300" cy="80" rx="90" ry="26" fill="#fff" opacity=".9"/><ellipse cx="370" cy="96" rx="60" ry="20" fill="#fff" opacity=".75"/></g>';
    s += '<g class="wm-cloud wm-cloud2"><ellipse cx="1100" cy="120" rx="110" ry="30" fill="#fff" opacity=".85"/></g>';
    s += '<g class="wm-cloud"><ellipse cx="-1050" cy="-420" rx="120" ry="32" fill="#fff" opacity=".85"/><ellipse cx="-960" cy="-400" rx="70" ry="22" fill="#fff" opacity=".7"/></g>';
    s += '<g class="wm-cloud wm-cloud2"><ellipse cx="1750" cy="-560" rx="150" ry="38" fill="#fff" opacity=".8"/></g>';
    s += '<g class="wm-cloud"><ellipse cx="3150" cy="-150" rx="100" ry="26" fill="#fff" opacity=".85"/><ellipse cx="3230" cy="-132" rx="60" ry="18" fill="#fff" opacity=".7"/></g>';
    s += '<g class="wm-cloud wm-cloud2"><ellipse cx="-420" cy="60" rx="90" ry="24" fill="#fff" opacity=".8"/></g>';

    // the places
    placed.forEach(function (pl) {
      var paint = (PAINTERS[pl.L.kind] || PAINTERS.generic)();
      s += '<g class="wm-b" data-id="' + pl.p.id + '" transform="translate(' + pl.L.x + "," + pl.L.y + ')">' +
        // at night the lit windows spill a pool of light onto the ground at
        // the building's feet - light falls DOWN from a source, no halos
        '<ellipse class="wm-night-only" cx="0" cy="8" rx="64" ry="14" fill="url(#wm-pool)"/>' +
        '<ellipse cx="0" cy="4" rx="70" ry="14" fill="rgba(60,50,30,.14)"/>' + paint +
        '<g class="wm-board"><rect x="-58" y="14" width="116" height="26" rx="6" fill="#f7ecd2" stroke="' + INK + '" stroke-width="1.8"/>' +
        '<text x="0" y="32" text-anchor="middle" font-size="15" font-weight="600" fill="' + INK + '">' + pl.L.label + "</text></g>" +
        '<rect class="wm-hit" x="-80" y="-150" width="160" height="200" fill="transparent"/></g>';
    });

    // Suu wanders the map too
    s += '<g id="wm-suu" transform="translate(760,600)">' +
      '<ellipse cx="0" cy="12" rx="14" ry="4" fill="rgba(60,50,30,.2)"/>' +
      '<path d="M0 -18 C-11 -18 -14 -8 -13 -1 C-12 8 -7 11 0 11 C7 11 12 8 13 -1 C14 -8 11 -18 0 -18 Z" fill="#2a251d"/>' +
      '<circle cx="-4.5" cy="-5" r="3.6" fill="#fffdf4"/><circle cx="4.5" cy="-5" r="3.6" fill="#fffdf4"/>' +
      '<circle cx="-3.8" cy="-4.4" r="1.5" fill="#17130d"/><circle cx="5.2" cy="-4.4" r="1.5" fill="#17130d"/></g>';

    s += "</g></svg>";
    if (night) {
      // moonlight palette: every scenery pigment shifts toward indigo dusk,
      // while building windows / signboards keep their day colors - a village
      // of lit lanterns under the stars
      var NIGHT = {
        "8fc3e8": "101a30", "d8ecdf": "2c3a5c", "9dbb79": "37473d", "b5cfa0": "41544a",
        "8db06c": "3d5244", "8fa7c0": "232f4a", "f4f7fb": "93a4c4", "7d9a6d": "2e4038",
        "7fb5d8": "38567c", "a9d0e8": "557a9e", "d9c49a": "6e6350", "6ca25e": "2f4f3a",
        "5d9455": "2a4834", "549049": "264430", "4d7f52": "26422f", "568a58": "2a4a33",
        "5f9455": "2d4d36", "8a6242": "4f3b2c", "7a5a3c": "453325", "a4bf7d": "465a42",
        "dcc47e": "6b5c38", "b99b50": "57472e", "d9b878": "65563a", "a8854c": "57452c",
        "eaf5fb": "9db8cc", "cfe6f4": "7d99b5", "6f9a55": "39543a", "9aa0a8": "6a7280",
        "6d7278": "4a5058", "c25742": "7a3a2e", "a83c2c": "5f2a20", "e2543e": "8a3a2c",
        "e2765a": "8a4a3a", "e58fb1": "7a5468", "f2c14e": "8a7434", "b18fe5": "615080"
      };
      Object.keys(NIGHT).forEach(function (k) { s = s.split("#" + k).join("#" + NIGHT[k]); });
      s = s.split('fill="#fff"').join('fill="#5a6884"');   // clouds & smoke go dusky
    }
    return s;
  }

  /* ---------- detail panel (same data, in-map) ---------- */
  function openDetail(p) {
    closeDetail();
    var panel = el("div", "wm-detail");
    panel.id = "wm-detail";
    var close = el("button", "wm-x", "×");
    close.addEventListener("click", closeDetail);
    panel.appendChild(close);
    panel.appendChild(el("p", "wm-d-cat", (window.PORTFOLIO_APP.CATEGORY_LABELS[p.category] || p.category) + " · " + (p.year || "")));
    panel.appendChild(el("h3", null, p.title));
    panel.appendChild(el("p", "wm-d-sub", p.subtitle));
    [["THE PROBLEM", "problem"], ["WHAT I BUILT", "action"], ["THE RESULT", "outcome"]].forEach(function (pair) {
      var para = el("p", "wm-d-case");
      para.appendChild(el("b", null, pair[0]));
      para.appendChild(el("span", null, p[pair[1]]));
      panel.appendChild(para);
    });
    var tags = el("div", "feature-stack");
    (p.stack || []).forEach(function (t) { tags.appendChild(el("span", "tag", t)); });
    panel.appendChild(tags);
    if (p.links && p.links.length) {
      var lr = el("div", "proj-links");
      p.links.forEach(function (l) {
        if (!l.url) return;
        var a = document.createElement("a");
        a.className = "tag proj-link";
        a.textContent = l.label + " ↗";
        a.href = l.url;
        if (!/^[a-z-]+\.html/.test(l.url)) { a.target = "_blank"; a.rel = "noopener"; }
        lr.appendChild(a);
      });
      panel.appendChild(lr);
    }
    var ex = el("div", "feature-exhibit");
    panel.appendChild(ex);
    overlay.appendChild(panel);
    window.PORTFOLIO_EXHIBITS.render(ex, p);
  }
  function closeDetail() {
    var d = document.getElementById("wm-detail");
    if (d) d.remove();
  }

  /* ---------- pan / zoom (camera clamped inside WORLD) ---------- */
  function viewRect(svg) {
    // the visible region in viewBox units (preserveAspectRatio="meet" centers
    // the 1600x1000 box, so the viewport can be wider or taller than it)
    var w = svg.clientWidth || 1600, h = svg.clientHeight || 1000;
    var m = Math.min(w / 1600, h / 1000) || 1;
    var vw = w / m, vh = h / m;
    return { x: 800 - vw / 2, y: 500 - vh / 2, w: vw, h: vh };
  }
  function toView(svg, clientX, clientY) {
    var r = svg.getBoundingClientRect();
    var m = Math.min(r.width / 1600, r.height / 1000) || 1;
    return { x: 800 + (clientX - (r.left + r.width / 2)) / m,
             y: 500 + (clientY - (r.top + r.height / 2)) / m };
  }
  function applyPan() {
    if (svgEl) {
      var v = viewRect(svgEl);
      // never zoom out past the painted world, never pan beyond its edges
      var minS = Math.max(v.w / (WORLD.x1 - WORLD.x0), v.h / (WORLD.y1 - WORLD.y0));
      scale = Math.min(2.6, Math.max(minS, scale));
      tx = Math.min(v.x - WORLD.x0 * scale, Math.max(v.x + v.w - WORLD.x1 * scale, tx));
      ty = Math.min(v.y - WORLD.y0 * scale, Math.max(v.y + v.h - WORLD.y1 * scale, ty));
    }
    panG.setAttribute("transform", "translate(" + tx + "," + ty + ") scale(" + scale + ")");
  }
  function zoomAt(factor, cx, cy) {
    var s0 = scale, s1 = Math.min(2.6, Math.max(0.2, s0 * factor));
    tx = cx - (cx - tx) * (s1 / s0);
    ty = cy - (cy - ty) * (s1 / s0);
    scale = s1;
    applyPan();
  }
  function wirePanZoom(svg) {
    var pointers = {}, lastDist = 0, moved = 0, downTarget = null;
    svg.addEventListener("pointerdown", function (ev) {
      pointers[ev.pointerId] = [ev.clientX, ev.clientY];
      moved = 0;
      downTarget = ev.target;
      try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* synthetic events */ }
    });
    svg.addEventListener("pointermove", function (ev) {
      if (!pointers[ev.pointerId]) return;
      var ids = Object.keys(pointers);
      var prev = pointers[ev.pointerId];
      var r = svg.getBoundingClientRect();
      var k = 1 / (Math.min(r.width / 1600, r.height / 1000) || 1);   // css px -> viewBox units
      if (ids.length === 1) {
        tx += (ev.clientX - prev[0]) * k;
        ty += (ev.clientY - prev[1]) * k;
        moved += Math.abs(ev.clientX - prev[0]) + Math.abs(ev.clientY - prev[1]);
        applyPan();
      } else if (ids.length === 2) {
        pointers[ev.pointerId] = [ev.clientX, ev.clientY];
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (lastDist) {
          var mid = toView(svg, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
          zoomAt(dist / lastDist, mid.x, mid.y);
        }
        lastDist = dist;
      }
      pointers[ev.pointerId] = [ev.clientX, ev.clientY];
    });
    function up(ev) {
      delete pointers[ev.pointerId];
      lastDist = 0;
    }
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
    svg.addEventListener("wheel", function (ev) {
      ev.preventDefault();
      var pt = toView(svg, ev.clientX, ev.clientY);
      zoomAt(ev.deltaY < 0 ? 1.12 : 0.89, pt.x, pt.y);
    }, { passive: false });
    // treat as click only if the pointer barely moved; pointer capture makes
    // the click event land on the svg itself, so resolve the building from
    // the element the pointer actually went DOWN on
    svg.addEventListener("click", function (ev) {
      if (moved > 8) return;
      var src = (ev.target.closest && ev.target.closest(".wm-b")) ||
                (downTarget && downTarget.closest && downTarget.closest(".wm-b"));
      if (!src) return;
      var id = src.getAttribute("data-id");
      var p = null;
      projects().forEach(function (x) { if (x.id === id) p = x; });
      if (!p) return;
      walkSuuTo(src);
      if (id === "vr-escape-room") {
        setTimeout(function () { window.location.href = "kellie.html"; }, reduced ? 0 : 550);
        return;
      }
      openDetail(p);
    });
  }

  /* ---------- Suu: walks to what you click, and by WASD / arrows ---------- */
  var suuAnim = null, suuX = 760, suuY = 600, suuFace = 1;
  var keys = { up: 0, down: 0, left: 0, right: 0 }, kbRaf = null, kbLast = 0;
  var KEYMAP = { w: "up", arrowup: "up", s: "down", arrowdown: "down",
                 a: "left", arrowleft: "left", d: "right", arrowright: "right" };
  function renderSuu(bob) {
    if (suuG) suuG.setAttribute("transform", "translate(" + suuX + "," + (suuY - (bob || 0)) + ") scale(" + suuFace + ",1)");
  }
  function walkSuuTo(buildingG) {
    if (!suuG) return;
    var m = /translate\(([-\d.]+)[ ,]([-\d.]+)\)/.exec(buildingG.getAttribute("transform"));
    if (!m) return;
    var txB = parseFloat(m[1]) - 95, tyB = parseFloat(m[2]) + 6;
    var sx = suuX, sy = suuY;
    suuFace = txB >= sx ? 1 : -1;
    if (reduced) { suuX = txB; suuY = tyB; renderSuu(0); return; }
    if (suuAnim) cancelAnimationFrame(suuAnim);
    var t0 = performance.now(), dur = 900;
    (function step(now) {
      var kk = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - kk, 3);
      suuX = sx + (txB - sx) * e;
      suuY = sy + (tyB - sy) * e;
      renderSuu(Math.abs(Math.sin(kk * Math.PI * 5)) * 9);
      if (kk < 1) suuAnim = requestAnimationFrame(step); else suuAnim = null;
    })(t0);
  }
  function followSuu() {
    // nudge the camera so Suu stays inside the middle of the view
    if (!svgEl) return;
    var v = viewRect(svgEl);
    var px = tx + scale * suuX, py = ty + scale * suuY;
    var mX = v.w * 0.22, mY = v.h * 0.22;
    if (px < v.x + mX) tx += (v.x + mX) - px;
    else if (px > v.x + v.w - mX) tx -= px - (v.x + v.w - mX);
    if (py < v.y + mY) ty += (v.y + mY) - py;
    else if (py > v.y + v.h - mY) ty -= py - (v.y + v.h - mY);
    applyPan();
  }
  function kbStep(now) {
    kbRaf = null;
    if (!open || !suuG) return;
    var dx = keys.right - keys.left, dy = keys.down - keys.up;
    if (!dx && !dy) { renderSuu(0); return; }
    var dt = Math.min(0.05, (now - kbLast) / 1000);
    kbLast = now;
    var inv = 1 / Math.hypot(dx, dy);
    suuX = Math.max(WORLD.x0 + 70, Math.min(WORLD.x1 - 70, suuX + dx * inv * 320 * dt));
    suuY = Math.max(350, Math.min(WORLD.y1 - 60, suuY + dy * inv * 320 * dt)); // stays on the ground
    if (dx) suuFace = dx > 0 ? 1 : -1;
    renderSuu(reduced ? 0 : Math.abs(Math.sin(now / 110)) * 7);
    followSuu();
    kbRaf = requestAnimationFrame(kbStep);
  }

  /* ---------- list fallback ---------- */
  function toggleList() {
    var ex = document.getElementById("wm-list");
    if (ex) { ex.remove(); return; }
    var box = el("div", "wm-detail wm-list");
    box.id = "wm-list";
    var close = el("button", "wm-x", "×");
    close.addEventListener("click", function () { box.remove(); });
    box.appendChild(close);
    box.appendChild(el("h3", null, "Every place in the valley"));
    var cats = window.PORTFOLIO_APP.CATEGORY_LABELS;
    Object.keys(cats).forEach(function (cat) {
      var any = projects().some(function (p) { return p.category === cat; });
      if (!any) return;
      box.appendChild(el("p", "wm-d-cat", cats[cat]));
      var ul = el("ul", "wm-list-ul");
      projects().forEach(function (p) {
        if (p.category !== cat) return;
        var li = el("li");
        var a = el("button", "wm-list-item", (LAYOUT[p.id] ? LAYOUT[p.id].label + " - " : "") + p.title);
        a.addEventListener("click", function () {
          box.remove();
          if (p.id === "vr-escape-room") { window.location.href = "kellie.html"; return; }
          openDetail(p);
        });
        li.appendChild(a);
        ul.appendChild(li);
      });
      box.appendChild(ul);
    });
    overlay.appendChild(box);
  }

  /* ---------- open / close ---------- */
  function renderValley() {
    // paints (or repaints, on theme flip) the valley to match the site theme
    var night = document.documentElement.getAttribute("data-theme") === "dark";
    overlay.classList.toggle("wm-night", night);
    var old = document.getElementById("wm-svg");
    if (old) old.remove();
    overlay.insertAdjacentHTML("beforeend", valleySvg(night));
    panG = document.getElementById("wm-pan");
    suuG = document.getElementById("wm-suu");
    svgEl = document.getElementById("wm-svg");
    renderSuu(0);
    applyPan();
    wirePanZoom(svgEl);
  }
  function openMap() {
    if (open) return;
    open = true;
    overlay = el("div", "worldmap");
    overlay.id = "worldmap";
    var bar = el("div", "wm-bar");
    var back = el("button", "btn btn-small", "← Back to the story");
    back.addEventListener("click", closeMap);
    bar.appendChild(back);
    bar.appendChild(el("span", "wm-title", "The valley - drag to wander · scroll to zoom · WASD / arrows walk Suu · click a building"));
    var list = el("button", "btn btn-small", "List view");
    list.addEventListener("click", toggleList);
    bar.appendChild(list);
    overlay.appendChild(bar);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    tx = 0; ty = 0; scale = 1;
    suuX = 760; suuY = 600; suuFace = 1;
    keys.up = keys.down = keys.left = keys.right = 0;
    renderValley();
    if (!reduced) {
      overlay.classList.add("wm-wipe");
      setTimeout(function () { overlay.classList.remove("wm-wipe"); }, 900);
    }
    if (location.hash !== "#map") history.pushState(null, "", "#map");
  }
  function closeMap() {
    if (!open) return;
    open = false;
    overlay.remove();
    overlay = null;
    panG = suuG = svgEl = null;
    keys.up = keys.down = keys.left = keys.right = 0;
    document.body.style.overflow = "";
    if (location.hash === "#map") history.pushState(null, "", location.pathname);
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var cta = document.querySelector(".hero-cta");
    if (cta) {
      var b = el("a", "btn btn-ghost magnetic", "🗺 Explore the valley");
      b.href = "#map";
      b.id = "btn-map";
      b.addEventListener("click", function (ev) { ev.preventDefault(); openMap(); });
      cta.appendChild(b);
    }
    window.addEventListener("hashchange", function () {
      if (location.hash === "#map") openMap();
      else closeMap();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && open) {
        if (document.getElementById("wm-detail") || document.getElementById("wm-list")) {
          closeDetail();
          var l = document.getElementById("wm-list");
          if (l) l.remove();
        } else closeMap();
      }
    });
    // WASD / arrow keys walk Suu (only in map mode, and not while a panel is open)
    document.addEventListener("keydown", function (ev) {
      if (!open) return;
      var k = KEYMAP[(ev.key || "").toLowerCase()];
      if (!k) return;
      if (document.getElementById("wm-detail") || document.getElementById("wm-list")) return;
      ev.preventDefault();
      if (suuAnim) { cancelAnimationFrame(suuAnim); suuAnim = null; }
      keys[k] = 1;
      if (!kbRaf) { kbLast = performance.now(); kbRaf = requestAnimationFrame(kbStep); }
    });
    document.addEventListener("keyup", function (ev) {
      var k = KEYMAP[(ev.key || "").toLowerCase()];
      if (k) keys[k] = 0;
    });
    window.addEventListener("blur", function () {
      keys.up = keys.down = keys.left = keys.right = 0;
    });
    window.addEventListener("resize", function () {
      if (open && panG) applyPan();
    });
    // theme flip while the map is open -> repaint the valley to match
    new MutationObserver(function () {
      if (open) renderValley();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    if (location.hash === "#map") openMap();
  });

  window.PORTFOLIO_WORLDMAP = {
    open: openMap,
    close: closeMap,
    view: function (x, y, s) {   // debug / test hook: jump the camera
      if (!open) return;
      if (s) scale = s;
      tx = x; ty = y;
      applyPan();
    }
  };
})();
