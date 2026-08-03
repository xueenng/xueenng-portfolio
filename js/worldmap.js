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

  /* ---------- where everything lives (id -> place) ----------
     The stall / exchange house / tavern / warehouse row steps by about
     (+215, -65) a building, so it reads as ONE line receding up the valley
     rather than as four places that happen to be near each other.
     The Document Mill sits 56 higher than its blueprint spot for one reason:
     at 886 its label lands squarely on the Exchange House's roof. It still
     stands beside the water, and on firmer ground than before - its footprint
     straddled the bank. Move it back down and that label collides again. */
  var LAYOUT = {
    "vr-escape-room":             { x: 3068, y: 1055, kind: "castle",  label: "Kellie's Castle" },
    "do-pipeline":                { x: 1665, y: 830,  kind: "mill",    label: "Document Mill" },
    "forex-sync":                 { x: 1767, y: 1022,  kind: "kiosk",   label: "Exchange House" },
    "notify-hub":                 { x: 2649, y: 872,  kind: "post",    label: "Post Office" },
    "ssrs-monitor":               { x: 932,  y: 890,  kind: "tower",   label: "Watchtower" },
    "ops-portal":                 { x: 2579, y: 1659, kind: "hall",    label: "Town Hall" },
    "work-record":                { x: 1212, y: 1280, kind: "print",   label: "Print Shop" },
    "student-routine-organizer":  { x: 2175, y: 1209, kind: "school",  label: "Schoolhouse" },
    "mindharmony":                { x: 1438, y: 745,  kind: "pavilion", label: "Calm Garden" },
    "ai-waste-sorting":           { x: 1098, y: 925,  kind: "shed",    label: "Sorting Shed" },
    "ar-fire-extinguisher":       { x: 2813, y: 1364, kind: "fire",    label: "Fire Station" },
    "vr-fire-extinguisher":       { x: 3089, y: 1477, kind: "drill",   label: "Drill Tower" },
    "math-adventure":             { x: 2600, y: 1055, kind: "tent",    label: "Number Tent" },
    "stock-management":           { x: 2181, y: 874,  kind: "barn",    label: "Warehouse" },
    "fruit-stall-inventory":      { x: 1539, y: 1072, kind: "stall",   label: "Fruit Stall" },
    "food-ordering":              { x: 1973, y: 938,  kind: "tavern",  label: "Tavern" },
    "library-student-management": { x: 2466, y: 1238, kind: "library", label: "Library" },
    "student-record-bst":         { x: 1013, y: 1139, kind: "tree",    label: "The Sorting Tree" }
  };

  /* ---------- free flight ----------
     Flight used to be three stacked CSS keyframe loops: a traverse, a sine bob,
     and a bank that followed the bob. That is periodic BY CONSTRUCTION - watch
     one bird for a minute and the loop shows, which is exactly what reads as
     "flying in a sine". No arrangement of keyframes fixes it, because a
     keyframe animation is a closed path by definition.

     So the path is now integrated per frame from a steering model instead. The
     WING stays a CSS frame loop, because a wingbeat genuinely IS periodic - it
     is only the PATH that must never repeat. That keeps the two-system split
     that made this work in the first place: wing animation and flight movement
     remain independent, they just no longer share a mechanism. */
  var FLIERS = [];
  var flyRaf = null, flyLast = 0;

  /* One sprite that the animator drives. The art is drawn from its top-left, so
     the inner shift puts the sprite's CENTRE on the origin - otherwise every
     tilt would swing the bird around its own shoulder. */
  function flierNode(name) {
    var m = window.WORLD_ART && window.WORLD_ART.sprites[name];
    if (!m) return "";
    var id = "wm-clip-" + (seqId++);
    return '<g class="wm-flier">' +
      '<g transform="translate(' + (-m.w / 2) + ',' + (-m.h / 2) + ')">' +
      '<clipPath id="' + id + '"><rect x="0" y="0" width="' + m.w + '" height="' + m.h + '"/></clipPath>' +
      '<g clip-path="url(#' + id + ')">' +
      '<image class="wm-wing" href="assets/world/sprites/' + name + '.webp" ' +
      'x="0" y="0" width="' + (m.w * m.frames) + '" height="' + m.h + '"/>' +
      "</g></g></g>";
  }

  /* ---------- wingbeat ----------
     The strip holds ~4.7 beats, not one, so running it as a single CSS loop in
     a second flapped at 4.7Hz - sparrow-fast for a bird crossing a valley.
     Worse, a CSS loop flaps FOREVER at one rate, and that is the tell: a real
     bird flaps in bursts and then glides on held wings, and beats harder going
     up than coming down. So the wing is driven here now, beside the flight.
     It costs one transform write per bird and buys behaviour a keyframe
     cannot express. */
  var FRAMES_PER_BEAT = 27 / 4.7;
  var GLIDE_FRAME = 8;        // measured: the widest, flattest pose in the strip

  function stepWing(f, dt) {
    var sp = f.sprite;
    if (!sp) return;
    if (f.kind === "bfly") {          // butterflies never stop beating
      f.wf = (f.wf + f.hz * dt) % sp.frames;
      return;
    }
    f.wt -= dt;
    if (f.mode === "glide") {
      f.wf = GLIDE_FRAME;             // a glide holds the wings OUT, it is not a paused flap
      if (f.wt <= 0) { f.mode = "flap"; f.wt = rnd(1.1, 3.0); }
      return;
    }
    // climbing costs effort; descending, the bird eases off
    var eff = 1 + Math.max(-0.3, Math.min(0.45, -f.a * 1.2));
    f.wf = (f.wf + f.hz * FRAMES_PER_BEAT * eff * dt) % sp.frames;
    if (f.wt <= 0) {
      f.mode = "glide";
      // little gliding while climbing - you cannot coast uphill
      f.wt = f.a < -0.12 ? rnd(0.3, 0.8) : rnd(0.9, 2.4);
    }
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* A bird holds a course and wanders off it. `turn` is a DAMPED random walk
     rather than raw noise, so a turn eases in and eases out the way a real one
     does; feeding random straight into the angle gives a twitch, not a bank. */
  function bird(dir, y0, y1) {
    return {
      kind: "bird",
      dir: dir, x: dir > 0 ? rnd(-300, WORLD.x1) : rnd(0, WORLD.x1 + 300),
      y: rnd(y0, y1), y0: y0, y1: y1,
      spd: rnd(46, 82), a: rnd(-0.2, 0.2), turn: 0, jit: rnd(0.5, 1.0),
      s: rnd(0.42, 0.8),
      hz: rnd(1.5, 2.1), wf: rnd(0, 27), mode: "flap", wt: rnd(0.4, 2.6)
    };
  }

  /* A follower keeps station on a leader instead of flying its own course, so
     the formation bends when the leader turns rather than sliding as a block.
     The offset is measured BEHIND the leader, so it flips with the leader's
     direction. `wob` is that member's own drift - without it the formation is
     rigid, which is the cut-out look this is meant to avoid. */
  function follower(lead, ox, oy, s) {
    return {
      kind: "bird", lead: lead, ox: ox, oy: oy, s: s,
      x: lead.x, y: lead.y, a: 0, dir: lead.dir,
      wx: 0, wy: 0, wvx: 0, wvy: 0,
      hz: rnd(1.5, 2.1), wf: rnd(0, 27), mode: "flap", wt: rnd(0.4, 2.6)
    };
  }

  /* Butterflies do not travel - they potter about one patch of meadow. Free 2D
     heading with a hard pull back when they stray past their home radius, which
     is what keeps them over grass without scripting a path. */
  function butterfly(hx, hy, r) {
    return {
      kind: "bfly", x: hx, y: hy, hx: hx, hy: hy, r: r,
      hdg: rnd(0, Math.PI * 2), spd: rnd(16, 30), turn: 0, jit: rnd(3.2, 5.5),
      s: rnd(0.17, 0.24), hz: rnd(18, 24), wf: rnd(0, 30)
    };
  }

  /* ---------- the train ----------
     The train rides the rail path measured at build time - WORLD_ART.railPath,
     the midpoint BETWEEN the two rails, which is the axle line. It used to run
     on a straight CSS translate, and a straight line can only agree with a
     curved one at two points: seating the train on the rail at one phase left
     it ~20 units off at another, so its height and angle kept needing another
     hand-tuned constant. Position AND tilt now come from the measurement, so
     re-drawing the track re-fits the train instead of starting another round
     of nudging. */
  var TRAIN = null;
  var TRAIN_SECS = 46;

  function trainNode() {
    var art = window.WORLD_ART;
    var nat = art && art.scenery && art.scenery["steam-train"];
    var ax = art && art.trainAxle;
    if (!nat || !ax) return "";
    var w = 520, k = w / nat[0], h = Math.round(nat[1] * k);
    /* Hang the sprite from its MEASURED axle, not its bbox. The train is drawn
       on a slope, so its bottom edge is a corner - hanging it there put the
       wheels wherever the corner happened to fall. The origin is the wheel
       line at the sprite's centre, which is also the right pivot to rotate
       about. */
    TRAIN = { u: 0, w: w, h: h, deg: ax.deg, node: null };
    /* Smoke lives INSIDE the train's group, so it travels and tilts with the
       engine instead of being left behind on the meadow. It starts at the
       measured funnel and hangs from its own base, so the plume rises out of
       the stack rather than through it. */
    var sm = window.WORLD_ART.sprites.smoke;
    var puff = "";
    if (sm) {
      /* Big enough to read as steam at map zoom. At 0.30 the plume was there
         but nobody noticed it - a pale wisp on a green meadow needs size to
         register at all. */
      var ss = 1.05;
      /* Anchored on the plume's MEASURED emission point, not the frame's
         centre-bottom. The puff leaves the frame's lower left and drifts up
         and right, so centring the frame put the source beside the stack -
         and scale-dependently, since half the frame width grows with ss. That
         is what the old hand-tuned nudge was really compensating for; with the
         emission point anchored, the plume stays on the stack at any size. */
      var o = sm.origin || [sm.w / 2, sm.h];
      /* A small lean forward over the stack, by eye. Applied AFTER the anchor
         so it stays put if the plume is resized - the offset it replaced was
         folded in before the scale and drifted with it. */
      var SMOKE_DX = 8;
      var fx = -w / 2 + ax.funnel[0] * k + SMOKE_DX;
      var fy = -ax.midY * k + ax.funnel[1] * k;
      puff = seq("smoke", fx - o[0] * ss, fy - o[1] * ss, ss, 1.4);
    }
    return '<g class="wm-train"><image href="assets/world/scenery/steam-train.webp" ' +
      'x="' + (-w / 2).toFixed(1) + '" y="' + (-ax.midY * k).toFixed(1) + '" ' +
      'width="' + w + '" height="' + h + '"/>' + puff + '</g>';
  }

  /* World y of the axle line at a world x. Clamped at both ends so a train
     nose sampling past the last rail still gets a sane slope. */
  function railAt(wx) {
    var art = window.WORLD_ART, p = art && art.railPath;
    if (!p || p.length < 2) return null;
    var o = SCENERY[0], k = o[3] / art.scenery.railway[0];
    var lx = (wx - o[1]) / k;
    if (lx <= p[0][0]) return o[2] + p[0][1] * k;
    if (lx >= p[p.length - 1][0]) return o[2] + p[p.length - 1][1] * k;
    for (var i = 1; i < p.length; i++) {
      if (p[i][0] >= lx) {
        var a = p[i - 1], b = p[i];
        return o[2] + (a[1] + (b[1] - a[1]) * (lx - a[0]) / (b[0] - a[0])) * k;
      }
    }
    return null;
  }

  function stepTrain(dt) {
    var t = TRAIN;
    if (!t || !t.node) return;
    var art = window.WORLD_ART, p = art && art.railPath;
    if (!p || p.length < 2) return;
    var o = SCENERY[0], k = o[3] / art.scenery.railway[0];
    var x0 = o[1] + p[0][0] * k;
    /* The run STARTS AT THE STATION, not at the rail's east end: the train is
       parked behind the platform and pulls out of it. Starting further east
       had it trundling along open track before reaching the station, which
       read as passing through rather than departing. */
    var st = SCENERY[1];
    var x1 = st[1] + st[3] / 2;
    t.u += dt / TRAIN_SECS;
    if (t.u > 1) t.u -= 1;
    var x = x1 - (x1 - x0) * t.u;
    var y = railAt(x);
    if (y === null) return;
    /* Tilt is the DIFFERENCE between the track's slope and the slope already
       drawn into the sprite. Rotating by the track's full angle tilts a train
       that is drawn tilted, which is what every hand-tuned angle here was
       really fighting. Measured over the train's own length, so it matches
       what the train spans rather than the slope at one point beneath it. */
    var hw = t.w / 2;
    var track = Math.atan2(railAt(x + hw) - railAt(x - hw), t.w) * 180 / Math.PI;
    var deg = track - t.deg;
    /* Only the WEST end fades. There is nothing to hide at the start - the
       train begins hidden behind the platform and slides out from under it,
       which is a better reveal than a fade, and it means the loop's restart
       happens out of sight too. */
    var f = Math.max(0, Math.min((1 - t.u) / 0.08, 1));
    t.node.setAttribute("transform",
      "translate(" + x.toFixed(1) + "," + y.toFixed(1) + ") rotate(" + deg.toFixed(2) + ")");
    t.node.setAttribute("opacity", f.toFixed(3));
  }

  function stepFlier(f, dt) {
    if (f.lead) {
      // station-keeping: offset trails the leader and flexes with its own drift
      f.dir = f.lead.dir;
      f.wvx += rnd(-1, 1) * 26 * dt; f.wvx -= f.wvx * 1.4 * dt;
      f.wvy += rnd(-1, 1) * 20 * dt; f.wvy -= f.wvy * 1.4 * dt;
      f.wx += f.wvx * dt; f.wy += f.wvy * dt;
      f.wx -= f.wx * 0.5 * dt; f.wy -= f.wy * 0.5 * dt;
      var px = f.lead.x - f.lead.dir * f.ox + f.wx;
      var py = f.lead.y + f.oy + f.wy;
      f.vx = (px - f.x) / Math.max(dt, 0.001);
      f.vy = (py - f.y) / Math.max(dt, 0.001);
      f.x = px; f.y = py;
      f.a = f.lead.a;
      stepWing(f, dt);
      return;
    }

    if (f.kind === "bfly") {
      f.turn += rnd(-1, 1) * f.jit * dt;
      f.turn -= f.turn * 2.6 * dt;
      f.hdg += f.turn * dt;
      var dx = f.x - f.hx, dy = f.y - f.hy;
      if (dx * dx + dy * dy > f.r * f.r) {
        // steer home by the SHORT way round, so it turns back rather than spins
        var home = Math.atan2(-dy, -dx);
        var d = ((home - f.hdg + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        f.hdg += d * 2.4 * dt;
      }
      f.vx = Math.cos(f.hdg) * f.spd;
      f.vy = Math.sin(f.hdg) * f.spd;
      f.x += f.vx * dt; f.y += f.vy * dt;
      stepWing(f, dt);
      return;
    }

    f.turn += rnd(-1, 1) * f.jit * dt;
    f.turn -= f.turn * 2.2 * dt;
    f.a += f.turn * dt;
    // hold the altitude band: low in the band means climb, high means descend
    var mid = (f.y0 + f.y1) / 2, half = Math.max(1, (f.y1 - f.y0) / 2);
    f.a -= ((f.y - mid) / half) * 0.6 * dt;
    if (f.a > 0.5) f.a = 0.5;
    if (f.a < -0.5) f.a = -0.5;
    f.vx = f.dir * f.spd * Math.cos(f.a);
    f.vy = f.spd * Math.sin(f.a);
    f.x += f.vx * dt; f.y += f.vy * dt;
    // gone past the far edge: come back on the other side, somewhere new
    if (f.dir > 0 && f.x > WORLD.x1 + 320) { f.x = -320; f.y = rnd(f.y0, f.y1); }
    if (f.dir < 0 && f.x < -320) { f.x = WORLD.x1 + 320; f.y = rnd(f.y0, f.y1); }
    stepWing(f, dt);
  }

  /* The art faces LEFT, so a bird travelling right is mirrored. Mirroring first
     and tilting second means the tilt is read in the bird's own frame - nose up
     is nose up whichever way it is facing. Tilt comes from the flight path
     itself, so a climbing bird noses up because it is climbing. */
  function drawFlier(f) {
    if (!f.node) return;
    var sx = (f.vx > 0 ? -f.s : f.s);
    var pitch = -(f.kind === "bfly"
      ? Math.atan2(f.vy, Math.abs(f.vx) + 0.001) * 0.5
      : f.a) * 180 / Math.PI;
    f.node.setAttribute("transform",
      "translate(" + f.x.toFixed(1) + "," + f.y.toFixed(1) + ") " +
      "scale(" + sx.toFixed(3) + "," + f.s.toFixed(3) + ") " +
      "rotate(" + pitch.toFixed(1) + ")");
    if (f.img && f.sprite) {
      f.img.setAttribute("transform",
        "translate(" + (-Math.floor(f.wf) * f.sprite.w) + ",0)");
    }
  }

  function flyStep(now) {
    var dt = Math.min(0.05, (now - flyLast) / 1000) || 0.016;
    flyLast = now;
    for (var i = 0; i < FLIERS.length; i++) {
      stepFlier(FLIERS[i], dt);
      drawFlier(FLIERS[i]);
    }
    stepTrain(dt);
    flyRaf = requestAnimationFrame(flyStep);
  }

  /* Bind the model to the nodes the render just produced, and settle the flock
     before the first paint - otherwise every follower starts stacked on its
     leader and the formation visibly springs apart in the opening second. */
  function startFlight(svg) {
    stopFlight();
    var nodes = svg.querySelectorAll(".wm-flier");
    var sprites = (window.WORLD_ART && window.WORLD_ART.sprites) || {};
    for (var i = 0; i < FLIERS.length && i < nodes.length; i++) {
      FLIERS[i].node = nodes[i];
      FLIERS[i].img = nodes[i].querySelector("image");
      FLIERS[i].sprite = sprites[FLIERS[i].kind === "bfly" ? "butterfly" : "bird"];
      FLIERS[i].vx = FLIERS[i].dir || 1;
      FLIERS[i].vy = 0;
    }
    for (var w = 0; w < 40; w++) {
      for (var j = 0; j < FLIERS.length; j++) stepFlier(FLIERS[j], 0.05);
    }
    FLIERS.forEach(drawFlier);
    if (TRAIN) { TRAIN.node = svg.querySelector(".wm-train"); stepTrain(0); }
    if (reduced) return;      // placed, but never animated
    flyLast = performance.now();
    flyRaf = requestAnimationFrame(flyStep);
  }

  function stopFlight() {
    if (flyRaf) cancelAnimationFrame(flyRaf);
    flyRaf = null;
  }

  /* Scenery placed in world space: [slug, x, y, displayWidth]. Framing reads
     this table too - when only LAYOUT was measured, the station and its line
     fell outside the opening view entirely. */
  var STATION_ID = "wm-station-journey";
  var SCENERY = [
    ["railway", 786, 1802, 2750],
    ["station", 3060, 1690, 680]
  ];

  /* ---------- painted buildings (ground at y=0, as the old painters were) ----------
     kind -> [art slug, display height]. Natural widths come from world-art.js,
     so aspect ratios are never hand-maintained. */
  var INK = "#5d4a33";
  /* Display heights. The six tallest are held where they are - they already set
     the valley's skyline, and growing them too would just restore the old
     crowding; everything else is up 18%, which reads as more substantial
     without pushing any neighbour into its label. */
  var ART = {
    castle:    ["kellies-castle", 415],
    hall:      ["town-hall", 281],       // held
    drill:     ["drill-tower", 267],     // held
    tower:     ["watchtower", 236],      // held
    fire:      ["fire-station", 225],    // held
    kiosk:     ["exchange-house", 166],
    post:      ["post-office", 141],     // held
    stall:     ["fruit-stall", 166],
    tree:      ["sorting-tree", 166],
    mill:      ["document-mill", 137],   // held
    school:    ["schoolhouse", 150],
    pavilion:  ["calm-garden", 150],
    library:   ["library", 150],
    barn:      ["warehouse", 145],
    shed:      ["sorting-shed", 133],
    tavern:    ["tavern", 133],
    print:     ["print-shop", 175],
    tent:      ["number-tent", 116],
    generic:   ["schoolhouse", 150]
  };
  /* [displayWidth, displayHeight, slug] - shared by the building image and the
     night glow, which has to be sized from the building it is lighting. */
  function artSize(kind) {
    var a = ART[kind] || ART.generic;
    var slug = a[0], h = a[1];
    var nat = (window.WORLD_ART && window.WORLD_ART.buildings[slug]) || [h, h];
    return [Math.round(h * (nat[0] / nat[1])), h, slug];
  }
  function paint(kind) {
    var d = artSize(kind);
    return '<image href="assets/world/buildings/' + d[2] + '.webp" ' +
      'x="' + (-Math.round(d[0] / 2)) + '" y="' + (-d[1]) + '" ' +
      'width="' + d[0] + '" height="' + d[1] + '"/>';
  }
  /* Warm light at night, as a gradient bloom rather than a sprite.
     ui/house-glow-yellow.webp looks like the obvious asset but is not one: it is
     a whole painted house WITH a glow, drawn for the kit's normal/hover/selected
     house states, so layering it over a building stamps a second, different
     house on top. A radial bloom is what this actually needs.
     Drawn AFTER the building - underneath it, an opaque building hides the light
     completely - and sized from the building so it spills past the silhouette. */
  function nightGlow(kind) {
    var d = artSize(kind);
    var rx = Math.round(d[0] * 0.78), ry = Math.round(d[1] * 0.72);
    return '<ellipse class="wm-night-only wm-glow-e" cx="0" cy="' + Math.round(-d[1] * 0.45) + '" ' +
      'rx="' + rx + '" ry="' + ry + '" fill="url(#wm-glow)" pointer-events="none"/>';
  }

  /* Story marks the label-free art dropped. These are not labels - they are the
     point of the building that carries them. The tree's 3/8/13 tags were drawn
     here while the art lacked them; the current tree art has them painted in, so
     only the tent's sum is still needed - drawing both would stack tags on tags.
     Sized from the building so it tracks any change to display height, and
     non-interactive so the click target is unaffected. */
  function storyMarks(kind) {
    var d = artSize(kind), w = d[0], h = d[1];
    if (kind === "tent") {
      var bw = Math.round(w * 0.34), bh = Math.round(h * 0.17), by = Math.round(-h * 0.56);
      return '<g pointer-events="none">' +
        '<rect x="' + (-Math.round(bw / 2)) + '" y="' + by + '" width="' + bw + '" height="' + bh +
        '" rx="3" fill="#f2e3bd" stroke="' + INK + '" stroke-width="1.8"/>' +
        '<text x="0" y="' + (by + Math.round(bh * 0.74)) + '" text-anchor="middle" font-size="' +
        Math.round(bh * 0.66) + '" font-weight="700" fill="' + INK + '">1+2</text></g>';
    }
    return "";
  }

  /* ---------- state ---------- */
  var open = false, overlay = null, panG = null, suuG = null, svgEl = null;
  var tx = 0, ty = 0, scale = 1;
  /* The world is a FIXED design space; the plate's pixel size is only a quality
     knob. Deriving world units from plate pixels meant that re-exporting the art
     at a higher resolution silently moved all 18 buildings - LAYOUT coordinates
     are world units, and the world would have grown out from under them. Only
     the plate's ASPECT is read here, so the plate can be re-rendered at any
     resolution without touching a single placement. */
  var WORLD_W = 3840;    // world units across; LAYOUT lives in these
  var PLATE_PX = (window.WORLD_ART && window.WORLD_ART.plate) || [1920, 1060];  // only reached if world-art.js is missing
  var PLATE = { w: WORLD_W, h: Math.round(WORLD_W * PLATE_PX[1] / PLATE_PX[0]) };
  var WORLD = { x0: 0, y0: 0, x1: PLATE.w, y1: PLATE.h };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function projects() {
    return (window.PORTFOLIO_APP && window.PORTFOLIO_APP.content) ? window.PORTFOLIO_APP.content.projects : [];
  }

  /* ---------- ambient sprite loops ----------
     One strip image inside a clip window, slid one frame at a time by CSS
     steps(). --fw/--frames drive the keyframe, so one rule animates them all.

     Two nested groups on purpose: the OUTER one carries the base placement as a
     transform attribute, the INNER one gets the CSS drift animation. A CSS
     transform would otherwise replace the attribute outright and snap the
     sprite to the world origin. Passing a drift makes the thing travel instead
     of flapping on the spot - what "flying freely" needs. */
  var seqId = 0;
  function seq(name, x, y, scale, dur, drift) {
    var m = window.WORLD_ART && window.WORLD_ART.sprites[name];
    if (!m) return "";
    var id = "wm-clip-" + (seqId++);
    var inner = '<g clip-path="url(#' + id + ')">' +
      '<image class="wm-seq" href="assets/world/sprites/' + name + '.webp" ' +
      'x="0" y="0" width="' + (m.w * m.frames) + '" height="' + m.h + '" ' +
      'style="--fw:' + m.w + ';--frames:' + m.frames + ';--dur:' + dur + 's"/></g>';
    if (drift) {
      inner = '<g class="wm-fly" style="--dx:' + drift.dx + 'px;--dy:' + drift.dy +
        'px;--fdur:' + drift.dur + 's">' + inner + "</g>";
    }
    return '<g class="wm-seq-holder" transform="translate(' + x + ',' + y + ') scale(' + scale + ')">' +
      '<clipPath id="' + id + '"><rect x="0" y="0" width="' + m.w + '" height="' + m.h + '"/></clipPath>' +
      inner + "</g>";
  }

  /* Single-image world scenery (station, track, train). Sized from world-art.js
     the same way buildings are, so only a display width is specified here. */
  function scenery(name, x, y, w) {
    var nat = window.WORLD_ART && window.WORLD_ART.scenery && window.WORLD_ART.scenery[name];
    if (!nat) return "";
    var h = Math.round(w * nat[1] / nat[0]);
    // the rail art carries its own slope now, so nothing here needs rotating
    return '<image href="assets/world/scenery/' + name + '.webp" ' +
      'x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>';
  }

  /* One label board, tucked tight under its building's base. The board used to
     hang 14-40 units below, far enough that the Document Mill's reached the
     Warehouse; 3-25 keeps every label over its own footprint. */
  function board(id, x, y, text) {
    var bw = Math.max(58, text.length * 7 + 16);
    return '<g class="wm-board" data-id="' + id + '" transform="translate(' + x + ',' + y + ')">' +
      '<rect x="' + (-Math.round(bw / 2)) + '" y="3" width="' + bw + '" height="22" rx="5" ' +
      'fill="#f7ecd2" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<text x="0" y="18.5" text-anchor="middle" font-size="13" font-weight="600" fill="' + INK + '">' +
      text + '</text></g>';
  }

  /* ---------- build the valley SVG (day, or night when the site is dark) ---------- */
  function valleySvg() {
    var ps = projects();
    var placed = [], southSeat = 0;
    ps.forEach(function (p) {
      var L = LAYOUT[p.id];
      if (!L) { L = { x: 620 + (southSeat++) * 150, y: 920, kind: "generic", label: p.title.slice(0, 16) }; }
      placed.push({ p: p, L: L });
    });

    var s = '<svg id="wm-svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid meet">';
    s += '<defs>' +
         // real light: bright warm core, fast falloff (ground pool)
         '<radialGradient id="wm-pool" cx=".5" cy=".5" r=".5">' +
         '<stop offset="0" stop-color="rgba(255,206,120,.4)"/><stop offset=".5" stop-color="rgba(255,206,120,.16)"/><stop offset="1" stop-color="rgba(255,206,120,0)"/></radialGradient>' +
         // lamplight spilling out of a lit building: warm core, fast falloff
         '<radialGradient id="wm-glow" cx=".5" cy=".5" r=".5">' +
         '<stop offset="0" stop-color="rgba(255,224,150,.55)"/><stop offset=".4" stop-color="rgba(255,206,120,.26)"/><stop offset="1" stop-color="rgba(255,196,110,0)"/></radialGradient>' +
         /* A hard-edged ellipse under a building reads as a sticker's shadow.
            Blurring it turns the contact into a pool the meadow absorbs, which
            is most of what makes a cut-out look like it is standing there. */
         '<filter id="wm-soft" x="-60%" y="-60%" width="220%" height="220%">' +
         '<feGaussianBlur stdDeviation="7"/></filter></defs>';
    s += '<g id="wm-pan">';
    // the painted valley - one plate, filling the whole clamped world
    s += '<image href="assets/world/valley.webp" x="0" y="0" ' +
         'width="' + PLATE.w + '" height="' + PLATE.h + '" ' +
         'preserveAspectRatio="xMidYMid slice"/>';

    /* Railway along the southern meadow, station on its eastern end, both from
       the blueprint. Laid before the buildings so the village sits in front. */
    SCENERY.forEach(function (o) {
      var art = scenery(o[0], o[1], o[2], o[3]);
      // the train is laid between them, so the platform hides it at rest
      if (o[0] !== "station") { s += art + (o[0] === "railway" ? trainNode() : ""); return; }
      /* The station is the one place here that is not a project. It opens the
         journey - the timeline is literally a line of stations - so the biggest
         new asset in the valley does something when a visitor tries it. */
      var nat = window.WORLD_ART && window.WORLD_ART.scenery && window.WORLD_ART.scenery[o[0]];
      var sh = nat ? Math.round(o[3] * nat[1] / nat[0]) : 200;
      s += '<g class="wm-b wm-station" data-id="' + STATION_ID + '" tabindex="0" role="button" ' +
        'aria-label="Train Station - open my journey">' + art +
        '<rect class="wm-hit" x="' + o[1] + '" y="' + o[2] + '" width="' + o[3] +
        '" height="' + sh + '" fill="transparent"/></g>';
    });

    /* The train runs the line on a long loop. It fades at both ends of the run
       so the restart is never seen as a jump - a hard reset on a linear
       translate reads as broken rather than as a timetable. */
    /* Ambient life. Frame sizes are capped at 128px, so a sprite left at scale 1
       renders as tall as a house - birds and butterflies need to be small
       against the buildings, not equal to them. Fliers carry a drift so they
       cross the valley instead of flapping on one spot. */
    s += seq("smoke", 1650,  770, 0.30, 1.6);      // Document Mill chimney
    s += seq("smoke", 1205, 1215, 0.30, 2.1);      // Print Shop chimney

    /* Sky traffic. Real sky is a mix - some birds travel alone, some hold a
       loose group - so it is built as a mix rather than a uniform scatter. Most
       head left to right; a couple cross the other way, because a sky where
       everything moves one direction reads as a conveyor belt. */
    FLIERS = [];
    FLIERS.push(bird( 1, 120, 300), bird( 1, 200, 420), bird( 1, 300, 520),
                bird( 1, 150, 360), bird(-1, 240, 460), bird(-1, 130, 330));

    /* Two flocks. Members trail their leader and flex around it, so the shape
       bends through a turn instead of sliding across as one rigid piece. */
    var lead = bird(1, 170, 340); lead.s = 0.62; lead.spd = 64;
    FLIERS.push(lead,
      follower(lead,  62, -28, 0.54), follower(lead,  64,  29, 0.56),
      follower(lead, 126, -54, 0.47), follower(lead, 129,  56, 0.49));

    var lead2 = bird(1, 90, 210); lead2.s = 0.42; lead2.spd = 44;
    FLIERS.push(lead2,
      follower(lead2, 78,  24, 0.37), follower(lead2, 44, -36, 0.39));

    for (var bi = 0; bi < FLIERS.length; bi++) s += flierNode("bird");

    /* Butterflies potter over open meadow, each round its own patch, kept clear
       of every building so none flits across a roof. */
    [[1750, 1450, 190], [1900, 1560, 160], [2280, 1560, 200],
     [2050, 1490, 170], [1640, 1580, 150]].forEach(function (p) {
      FLIERS.push(butterfly(p[0], p[1], p[2]));
      s += flierNode("butterfly");
    });

    /* A balloon high over the valley, drifting the long way across. */
    s += seq("balloon", 900, 250, 0.78, 2.6, { dx: 2400, dy: -110, dur: 150 });

    /* Two passes. Every building is drawn first, then every label on top, so a
       neighbour can never cover a label - packed blueprint spacing made the
       Warehouse sit over the Document Mill's board and read as "Document M".
       The hit rect tracks the building's real size now that heights vary from
       113 to 234; the old fixed 160x200 was tuned for uniformly larger art. */
    placed.forEach(function (pl) {
      var d = artSize(pl.L.kind);
      var hw = Math.round(d[0] / 2) + 10, hh = d[1] + 16;
      s += '<g class="wm-b" data-id="' + pl.p.id + '" transform="translate(' + pl.L.x + "," + pl.L.y + ')">' +
        // at night the lit windows spill a pool of light onto the ground at
        // the building's feet - light falls DOWN from a source, no halos
        '<ellipse class="wm-night-only" cx="0" cy="8" rx="' + Math.round(d[0] * 0.42) + '" ry="' + Math.round(d[1] * 0.09) + '" fill="url(#wm-pool)"/>' +
        '<ellipse filter="url(#wm-soft)" cx="0" cy="5" rx="' + Math.round(d[0] * 0.44) + '" ry="' + Math.round(d[1] * 0.10) + '" fill="rgba(58,48,28,.20)"/>' + paint(pl.L.kind) +
        nightGlow(pl.L.kind) + storyMarks(pl.L.kind) +
        '<rect class="wm-hit" x="' + (-hw) + '" y="' + (-d[1] - 8) + '" width="' + (hw * 2) + '" height="' + hh + '" fill="transparent"/></g>';
    });

    // labels layer - above every building, never occluded by one
    s += '<g id="wm-labels">';
    (function () {
      var st = SCENERY[1];   // station
      var nat = window.WORLD_ART && window.WORLD_ART.scenery && window.WORLD_ART.scenery.station;
      var base = st[2] + (nat ? Math.round(st[3] * nat[1] / nat[0]) : 269);
      // sit the label on the platform, not across the rails below it
      s += board(STATION_ID, st[1] + Math.round(st[3] / 2), base - 52, "Train Station");
    })();
    placed.forEach(function (pl) { s += board(pl.p.id, pl.L.x, pl.L.y, pl.L.label); });
    s += "</g>";

    // Suu wanders the map too
    s += '<g id="wm-suu" transform="translate(1050,890)">' +
      '<ellipse cx="0" cy="12" rx="14" ry="4" fill="rgba(60,50,30,.2)"/>' +
      '<path d="M0 -18 C-11 -18 -14 -8 -13 -1 C-12 8 -7 11 0 11 C7 11 12 8 13 -1 C14 -8 11 -18 0 -18 Z" fill="#2a251d"/>' +
      '<circle cx="-4.5" cy="-5" r="3.6" fill="#fffdf4"/><circle cx="4.5" cy="-5" r="3.6" fill="#fffdf4"/>' +
      '<circle cx="-3.8" cy="-4.4" r="1.5" fill="#17130d"/><circle cx="5.2" cy="-4.4" r="1.5" fill="#17130d"/></g>';

    // night: one tinted sheet over the painted world. The old approach rewrote
    // literal hex colours in the generated SVG, which does nothing to a raster.
    s += '<rect class="wm-night-only" x="0" y="0" width="' + PLATE.w + '" height="' + PLATE.h +
         '" fill="#101a30" opacity=".6" style="mix-blend-mode:multiply" pointer-events="none"/>';
    s += "</g></svg>";
    return s;
  }

  /* The station leaves the valley for the journey timeline - the one place on
     the map that is a section rather than a project. */
  function enterJourney() {
    closeMap();
    var el = document.getElementById("journey");
    if (el) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
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
  /* Open on the village rather than on the world's top-left corner. At scale 1
     that corner is mostly sky and distant hills, so the arrival - the whole
     point of the valley - was landing on empty air with a couple of buildings
     clipped at the bottom edge. Frames the bounding box of every placed
     building, so it stays right whenever LAYOUT moves. Buildings are drawn
     upward from their base, hence the asymmetric vertical padding. */
  function frameBuildings() {
    if (!svgEl) return;
    var keys = Object.keys(LAYOUT);
    if (!keys.length) return;
    /* Measure each building's real extent rather than padding by a guess: the
       castle is twice the width of the fruit stall, so a single margin either
       clips the widest or wastes space around the rest. */
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    keys.forEach(function (k) {
      var L = LAYOUT[k], d = artSize(L.kind), hw = d[0] / 2;
      if (L.x - hw < x0) x0 = L.x - hw;
      if (L.x + hw > x1) x1 = L.x + hw;
      if (L.y - d[1] < y0) y0 = L.y - d[1];
      if (L.y + 46 > y1) y1 = L.y + 46;        // label board bottom edge
    });
    SCENERY.forEach(function (o) {
      var nat = window.WORLD_ART && window.WORLD_ART.scenery && window.WORLD_ART.scenery[o[0]];
      if (!nat) return;
      var sh = o[3] * nat[1] / nat[0];
      if (o[1] < x0) x0 = o[1];
      if (o[1] + o[3] > x1) x1 = o[1] + o[3];
      if (o[2] < y0) y0 = o[2];
      if (o[2] + sh > y1) y1 = o[2] + sh;
    });
    var m = 260;                                // breathing room around the lot
    x0 -= m; x1 += m; y0 -= m; y1 += m;
    var v = viewRect(svgEl);
    scale = Math.min(v.w / (x1 - x0), v.h / (y1 - y0));
    tx = v.x + (v.w - (x1 - x0) * scale) / 2 - x0 * scale;
    ty = v.y + (v.h - (y1 - y0) * scale) / 2 - y0 * scale;
    applyPan();
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
      if (id === STATION_ID) { enterJourney(); return; }
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
  var suuAnim = null, suuX = 1050, suuY = 890, suuFace = 1;
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
    // 720 = the painted horizon: measured on valley.webp, the lowest point at
    // which every column has turned to solid ground (grass/forest/rock). Above
    // it some columns are still sky or hazy far mountain, so that is as far
    // north as Suu can walk and still have ground under her feet.
    suuY = Math.max(720, Math.min(WORLD.y1 - 60, suuY + dy * inv * 320 * dt)); // stays on the ground
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
  /* Hovering a building brightens its label. They are separate groups now, so
     the link is made by data-id rather than by CSS descent. Delegated, so it
     costs two listeners rather than one per building. */
  function wireLabelHover(svg) {
    function mark(ev, on) {
      var b = ev.target.closest && ev.target.closest(".wm-b");
      if (!b) return;
      var lab = svg.querySelector('#wm-labels .wm-board[data-id="' + b.getAttribute("data-id") + '"]');
      if (lab) lab.classList.toggle("is-hot", on);
    }
    svg.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      var b = ev.target.closest && ev.target.closest(".wm-station");
      if (!b) return;
      ev.preventDefault();
      enterJourney();
    });
    svg.addEventListener("mouseover", function (ev) { mark(ev, true); });
    svg.addEventListener("mouseout", function (ev) { mark(ev, false); });
  }

  function renderValley() {
    // paints (or repaints, on theme flip) the valley to match the site theme
    var night = document.documentElement.getAttribute("data-theme") === "dark";
    overlay.classList.toggle("wm-night", night);
    var old = document.getElementById("wm-svg");
    if (old) old.remove();
    overlay.insertAdjacentHTML("beforeend", valleySvg());
    panG = document.getElementById("wm-pan");
    suuG = document.getElementById("wm-suu");
    svgEl = document.getElementById("wm-svg");
    renderSuu(0);
    applyPan();
    wirePanZoom(svgEl);
    wireLabelHover(svgEl);
    startFlight(svgEl);
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
    suuX = 1050; suuY = 890; suuFace = 1;
    keys.up = keys.down = keys.left = keys.right = 0;
    renderValley();
    // Framing needs the svg's real size, but clientWidth is still 0 in the tick
    // it is inserted, so viewRect falls back to assumed dimensions and the fit
    // comes out slightly off. Frame once now (so nothing flashes at the wrong
    // zoom) and again once layout is real. Nobody can have panned within 0ms,
    // so the second pass cannot fight the user.
    frameBuildings();
    setTimeout(frameBuildings, 0);
    if (!reduced) {
      overlay.classList.add("wm-wipe");
      setTimeout(function () { overlay.classList.remove("wm-wipe"); }, 900);
    }
    if (location.hash !== "#map") history.pushState(null, "", "#map");
  }
  function closeMap() {
    if (!open) return;
    open = false;
    stopFlight();          // nothing animates behind a closed map
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
