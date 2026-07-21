/* ============================================================
   demos.js - interactive project simulations.
   Every demo runs on MOCK data invented for this site.
   No real company data, hosts, credentials or documents.
   A project card selects its demo via content.projects[].demo.
   ============================================================ */
(function () {
  "use strict";

  var App = null; // bound at mount time (PORTFOLIO_APP)

  function sleep(ms) {
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return new Promise(function (res) { setTimeout(res, reduced ? 0 : ms); });
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function logLine(logBox, text, cls) {
    var d = el("div", cls || "", text);
    logBox.appendChild(d);
    logBox.scrollTop = logBox.scrollHeight;
    return d;
  }
  function toolbar() {
    return el("div", "demo-toolbar");
  }
  function runBtn(label) {
    var b = el("button", "demo-run", label || "Run");
    return b;
  }
  function select(labelText, options) {
    var wrap = el("label", null, labelText + " ");
    var s = document.createElement("select");
    options.forEach(function (o) {
      var op = document.createElement("option");
      op.value = o[0]; op.textContent = o[1];
      s.appendChild(op);
    });
    wrap.appendChild(s);
    return { wrap: wrap, select: s };
  }

  /* ============================================================
     1. DO PIPELINE - the real DO Rename flow as a guided mini game:
     pick scans from the folder -> trigger from Teams (type
     start_dorename, click Process Scan on the adaptive card) ->
     per-file rules (chop mandatory unless own transport, duplicate
     second-pass verify, master overrides) -> Excel scan report ->
     Problematic DO folder where a rescan recovers the file.
     All data is mock - no real customers or documents.
     ============================================================ */
  function svgDO(o) {
    var lines = "";
    for (var i = 0; i < 4; i++) {
      var y = 64 + i * 12;
      lines += '<rect x="14" y="' + y + '" width="' + (150 - (i % 3) * 22) + '" height="5" rx="2" fill="#d8dde5"/>';
    }
    var boxContent = "";
    if (o.marks === "both") {
      boxContent = '<circle cx="152" cy="163" r="15" fill="none" stroke="#c0392b" stroke-width="2.2" opacity=".85"/>' +
        '<text x="152" y="166" text-anchor="middle" font-size="6" fill="#c0392b" opacity=".85">MOCK CO.</text>' +
        '<path d="M128 172 q6 -12 12 -2 t14 -4 t12 2" fill="none" stroke="#2c3e50" stroke-width="1.6"/>';
    }
    var mo = o.mo ? '<text x="98" y="122" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#c0392b" transform="rotate(-8 98 122)">MASTER OVERRIDE: ' + o.mo + "</text>" : "";
    return '<svg viewBox="0 0 196 200" role="img" aria-label="mock scanned delivery order ' + o.num + '">' +
      '<rect x="1" y="1" width="194" height="198" fill="#ffffff" stroke="#b9c0cc"/>' +
      '<rect x="14" y="12" width="80" height="9" rx="2" fill="#8a94a5"/>' +
      '<text x="182" y="21" text-anchor="end" font-size="9" font-weight="bold" fill="#333">DELIVERY ORDER</text>' +
      '<text x="14" y="40" font-size="8" fill="#555">DO No: ' + o.num + '</text>' +
      '<text x="14" y="52" font-size="8" fill="#555">Customer: Mock Trading Sdn Bhd</text>' +
      lines +
      '<text x="14" y="138" font-size="7" fill="#777">Delivery Term: ' + o.term + "</text>" + mo +
      '<rect x="120" y="146" width="64" height="38" fill="none" stroke="#8a94a5" stroke-dasharray="3 2"/>' +
      '<text x="152" y="193" text-anchor="middle" font-size="5.5" fill="#8a94a5">Customer\'s Chop &amp; Signature</text>' +
      boxContent + "</svg>";
  }

  // one file per rule of the real pipeline
  var DO_FILES = [
    { id: "scan_101", num: "DO-88101", marks: "both", term: "DELIVERY", mo: "", kind: "normal" },
    { id: "scan_102", num: "DO-88102", marks: "none", term: "DELIVERY", mo: "", kind: "missing" },
    { id: "scan_103", num: "DO-88103", marks: "none", term: "OWN TRANSPORT", mo: "", kind: "own" },
    { id: "scan_104", num: "DO-88101", marks: "both", term: "DELIVERY", mo: "", kind: "dup-true" },
    { id: "scan_105", num: "DO-88103", marks: "both", term: "OWN TRANSPORT", mo: "", kind: "dup-false" },
    { id: "scan_106", num: "DO-88106", marks: "none", term: "-", mo: "OWN TRANSPORT", kind: "mo-own" },
    { id: "scan_107", num: "DO-88107", marks: "none", term: "DELIVERY", mo: "PASS", kind: "mo-pass" }
  ];

  function demoDoPipeline(container) {
    var sel = {}, cards = {}, running = false, hasRun = false;
    DO_FILES.forEach(function (f) { sel[f.id] = true; });

    /* ----- four tagged cards with app-style notification dots ----- */
    // short one-word tags keep each tag a slim index tab instead of a two-line block
    var ui = dotTabs(container, ["Overview", "Scan", "Teams", "Email"], function (i) {
      // seeing the scan folder queues the next step: the Teams trigger
      if (i === 1 && !hasRun) ui.badge(2);
    });
    var panels = ui.panels, badge = ui.badge, openTab = ui.open;

    /* ----- card 1: the whole pipeline at a glance + how to play ----- */
    var p0 = panels[0];
    p0.appendChild(el("div", "do-sub", "the pipeline"));
    var pipe = el("div", "pipe");
    ["scan folder", "Teams trigger", "AI read + rules", "rename + file", "Excel report", "recover"].forEach(function (s, i, arr) {
      pipe.appendChild(el("span", "pipe-stage done", s));
      if (i < arr.length - 1) pipe.appendChild(el("span", "pipe-arrow", ">"));
    });
    p0.appendChild(pipe);
    p0.appendChild(el("div", "do-sub", "how to play"));
    var guide = el("ol", "do-guide");
    [
      "Scan - pick which scanned DOs go into the run",
      "Teams - type start_dorename, then press Process Scan on the adaptive card",
      "watch the journal: chop mandatory unless own transport, duplicates verified by a second full-content compare, master overrides honoured",
      "Email - read the run summary, then rescan the problematic DO to recover it"
    ].forEach(function (t) { guide.appendChild(el("li", null, t)); });
    p0.appendChild(guide);
    p0.appendChild(el("p", "do-guide-hint", "follow the red dots - a dot on a tab means something new is waiting there"));
    var startBtn = runBtn("open the scan folder");
    startBtn.addEventListener("click", function () { openTab(1); });
    p0.appendChild(startBtn);

    /* ----- card 2: the scan folder ----- */
    var p1 = panels[1];
    p1.appendChild(el("div", "do-sub", "scan folder - click files to pick which to process"));
    var grid = el("div", "do-files");
    DO_FILES.forEach(function (f) {
      var c = el("div", "do-file sel");
      c.innerHTML = svgDO(f);
      c.appendChild(el("div", null, f.id + ".pdf"));
      c.addEventListener("click", function () {
        if (running) return;
        sel[f.id] = !sel[f.id];
        c.classList.toggle("sel", sel[f.id]);
      });
      cards[f.id] = c;
      grid.appendChild(c);
    });
    p1.appendChild(grid);

    /* ----- card 3: the Teams channel ----- */
    var p2 = panels[2];
    var teams = el("div", "do-teams");
    teams.appendChild(el("div", "do-teams-head", "MICROSOFT TEAMS · #operations"));
    var chat = el("div");
    teams.appendChild(chat);
    var typeBtn = runBtn("type start_dorename");
    typeBtn.style.marginTop = ".4rem";
    teams.appendChild(typeBtn);
    p2.appendChild(teams);
    var log = el("div", "demo-log");
    log.style.marginTop = ".7rem";
    p2.appendChild(log);
    logLine(log, "the run starts from a chat message - the journal below narrates every rule", "info");

    typeBtn.addEventListener("click", async function () {
      if (!DO_FILES.some(function (f) { return sel[f.id]; })) {
        logLine(log, "pick at least one file in the Scan folder tab first", "warn");
        badge(1);
        return;
      }
      running = true;
      typeBtn.disabled = true;
      var bubble = el("div", "do-msg", "");
      chat.appendChild(bubble);
      var word = "start_dorename";
      for (var i = 0; i < word.length; i++) { bubble.textContent += word[i]; await sleep(50); }
      await sleep(400);
      var bot = el("div", "do-msg bot");
      var card = el("div", "do-adaptive");
      var n = DO_FILES.filter(function (f) { return sel[f.id]; }).length;
      card.appendChild(el("b", null, "DO Rename"));
      card.appendChild(el("span", null, n + " file(s) waiting in the scan folder. Run the pipeline?"));
      var go = runBtn("Process Scan");
      go.style.marginTop = ".5rem";
      card.appendChild(go);
      bot.appendChild(card);
      chat.appendChild(bot);
      logLine(log, "bot replied with an adaptive card - click Process Scan to run", "info");
      go.addEventListener("click", function () {
        go.disabled = true;
        runAll();
      });
    });

    /* ----- card 4: the email report inbox ----- */
    var p3 = panels[3];
    p3.appendChild(el("div", "do-sub", "run report inbox"));
    var empty = el("p", "do-guide-hint", "inbox empty - run the pipeline from the Teams tab first");
    p3.appendChild(empty);
    var inbox = el("div");
    p3.appendChild(inbox);
    var verdict = el("div", "verdict");
    p3.appendChild(verdict);

    function mail(subject, cls) {
      var m = el("div", "do-mail");
      var head = el("div", "do-mail-head");
      head.appendChild(el("span", "do-mail-ava", "DO"));
      var who = el("div");
      who.appendChild(el("b", null, "DO Rename Bot"));
      who.appendChild(el("div", null, "to: operations@mock-co.example"));
      head.appendChild(who);
      m.appendChild(head);
      var body = el("div", "do-mail-body");
      body.appendChild(el("p", "do-mail-sub " + (cls || ""), subject));
      m.appendChild(body);
      inbox.insertBefore(m, inbox.firstChild); // newest email on top
      return body;
    }

    var ROWS = [], reportCells = {};
    async function play(f, lines) {
      cards[f.id].classList.add("active");
      for (var i = 0; i < lines.length; i++) {
        logLine(log, "[" + f.num + "] " + lines[i][0], lines[i][1]);
        await sleep(230);
      }
      cards[f.id].classList.remove("active");
    }
    function stamp(f, text, cls) {
      var old = cards[f.id].querySelector(".do-stamp");
      if (old) old.remove();
      cards[f.id].appendChild(el("div", "do-stamp " + cls, text));
    }

    async function runAll() {
      hasRun = true;
      log.innerHTML = "";
      var picked = DO_FILES.filter(function (f) { return sel[f.id]; });
      logLine(log, "processing " + picked.length + " scan(s)...", "info");
      for (var i = 0; i < picked.length; i++) {
        var f = picked[i];
        if (f.kind === "normal") {
          await play(f, [["vision read: chop + signature found in the customer box", "ok"],
            ["normal copy rule: chop & sign are MANDATORY - satisfied", "ok"],
            ["renamed + filed: DO-88101_MockTrading_ChopSign.pdf", "ok"]]);
          stamp(f, "FILED", "good");
          ROWS.push({ f: f, status: "Success", cls: "", remark: "chop & sign verified" });
        } else if (f.kind === "missing") {
          await play(f, [["vision read: customer box is EMPTY", "warn"],
            ["normal copy rule: chop & sign are MANDATORY -> NEEDS REVIEW", "warn"],
            ["moved to the Problematic DO folder + tracking list", "warn"]]);
          stamp(f, "REVIEW", "warn");
          ROWS.push({ f: f, status: "Needs Review", cls: "warn", remark: "missing chop & sign - rescan to recover" });
        } else if (f.kind === "own") {
          await play(f, [["vision read: no chop - but delivery term reads OWN TRANSPORT", "info"],
            ["own-transport rule: chop & sign OPTIONAL - no alert with or without", "ok"],
            ["filed with an informational remark", "ok"]]);
          stamp(f, "FILED", "good");
          ROWS.push({ f: f, status: "Success", cls: "", remark: "own transport - chop optional" });
        } else if (f.kind === "dup-true") {
          await play(f, [["this DO number is ALREADY in the filed library - duplicate suspect", "warn"],
            ["second API call: full-content compare against the filed " + f.num + " copy...", "info"],
            ["100% identical -> verified true duplicate", "ok"],
            ["duplicate DELETED - noted in the scan result sheet", "ok"]]);
          stamp(f, "DELETED", "bad");
          ROWS.push({ f: f, status: "Deleted", cls: "bad", remark: "true duplicate of filed " + f.num + " (verified by full compare)" });
        } else if (f.kind === "dup-false") {
          await play(f, [["this DO number is ALREADY in the filed library - duplicate suspect", "warn"],
            ["second API call: full-content compare against the filed " + f.num + " copy...", "info"],
            ["filed copy had no chop (own transport) - this scan carries chop + sign", "info"],
            ["content DIFFERS -> NOT a duplicate: previous overwritten, latest kept + remark", "ok"]]);
          stamp(f, "LATEST", "good");
          ROWS.push({ f: f, status: "Success", cls: "", remark: "not a duplicate - overwrote earlier " + f.num + " copy, kept latest" });
        } else if (f.kind === "mo-own") {
          await play(f, [["vision read: no chop, and no delivery term typed on the DO", "warn"],
            ["handwritten MASTER OVERRIDE: OWN TRANSPORT found", "info"],
            ["override accepted -> treated as an own-transport copy", "ok"],
            ["filed with remark", "ok"]]);
          stamp(f, "FILED", "good");
          ROWS.push({ f: f, status: "Success", cls: "", remark: "master override: own transport" });
        } else if (f.kind === "mo-pass") {
          await play(f, [["vision read: marks too faint to verify", "warn"],
            ["handwritten MASTER OVERRIDE: PASS found", "info"],
            ["override accepted -> filed as a chop-sign copy", "ok"],
            ["filed with remark", "ok"]]);
          stamp(f, "FILED", "good");
          ROWS.push({ f: f, status: "Success", cls: "", remark: "master override: pass" });
        }
      }
      logLine(log, "batch done - every file card in the Scan folder tab got its stamp", "ok");
      logLine(log, "run report emailed - the red dot marks the Email tab", "info");
      buildEmail();
      badge(3);
    }

    function sheetRow(table, f, status, cls, remark) {
      var tr = el("tr", cls);
      tr.appendChild(el("td", null, f.num));
      var tdS = el("td", null, status);
      tr.appendChild(tdS);
      var tdR = el("td", null, remark);
      tr.appendChild(tdR);
      table.appendChild(tr);
      return { tr: tr, tdS: tdS, tdR: tdR };
    }

    function buildEmail() {
      empty.remove();
      var bad = ROWS.filter(function (r) { return r.status === "Needs Review"; });
      var subject = bad.length
        ? "[DO Rename] " + bad.length + " problematic DO detected - " + ROWS.length + " scan(s) processed"
        : "[DO Rename] all " + ROWS.length + " documents filed successfully";
      var body = mail(subject, bad.length ? "warn" : "good");
      body.appendChild(el("div", "do-sub", "scan result sheet"));
      var table = el("table", "do-sheet");
      var head = el("tr");
      ["DO No", "Status", "Remark"].forEach(function (h) { head.appendChild(el("th", null, h)); });
      table.appendChild(head);
      ROWS.forEach(function (r) { reportCells[r.f.id] = sheetRow(table, r.f, r.status, r.cls, r.remark); });
      body.appendChild(table);

      if (bad.length) {
        body.appendChild(el("div", "do-sub", "Problematic DO folder - tracking list"));
        var track = el("table", "do-sheet");
        var th = el("tr");
        ["DO No", "Issue", "Recovery status"].forEach(function (h) { th.appendChild(el("th", null, h)); });
        track.appendChild(th);
        body.appendChild(track);
        bad.forEach(function (r) {
          var tr = el("tr", "warn");
          tr.appendChild(el("td", null, r.f.num));
          tr.appendChild(el("td", null, "missing chop & sign"));
          var tdSt = el("td", null, "Pending review");
          tr.appendChild(tdSt);
          track.appendChild(tr);
          var fix = runBtn("customer chopped it - rescan " + r.f.id);
          fix.style.marginTop = ".5rem";
          body.appendChild(fix);
          fix.addEventListener("click", async function () {
            fix.disabled = true;
            openTab(2); // the rescan narrates in the Teams journal, like a real re-run
            await play(r.f, [["rescan: customer box now carries chop + signature", "ok"],
              ["renamed + filed - removed from the Problematic DO folder", "ok"],
              ["tracking list updated -> Recovered", "ok"]]);
            cards[r.f.id].innerHTML = svgDO({ num: r.f.num, marks: "both", term: r.f.term, mo: "" });
            cards[r.f.id].appendChild(el("div", null, r.f.id + ".pdf"));
            stamp(r.f, "FILED", "good");
            tr.className = "";
            tdSt.textContent = "Recovered ✓";
            var cell = reportCells[r.f.id];
            cell.tr.className = "";
            cell.tdS.textContent = "Success";
            cell.tdR.textContent = "recovered after rescan";
            var b2 = mail("[DO Rename] " + r.f.num + " recovered - all clear", "good");
            b2.appendChild(el("p", null, "rescan verified chop + signature; the tracking list now reads Recovered."));
            verdict.textContent = "all " + ROWS.length + " scans resolved - recovery is just a rescan away.";
            verdict.className = "verdict show good";
            badge(3);
          });
        });
      }
      var okCount = ROWS.length - bad.length;
      verdict.textContent = okCount + " handled automatically, " + bad.length +
        " need(s) review - humans only ever see the exceptions.";
      verdict.className = "verdict show " + (bad.length ? "warn" : "good");
      var reset = runBtn("start over");
      reset.style.marginTop = ".6rem";
      reset.addEventListener("click", function () {
        container.innerHTML = "";
        demoDoPipeline(container);
      });
      p3.appendChild(reset);
    }

    openTab(0);   // land on the how-it-works card
    badge(1);     // a red dot invites the visitor into the scan folder
  }

  /* ============================================================
     2. FOREX SYNC - BNM rates into the ERP (mock rates)
     ============================================================ */
  function demoForexSync(container) {
    var scenario = "ok", hasRun = false;

    /* ----- four tagged cards with app-style notification dots ----- */
    var ui = dotTabs(container, ["Overview", "Morning", "03:00 run", "Alerts"]);
    var panels = ui.panels, badge = ui.badge, openTab = ui.open;

    /* ----- card 1: the pipeline at a glance + how to play ----- */
    var p0 = panels[0];
    p0.appendChild(el("div", "do-sub", "the pipeline"));
    var pipe = el("div", "pipe");
    ["read QNE currencies", "BNM API: previous month", "retry till 08:00", "write rates to QNE", "alert humans"].forEach(function (s, i, arr) {
      pipe.appendChild(el("span", "pipe-stage done", s));
      if (i < arr.length - 1) pipe.appendChild(el("span", "pipe-arrow", ">"));
    });
    p0.appendChild(pipe);
    p0.appendChild(el("div", "do-sub", "how to play"));
    var guide = el("ol", "do-guide");
    [
      "Morning - choose which kind of month-start the bot wakes up to",
      "03:00 run - press Run and watch the retry clock and the journal",
      "Alerts - see the rates written for the whole month, or the dual-channel alert when humans are needed",
      "try every morning - the rate never changes with the trigger day; that is the point"
    ].forEach(function (t) { guide.appendChild(el("li", null, t)); });
    p0.appendChild(guide);
    p0.appendChild(el("p", "do-guide-hint", "follow the red dots - a dot on a tab means something new is waiting there"));
    var startBtn = runBtn("pick the morning");
    startBtn.addEventListener("click", function () { openTab(1); });
    p0.appendChild(startBtn);

    /* ----- card 2: scenario tiles + the feed being pulled ----- */
    var p1 = panels[1];
    p1.appendChild(el("div", "do-sub", "what kind of morning is it? (pick one)"));
    var tiles = el("div", "fx-tiles");
    var TILES = [
      ["ok", "Normal morning", "1st of July - BNM answers at 03:00"],
      ["holiday", "1st is a holiday", "public holiday or weekend - bot runs anyway"],
      ["late-day", "Triggered late", "someone runs it on the 3rd instead"],
      ["apifail", "BNM API down", "unreachable all morning long"],
      ["partial", "Currency missing", "QNE uses one BNM never publishes"]
    ];
    var tileEls = {};
    TILES.forEach(function (t) {
      var d = el("div", "fx-tile" + (t[0] === scenario ? " sel" : ""));
      d.appendChild(el("b", null, t[1]));
      d.appendChild(el("span", null, t[2]));
      d.addEventListener("click", function () {
        scenario = t[0];
        Object.keys(tileEls).forEach(function (k) { tileEls[k].classList.toggle("sel", k === scenario); });
        badge(2); // a new morning is queued for the run card
      });
      tileEls[t[0]] = d;
      tiles.appendChild(d);
    });
    p1.appendChild(tiles);
    p1.appendChild(el("div", "do-sub", "the feed you are pulling from"));
    var months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    var usd = [4.43, 4.47, 4.41, 4.38, 4.44, 4.49, 4.52, 4.46, 4.40, 4.37, 4.42, 4.45];
    var W = 420, H = 96, PAD = 26;
    var min = Math.min.apply(null, usd), max = Math.max.apply(null, usd);
    function px(i) { return PAD + i * (W - PAD * 2) / (usd.length - 1); }
    function py(v) { return H - 18 - (v - min) / (max - min) * (H - 34); }
    var pts = usd.map(function (v, i) { return px(i) + "," + py(v); }).join(" ");
    var chartWrap = el("div", "chart-wrap");
    chartWrap.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="USD to MYR mock rate, last 12 months">' +
      '<text x="' + PAD + '" y="10" font-size="8" fill="var(--ink-3)" font-family="var(--mono)">USD / MYR - last 12 months (mock data)</text>' +
      '<line x1="' + PAD + '" y1="' + py(min) + '" x2="' + (W - PAD) + '" y2="' + py(min) + '" stroke="var(--line)" stroke-width="1"/>' +
      '<line x1="' + PAD + '" y1="' + py(max) + '" x2="' + (W - PAD) + '" y2="' + py(max) + '" stroke="var(--line)" stroke-width="1"/>' +
      '<text x="' + (PAD - 4) + '" y="' + (py(max) + 3) + '" font-size="7" fill="var(--ink-3)" text-anchor="end">' + max.toFixed(2) + '</text>' +
      '<text x="' + (PAD - 4) + '" y="' + (py(min) + 3) + '" font-size="7" fill="var(--ink-3)" text-anchor="end">' + min.toFixed(2) + '</text>' +
      '<polyline points="' + pts + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle id="fx-dot" r="4" fill="var(--accent)" stroke="var(--bg-panel)" stroke-width="2" style="display:none"/>' +
      '<rect id="fx-hit" x="0" y="0" width="' + W + '" height="' + H + '" fill="transparent"/>' +
      '</svg>';
    var tip = el("div", "chart-tip");
    chartWrap.appendChild(tip);
    p1.appendChild(chartWrap);
    var svg = chartWrap.querySelector("svg");
    var dot = chartWrap.querySelector("#fx-dot");
    svg.addEventListener("mousemove", function (ev) {
      var r = svg.getBoundingClientRect();
      var x = (ev.clientX - r.left) / r.width * W;
      var i = Math.max(0, Math.min(usd.length - 1, Math.round((x - PAD) / ((W - PAD * 2) / (usd.length - 1)))));
      dot.style.display = "";
      dot.setAttribute("cx", px(i)); dot.setAttribute("cy", py(usd[i]));
      tip.style.display = "block";
      tip.textContent = months[i] + " : " + usd[i].toFixed(2);
      tip.style.left = Math.min(px(i) / W * 100, 80) + "%";
      tip.style.top = "0px";
    });
    svg.addEventListener("mouseleave", function () { dot.style.display = "none"; tip.style.display = "none"; });

    /* ----- card 3: the 03:00 run - retry clock + journal ----- */
    var p2 = panels[2];
    p2.appendChild(el("div", "do-sub", "retry window - hourly, 03:00 to 08:00"));
    var clock = el("div", "pipe");
    var HOURS = ["03:00", "04:00", "05:00", "06:00", "07:00", "08:00"];
    var hourEls = HOURS.map(function (h, i) {
      var s = el("span", "pipe-stage", h);
      clock.appendChild(s);
      if (i < HOURS.length - 1) clock.appendChild(el("span", "pipe-arrow", ">"));
      return s;
    });
    p2.appendChild(clock);
    var run = runBtn("Run monthly sync");
    run.style.margin = ".6rem 0";
    p2.appendChild(run);
    var log = el("div", "demo-log");
    p2.appendChild(log);
    logLine(log, "pick a morning on the previous card, then run - re-run as many mornings as you like", "info");

    /* ----- card 4: QNE writes + alerts ----- */
    var p3 = panels[3];
    p3.appendChild(el("div", "do-sub", "rates written to QNE"));
    var emptyHint = el("p", "do-guide-hint", "nothing here yet - run the sync first");
    p3.appendChild(emptyHint);
    var table = el("table", "rate-table");
    table.innerHTML = "<thead><tr><th>Currency</th><th>Rate (30 Jun)</th><th>Applies</th><th>Status</th></tr></thead>";
    var tbody = document.createElement("tbody");
    table.appendChild(tbody);
    table.style.display = "none";
    p3.appendChild(table);
    var alerts = el("div");
    p3.appendChild(alerts);
    var verdict = el("div", "verdict");
    p3.appendChild(verdict);

    function dualAlert(subject, bodyText) {
      alerts.innerHTML = "";
      alerts.appendChild(el("div", "do-sub", "dual-channel alert - email + Teams"));
      var row = el("div", "demo-stage");
      var mailBox = el("div", "do-mail");
      var head = el("div", "do-mail-head");
      head.appendChild(el("span", "do-mail-ava", "FX"));
      var who = el("div");
      who.appendChild(el("b", null, "BNM FX Sync Bot"));
      who.appendChild(el("div", null, "to: accounts@mock-co.example"));
      head.appendChild(who);
      mailBox.appendChild(head);
      var body = el("div", "do-mail-body");
      body.appendChild(el("p", "do-mail-sub warn", subject));
      body.appendChild(el("p", null, bodyText));
      mailBox.appendChild(body);
      mailBox.style.flex = "1";
      row.appendChild(mailBox);
      var teams = el("div", "do-teams");
      teams.style.flex = "1";
      teams.appendChild(el("div", "do-teams-head", "MICROSOFT TEAMS · #accounts"));
      var card = el("div", "do-adaptive");
      card.appendChild(el("b", null, subject));
      card.appendChild(el("span", null, bodyText));
      teams.appendChild(card);
      row.appendChild(teams);
      alerts.appendChild(row);
    }

    var QNE = ["USD", "EUR", "SGD", "CNY"];
    var RATES = { USD: "4.4500", EUR: "4.8210", SGD: "3.3105", CNY: "0.6188" };
    function rateRow(cur, rate, applies, status, warn) {
      var tr = document.createElement("tr");
      tr.className = "landed";
      tr.innerHTML = "<td>" + cur + "</td><td>" + rate + "</td><td>" + applies + "</td><td>" + status + "</td>";
      if (warn) tr.lastChild.style.color = "var(--warn)";
      tbody.appendChild(tr);
    }

    run.addEventListener("click", async function () {
      run.disabled = true;
      hasRun = true;
      log.innerHTML = ""; tbody.innerHTML = ""; alerts.innerHTML = "";
      emptyHint.style.display = "none";
      table.style.display = "";
      verdict.className = "verdict";
      hourEls.forEach(function (s) { s.className = "pipe-stage"; });
      var v = scenario;
      var trigger = v === "late-day" ? "03 Jul" : "01 Jul";

      logLine(log, trigger + " 03:00 - scheduled wake-up", "info");
      if (v === "holiday") {
        logLine(log, "01 Jul is a public holiday - the bot does not care: the trigger day NEVER affects the rate", "info");
      }
      if (v === "late-day") {
        logLine(log, "running on the 3rd instead of the 1st - makes no difference: the rate always comes from last month's final published day", "info");
      }
      await sleep(380);
      logLine(log, "step 1 - reading QNE: active currencies = " + QNE.join(", "), "ok");
      await sleep(380);
      logLine(log, "step 2 - BNM open API: requesting JUNE (the previous month)...", "info");
      await sleep(380);

      if (v === "apifail") {
        for (var h = 0; h < HOURS.length; h++) {
          hourEls[h].classList.add("active");
          await sleep(320);
          hourEls[h].classList.remove("active");
          hourEls[h].classList.add("fail");
          logLine(log, HOURS[h] + " - BNM API unreachable" + (h < HOURS.length - 1 ? " - retrying next hour" : ""), "warn");
        }
        await sleep(300);
        logLine(log, "08:00 - retry window exhausted - handing over to humans", "bad");
        QNE.forEach(function (c) { rateRow(c, "-", "-", "MANUAL ENTRY NEEDED", true); });
        dualAlert("[BNM FX] July rates NOT retrieved - manual entry needed",
          "The BNM API stayed unreachable from 03:00 to 08:00. Please key the July exchange rates into QNE manually - the same alert is in this Teams channel so nobody misses it.");
        verdict.textContent = "the bot never fails silently - both channels are shouting for a human.";
        verdict.className = "verdict show warn";
        logLine(log, "[Alert] email sent AND Teams card posted - the red dot marks the Alerts tab", "warn");
        badge(3);
        run.disabled = false;
        return;
      }

      hourEls[0].classList.add("done");
      logLine(log, "03:00 - BNM replied: last published day of June = 30 Jun 2026", "ok");
      await sleep(380);
      logLine(log, "that ONE day's closing rate becomes the rate for the WHOLE of July (01 - 31 Jul)", "info");
      await sleep(380);
      var missing = v === "partial" ? "CNY" : null;
      for (var i = 0; i < QNE.length; i++) {
        var c = QNE[i];
        if (c === missing) {
          rateRow(c, "-", "-", "MISSING FROM BNM", true);
          logLine(log, c + " is in QNE but not in the BNM feed - flagged, the rest still go in", "warn");
        } else {
          rateRow(c, RATES[c], "01 - 31 Jul", "written to QNE");
          logLine(log, c + " = " + RATES[c] + " -> QNE (01 - 31 Jul)", "ok");
        }
        await sleep(320);
      }
      if (missing) {
        dualAlert("[BNM FX] PARTIAL - " + missing + " missing from the BNM feed",
          "3 of 4 currencies were written to QNE for July. " + missing + " is active in QNE but BNM did not publish it - please key it in manually.");
        verdict.textContent = "partial runs are announced loudly - the available rates still went in.";
        verdict.className = "verdict show warn";
        logLine(log, "[Alert] partial run announced by email AND Teams - check the Alerts tab", "warn");
      } else {
        verdict.textContent = v === "ok"
          ? "July's rates were in QNE before anyone woke up."
          : "identical rates to a normal run - weekends, public holidays and late triggers change nothing.";
        verdict.className = "verdict show good";
        logLine(log, "rates written - the red dot marks the Alerts tab", "ok");
      }
      badge(3);
      run.disabled = false;
    });

    openTab(0);   // land on the how-it-works card
    badge(1);     // a red dot invites the visitor to pick a morning
  }

  /* ============================================================
     3. NOTIFY HUB - who hears about which failure, where
     ============================================================ */
  function demoNotifyHub(container) {
    var tb = toolbar();
    var mod = select("module:", [["do", "Document pipeline"], ["fx", "Forex sync"], ["watch", "Report watchdog"]]);
    var stg = select("stage:", [["testing", "testing"], ["live", "live"]]);
    var sev = select("severity:", [["error", "error"], ["critical", "critical"]]);
    var run = runBtn("Trigger failure");
    tb.appendChild(mod.wrap); tb.appendChild(stg.wrap); tb.appendChild(sev.wrap); tb.appendChild(run);
    container.appendChild(tb);

    var stage = el("div", "demo-stage");
    var mail = el("div", "mailcard");
    stage.appendChild(mail);
    var teams = el("div", "mailcard");
    stage.appendChild(teams);
    container.appendChild(stage);
    var log = el("div", "demo-log");
    container.appendChild(log);

    var names = { do: "Document pipeline", fx: "Forex sync", watch: "Report watchdog" };

    run.addEventListener("click", async function () {
      run.disabled = true;
      log.innerHTML = ""; mail.className = "mailcard"; teams.className = "mailcard";
      var m = mod.select.value, s = stg.select.value, v = sev.select.value;
      logLine(log, names[m] + " reported: '" + (v === "critical" ? "run failed completely" : "one item errored") + "'", "bad");
      await sleep(420);
      logLine(log, "looking up recipients in the shared list (editable by the team, no code)...", "info");
      await sleep(420);
      var who = s === "testing" ? "admins only (module is in TESTING stage)" : "operations team + admins (LIVE stage)";
      logLine(log, "stage gate: " + who, s === "testing" ? "warn" : "ok");
      await sleep(420);
      var recipients = s === "testing" ? "admin@mock.local" : "ops-team@mock.local, admin@mock.local";
      mail.innerHTML = '<div class="mailcard-accentbar"></div>' +
        '<div class="mailcard-head">To: <b>' + recipients + '</b><br>Subject: <b>[' +
        (v === "critical" ? "ALERT" : "Error") + '] ' + names[m] + ' needs attention</b></div>' +
        '<div class="mailcard-body">What happened, when, and the exact item that failed - with a link to the log row. Sent via the primary mailbox; falls back to a second sender automatically if that fails.</div>';
      mail.className = "mailcard show";
      logLine(log, "email dispatched (with automatic fallback sender)", "ok");
      await sleep(420);
      if (v === "critical") {
        teams.innerHTML = '<div class="mailcard-accentbar" style="background:var(--info)"></div>' +
          '<div class="mailcard-head">Teams &#8226; <b>Alerts channel</b></div>' +
          '<div class="mailcard-body">Adaptive card posted: ' + names[m] + ' failure with an acknowledge button - critical alerts also interrupt the chat, not just the inbox.</div>';
        teams.className = "mailcard show";
        logLine(log, "Teams card posted to the alerts channel", "ok");
      } else {
        logLine(log, "severity below critical - no Teams interruption, inbox only", "info");
      }
      logLine(log, "flip a module testing->live by editing one list row. no deployment.", "info");
      run.disabled = false;
    });
  }

  /* ============================================================
     4. SSRS MONITOR - patient watchdog with retry logic
     ============================================================ */
  function demoSsrsMonitor(container) {
    var tb = toolbar();
    var sc = select("scenario:", [
      ["up", "healthy day"],
      ["reboot", "brief reboot (rides it out)"],
      ["down", "real outage (alerts)"]
    ]);
    var run = runBtn("Run probe");
    tb.appendChild(sc.wrap); tb.appendChild(run);
    container.appendChild(tb);

    var stage = el("div", "demo-stage");
    var track = el("div", "probe-track");
    var labels = el("div");
    labels.style.cssText = "display:flex;justify-content:space-between;font-family:var(--mono);font-size:.65rem;color:var(--ink-3)";
    labels.innerHTML = "<span>07:00 probe</span><span>+10m retries...</span><span>verdict</span>";
    var verdict = el("div", "verdict");
    stage.appendChild(track); stage.appendChild(labels); stage.appendChild(verdict);
    container.appendChild(stage);
    var log = el("div", "demo-log");
    container.appendChild(log);

    run.addEventListener("click", async function () {
      run.disabled = true;
      log.innerHTML = ""; track.innerHTML = ""; verdict.className = "verdict";
      var scenario = sc.select.value;
      var ticks = [];
      for (var i = 0; i < 7; i++) { var t = el("div", "probe-tick"); track.appendChild(t); ticks.push(t); }

      logLine(log, "07:00 - probing the report server...", "info");
      await sleep(500);
      if (scenario === "up") {
        ticks[0].className = "probe-tick up";
        logLine(log, "server answered - all good, going back to sleep until 15:00", "ok");
        verdict.textContent = "HEALTHY - no noise. The watchdog only speaks when it matters.";
        verdict.className = "verdict show good";
        run.disabled = false; return;
      }
      ticks[0].className = "probe-tick down";
      logLine(log, "no answer - starting patient retry loop (6 tries, 10 minutes apart)", "warn");
      var recoverAt = scenario === "reboot" ? 3 : -1;
      for (var r = 1; r <= 6; r++) {
        await sleep(430);
        if (recoverAt !== -1 && r >= recoverAt) {
          ticks[r].className = "probe-tick up";
          logLine(log, "retry " + r + " - server is BACK (it was just a reboot)", "ok");
          verdict.textContent = "RECOVERED - outage ridden out silently. Nobody got spammed for a reboot.";
          verdict.className = "verdict show good";
          run.disabled = false; return;
        }
        ticks[r].className = "probe-tick retry";
        logLine(log, "retry " + r + "/6 - still no answer", "warn");
      }
      logLine(log, "6 retries exhausted -> declaring an outage", "bad");
      await sleep(400);
      logLine(log, "alert email sent to admins with the full timestamped failure history", "bad");
      verdict.textContent = "OUTAGE DECLARED - admins alerted before the first user noticed.";
      verdict.className = "verdict show bad";
      run.disabled = false;
    });
  }

  /* ============================================================
     5. OPS PORTAL - group-based access control, live
     ============================================================ */
  function demoOpsPortal(container) {
    var tb = toolbar();
    var role = select("sign in as:", [
      ["admin", "Administrator"],
      ["ops", "Operations"],
      ["finance", "Finance"],
      ["guest", "New joiner (no groups)"]
    ]);
    tb.appendChild(role.wrap);
    container.appendChild(tb);

    var stage = el("div", "demo-stage");
    var tiles = el("div", "rbac-tiles");
    var modules = [
      ["Document pipeline", ["admin", "ops"]],
      ["Forex rates", ["admin", "finance"]],
      ["Run reports", ["admin", "ops", "finance"]],
      ["Alert queue", ["admin", "ops"]],
      ["User access", ["admin"]],
      ["Audit log", ["admin"]]
    ];
    var tileEls = modules.map(function (m) {
      var t = el("div", "rbac-tile");
      t.innerHTML = '<span class="lock"></span>' + m[0];
      tiles.appendChild(t);
      return t;
    });
    stage.appendChild(tiles);
    container.appendChild(stage);
    var log = el("div", "demo-log");
    container.appendChild(log);

    function apply() {
      var r = role.select.value;
      log.innerHTML = "";
      var count = 0;
      modules.forEach(function (m, i) {
        var ok = m[1].indexOf(r) !== -1;
        tileEls[i].className = "rbac-tile " + (ok ? "granted" : "denied");
        tileEls[i].querySelector(".lock").textContent = ok ? "✓" : "\u{1F512}";
        if (ok) count++;
      });
      logLine(log, "signed in as " + role.select.options[role.select.selectedIndex].text, "info");
      logLine(log, count === 0
        ? "no groups yet -> empty portal. Access is a data change, not a code change."
        : count + " of " + modules.length + " modules granted by group membership", count === 0 ? "warn" : "ok");
      if (r === "admin") logLine(log, "admins also manage the access matrix from the UI itself", "info");
    }
    role.select.addEventListener("change", apply);
    apply();
  }

  /* ============================================================
     6. WORK RECORD - achievement -> branded slide, live
     ============================================================ */
  function demoWorkRecord(container) {
    var tb = toolbar();
    var lab = el("label", null, "achievement: ");
    var input = document.createElement("input");
    input.type = "text";
    input.value = "Automated the month-end stock report";
    input.style.width = "min(260px, 50vw)";
    lab.appendChild(input);
    var run = runBtn("Generate slide");
    tb.appendChild(lab); tb.appendChild(run);
    container.appendChild(tb);

    var stage = el("div", "demo-stage");
    var slide = el("div", "slide-preview");
    slide.innerHTML = '<div class="sp-pill">ACHIEVEMENT</div><h4>Your achievement appears here</h4>' +
      '<div class="sp-accent"></div><ul><li>Press Generate to build the slide</li></ul><div class="sp-bar"></div>';
    stage.appendChild(slide);
    container.appendChild(stage);
    var log = el("div", "demo-log");
    container.appendChild(log);

    run.addEventListener("click", async function () {
      run.disabled = true;
      log.innerHTML = "";
      var title = input.value.trim() || "Untitled achievement";
      logLine(log, "logging project: '" + title + "'", "info");
      await sleep(400);
      logLine(log, "rolling all projects into the Excel summary...", "info");
      await sleep(400);
      logLine(log, "AI vision model picking the best screenshot for this slide...", "info");
      await sleep(500);
      logLine(log, "slide built with the brand template", "ok");
      slide.innerHTML = '<div class="sp-pill">ACHIEVEMENT</div><h4>' +
        title.replace(/</g, "&lt;") + '</h4><div class="sp-accent"></div><ul>' +
        '<li>Problem mapped, process automated end to end</li>' +
        '<li>Screenshot chosen by AI vision from the attachments</li>' +
        '<li>Same data also feeds the auto-generated resume</li>' +
        '</ul><div class="sp-bar"></div>';
      logLine(log, "in the real app this exports a full .pptx deck + .docx resume", "ok");
      run.disabled = false;
    });
  }

  /* ============================================================
     7. KELLIE ESCAPE - "put on the headset": a first-person
     taste of the FYP. VR hands + a laser that follows the mouse,
     head-turn parallax, the dark Level-3 room lit by the candle,
     the game's parchment / numpad UI and synthesized sound.
     Beats mirror the real game: candle reveal -> diary quiz ->
     numpad code -> the door opens.
     ============================================================ */
  function keSfx() {
    var AC = null, master = null, ambient = null, muted = false;
    function ctx() {
      if (!AC) {
        try {
          AC = new (window.AudioContext || window.webkitAudioContext)();
          master = AC.createGain();
          master.gain.value = 0.9;
          master.connect(AC.destination);
        } catch (e) { AC = null; }
      }
      if (AC && AC.state === "suspended") AC.resume();
      return AC;
    }
    function tone(freq, dur, type, gain, slideTo) {
      if (muted || !ctx()) return;
      var a = AC, o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(gain || 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.05);
    }
    function noise(dur, cutoff, gain) {
      if (muted || !ctx()) return;
      var a = AC, t = a.currentTime;
      var buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      var src = a.createBufferSource(); src.buffer = buf;
      var f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cutoff;
      var g = a.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t);
    }
    return {
      wear: function () { if (!ctx()) return; noise(1.4, 500, 0.1); tone(70, 1.2, "sine", 0.08, 55); },
      ambientOn: function (aliveEl) {
        var a = ctx();
        if (!a || ambient) return;
        var buf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
        var d = buf.getChannelData(0), last = 0;
        for (var i = 0; i < d.length; i++) { last = (last + (Math.random() * 2 - 1) * 0.02) * 0.998; d[i] = last * 18; }
        var src = a.createBufferSource(); src.buffer = buf; src.loop = true;
        var f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 240;
        var g = a.createGain(); g.gain.value = 0.05;
        src.connect(f); f.connect(g); g.connect(master);
        src.start();
        ambient = src;
        var watch = setInterval(function () {
          if (!aliveEl.isConnected) {
            clearInterval(watch);
            try { src.stop(); } catch (e) {}
            ambient = null;
          }
        }, 1500);
      },
      candle: function () { noise(0.5, 900, 0.14); tone(320, 0.5, "sine", 0.05, 90); },
      drawer: function () { tone(95, 0.35, "square", 0.05, 60); noise(0.3, 350, 0.08); },
      page: function () { noise(0.22, 1600, 0.1); },
      beep: function (dch) { tone(480 + (parseInt(dch, 10) || 0) * 35, 0.09, "square", 0.06); },
      buzz: function () { tone(130, 0.3, "sawtooth", 0.09, 95); },
      unlock: function () { noise(0.08, 2200, 0.14); tone(180, 0.22, "square", 0.1, 120); },
      creak: function () { tone(120, 0.9, "sawtooth", 0.035, 62); },
      steps: function () {
        [0, 150, 300].forEach(function (d, i) {
          setTimeout(function () { noise(0.09, 480 + i * 90, 0.07); }, d);
        });
      },
      chime: function () {
        [523, 659, 784, 1046].forEach(function (fq, i) {
          setTimeout(function () { tone(fq, 0.5, "triangle", 0.08); }, i * 140);
        });
      },
      setMuted: function (m) { muted = m; if (master) master.gain.value = m ? 0 : 0.9; },
      isMuted: function () { return muted; }
    };
  }

  function keSceneSvg() {
    // first-person room, wider than the frame; #ke-far / #ke-mid pan at
    // different speeds when the player "turns their head" with the mouse
    var s = '<svg id="ke-svg" viewBox="0 0 480 300" width="100%" role="img" aria-label="inside a dark room of Kellie Castle" style="display:block">';
    s += '<defs>' +
      '<radialGradient id="ke-warm" cx=".5" cy=".5" r=".5">' +
      '<stop offset="0" stop-color="rgba(255,196,110,.55)"/><stop offset=".55" stop-color="rgba(255,180,90,.18)"/><stop offset="1" stop-color="rgba(255,180,90,0)"/></radialGradient>' +
      '<radialGradient id="ke-darklit" gradientUnits="userSpaceOnUse" cx="372" cy="180" r="240">' +
      '<stop offset="0" stop-color="rgba(14,11,22,0)"/><stop offset=".5" stop-color="rgba(14,11,22,.22)"/><stop offset="1" stop-color="rgba(14,11,22,.6)"/></radialGradient>' +
      '<linearGradient id="ke-moon" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="rgba(168,190,235,.26)"/><stop offset="1" stop-color="rgba(168,190,235,0)"/></linearGradient>' +
      '</defs>';
    // ---- far layer: stone wall, moonlit window, the plaque
    s += '<g id="ke-far">';
    s += '<rect x="-120" y="-20" width="720" height="280" fill="#332c3e"/>';
    s += '<g stroke="#2a2434" stroke-width="1.5">' +
      '<line x1="-120" y1="52" x2="600" y2="52"/><line x1="-120" y1="112" x2="600" y2="112"/><line x1="-120" y1="172" x2="600" y2="172"/>' +
      '<line x1="-60" y1="-20" x2="-60" y2="52"/><line x1="180" y1="52" x2="180" y2="112"/><line x1="60" y1="112" x2="60" y2="172"/><line x1="420" y1="-20" x2="420" y2="52"/><line x1="530" y1="112" x2="530" y2="172"/>' +
      "</g>";
    s += '<path d="M-52 118 L-52 44 Q-22 14 8 44 L8 118 Z" fill="#141b30"/>' +
      '<circle cx="-8" cy="52" r="11" fill="#dfe7fa"/>' +
      '<circle cx="-14" cy="48" r="9" fill="#141b30"/>' +
      '<path d="M-22 118 L-22 30 M-52 74 L8 74" stroke="#241f2e" stroke-width="5"/>' +
      '<path d="M-52 118 L-52 44 Q-22 14 8 44 L8 118 Z" fill="none" stroke="#221c2b" stroke-width="4"/>' +
      '<path d="M-56 122 L12 122 L30 190 L-74 190 Z" fill="url(#ke-moon)"/>';
    s += '<g id="ke-plaque"><rect x="208" y="64" width="124" height="58" rx="5" fill="#262130" stroke="#463c56" stroke-width="2.5"/>' +
      '<rect x="214" y="70" width="112" height="46" rx="3" fill="none" stroke="#3a3248" stroke-width="1.5"/>' +
      '<text id="ke-plaque-text" x="270" y="102" text-anchor="middle" font-size="26" font-family="Georgia,serif" fill="#F5B301" opacity="0" style="transition:opacity .9s">19 &#183; &#183;</text></g>';
    s += "</g>";
    // ---- mid layer: floor, door + numpad, table + candle, dresser
    s += '<g id="ke-mid">';
    s += '<rect x="-120" y="238" width="720" height="70" fill="#514437"/>';
    s += '<g stroke="#42372c" stroke-width="1.5"><line x1="-120" y1="258" x2="600" y2="258"/><line x1="-120" y1="280" x2="600" y2="280"/>' +
      '<line x1="40" y1="238" x2="30" y2="300"/><line x1="200" y1="238" x2="196" y2="300"/><line x1="360" y1="238" x2="366" y2="300"/><line x1="520" y1="238" x2="532" y2="300"/></g>';
    s += '<ellipse cx="268" cy="264" rx="88" ry="14" fill="#5f4030" opacity=".85"/><ellipse cx="268" cy="264" rx="62" ry="9" fill="#6d4b37" opacity=".85"/>';
    s += '<g id="ke-doorwrap">' +
      '<path d="M62 238 L62 96 Q104 58 146 96 L146 238 Z" fill="#191420"/>' +
      '<rect id="ke-glow" x="62" y="96" width="84" height="142" fill="#F5B301" opacity="0" style="transition:opacity 1.2s"/>' +
      '<g id="ke-door" style="transform-origin:64px 170px;transition:transform 1.2s ease">' +
      '<path d="M64 238 L64 98 Q104 62 144 98 L144 238 Z" fill="#6b4a2e" stroke="#402c1a" stroke-width="3"/>' +
      '<path d="M74 226 L74 108 M104 232 L104 76 M134 226 L134 108" stroke="#553a24" stroke-width="3"/>' +
      '<path d="M64 132 h80 M64 198 h80" stroke="#33251a" stroke-width="5"/>' +
      '<circle cx="132" cy="170" r="6" fill="none" stroke="#c9a86a" stroke-width="2.5"/>' +
      "</g></g>";
    s += '<g id="ke-padG"><rect x="156" y="142" width="34" height="52" rx="4" fill="#2b4a70" stroke="#1d3550" stroke-width="2"/>' +
      '<rect x="161" y="147" width="24" height="9" rx="1.5" fill="#eef4fb"/>' +
      '<circle cx="165" cy="163" r="2" fill="#9fc0e8"/><circle cx="173" cy="163" r="2" fill="#9fc0e8"/><circle cx="181" cy="163" r="2" fill="#9fc0e8"/>' +
      '<circle cx="165" cy="172" r="2" fill="#9fc0e8"/><circle cx="173" cy="172" r="2" fill="#9fc0e8"/><circle cx="181" cy="172" r="2" fill="#9fc0e8"/>' +
      '<circle cx="165" cy="181" r="2" fill="#9fc0e8"/><circle cx="173" cy="181" r="2" fill="#9fc0e8"/><circle cx="181" cy="181" r="2" fill="#9fc0e8"/>' +
      '<rect x="161" y="187" width="10" height="4" rx="1" fill="#c0392b"/><rect x="175" y="187" width="10" height="4" rx="1" fill="#2e7d4f"/></g>';
    s += '<g id="ke-table"><rect x="336" y="196" width="80" height="9" rx="2" fill="#5a4630"/>' +
      '<rect x="344" y="205" width="9" height="33" fill="#4c3a27"/><rect x="399" y="205" width="9" height="33" fill="#4c3a27"/>' +
      '<rect x="366" y="164" width="12" height="32" rx="2" fill="#e8e0cc"/></g>';
    s += '<g id="ke-dresserG"><rect x="424" y="148" width="82" height="90" rx="3" fill="#5c4430" stroke="#3a2a1c" stroke-width="2.5"/>' +
      '<g id="ke-drawer" style="transition:transform .5s">' +
      '<rect x="430" y="156" width="70" height="26" rx="2" fill="#6d5138" stroke="#3a2a1c"/>' +
      '<rect x="456" y="166" width="18" height="5" rx="2" fill="#c9a86a"/>' +
      '<rect id="ke-diary" x="446" y="160" width="38" height="16" rx="2" fill="#e6d7ae" opacity="0" style="transition:opacity .5s"/></g>' +
      '<rect x="430" y="188" width="70" height="26" rx="2" fill="#6d5138" stroke="#3a2a1c"/>' +
      '<rect x="456" y="198" width="18" height="5" rx="2" fill="#c9a86a"/>' +
      '<rect x="430" y="218" width="70" height="14" rx="2" fill="#66492f"/></g>';
    // darkness + candlelight (drawn over the furniture, pans with it)
    s += '<rect id="ke-darkflat" x="-120" y="-20" width="720" height="330" fill="#0e0b16" opacity=".55" style="transition:opacity 1s" pointer-events="none"/>';
    s += '<rect id="ke-darklitR" x="-120" y="-20" width="720" height="330" fill="url(#ke-darklit)" opacity="0" style="transition:opacity 1s" pointer-events="none"/>';
    s += '<g id="ke-flamewrap">' +
      '<ellipse id="ke-glowE" cx="372" cy="158" rx="120" ry="95" fill="url(#ke-warm)" opacity="0" style="transition:opacity 1s"/>' +
      '<ellipse id="ke-flame" cx="372" cy="154" rx="7" ry="13" fill="#F5B301" opacity="0" style="transition:opacity .5s"/>' +
      '<ellipse id="ke-flame2" cx="372" cy="157" rx="3" ry="6" fill="#fff6d8" opacity="0" style="transition:opacity .5s"/></g>';
    s += "</g>";
    // ---- screen space: fireflies, laser, the player's hands, aim hint
    s += '<g id="ke-flies"></g>';
    s += '<line id="ke-laser" x1="367" y1="244" x2="240" y2="150" stroke="#6fc4ff" stroke-width="2.5" stroke-linecap="round" opacity=".9"/>';
    s += '<circle id="ke-ret" cx="240" cy="150" r="4.5" fill="#6fc4ff" opacity=".95"/>';
    s += '<g class="ke-hands">' +
      '<path d="M28 302 C 30 262 52 244 84 250 C 112 255 124 272 122 302 Z" fill="#efe6cf" stroke="#cbb99a" stroke-width="2"/>' +
      '<path d="M52 262 q 6 20 4 40 M76 254 q 4 22 3 48" stroke="#d8c7a6" stroke-width="2" fill="none"/>' +
      '<path d="M112 280 q 16 -10 15 6 q -2 13 -17 11" fill="#efe6cf" stroke="#cbb99a" stroke-width="2"/>' +
      '<path d="M352 302 C 350 272 358 256 384 251 C 412 246 432 262 436 302 Z" fill="#efe6cf" stroke="#cbb99a" stroke-width="2"/>' +
      '<path d="M372 260 L 362 242 q -3 -8 4 -10 q 7 -2 9 6 L 380 256 Z" fill="#efe6cf" stroke="#cbb99a" stroke-width="2"/>' +
      '<path d="M394 256 q 4 14 2 30 M414 260 q 4 12 3 26" stroke="#d8c7a6" stroke-width="2" fill="none"/>' +
      "</g>";
    s += '<text id="ke-hint" x="12" y="18" font-size="11" font-family="monospace" fill="#cfc4e0"></text>';
    s += "</svg>";
    return s;
  }

  function demoKellie(container) {
    var reducedK = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var sfx = keSfx();
    var tb = toolbar();
    var hint = el("label", null, "aim the laser - click what glows red");
    var mute = el("button", "edit-mini", "🔊 sound");
    var reset = el("button", "edit-mini", "reset");
    reset.style.marginLeft = "auto";
    tb.appendChild(hint); tb.appendChild(mute); tb.appendChild(reset);
    container.appendChild(tb);

    var stage = el("div", "demo-stage");
    var frame = el("div", "ke-frame");
    frame.innerHTML = keSceneSvg();
    var panelHost = el("div", "ke-panelhost");
    frame.appendChild(panelHost);
    // entering screen: the game's own start menu in miniature - storm night,
    // castle silhouette with one lit window, red/yellow title, parchment
    // board, and two VR hands lasering the button (like the real menu)
    var intro = el("div", "ke-intro");
    var kstars = "";
    for (var ki = 0; ki < 16; ki++) {
      kstars += '<circle class="kei-star" cx="' + ((ki * 149) % 470 + 5) + '" cy="' + ((ki * 83) % 120 + 8) +
        '" r="' + (0.8 + (ki % 3) * 0.5) + '" fill="#e8eeff" style="animation-delay:' + ((ki % 7) * 0.4) + 's"/>';
    }
    intro.innerHTML =
      '<svg class="kei-bg" viewBox="0 0 480 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<defs><linearGradient id="kei-sky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#0c1022"/><stop offset=".62" stop-color="#1d1830"/><stop offset="1" stop-color="#26203a"/></linearGradient></defs>' +
      '<rect width="480" height="300" fill="url(#kei-sky)"/>' + kstars +
      '<g class="kei-mist"><ellipse cx="120" cy="240" rx="160" ry="26" fill="#8d96ad" opacity=".1"/>' +
      '<ellipse cx="430" cy="252" rx="180" ry="30" fill="#8d96ad" opacity=".08"/></g>' +
      '<g class="kei-mist kei-mist2"><ellipse cx="300" cy="260" rx="210" ry="26" fill="#aab3c8" opacity=".07"/></g>' +
      '<path d="M0 240 Q 120 218 240 228 T 480 232 L 480 300 L 0 300 Z" fill="#0a0f1e"/>' +
      '<g transform="translate(-138,8)">' +
      '<g fill="#0a0f1e">' +
      '<rect x="196" y="128" width="36" height="104"/>' +
      '<path d="M196 128 h36 v-8 h-8 v5 h-6 v-5 h-8 v5 h-6 v-5 h-8 Z"/>' +
      '<rect x="232" y="166" width="98" height="66"/>' +
      '<path d="M330 232 V170 a16 12 0 0 1 32 0 V232 Z"/>' +
      '</g>' +
      '<path d="M204 148 a4 4 0 0 1 8 0 v9 h-8 Z M218 148 a4 4 0 0 1 8 0 v9 h-8 Z" fill="#151d33"/>' +
      '<path d="M248 186 a5 5 0 0 1 10 0 v11 h-10 Z M270 186 a5 5 0 0 1 10 0 v11 h-10 Z M292 186 a5 5 0 0 1 10 0 v11 h-10 Z" fill="#141c31"/>' +
      '<path class="kei-window" d="M208 176 a5 5 0 0 1 10 0 v13 h-10 Z" fill="#ffd57e"/>' +
      '<circle class="kei-glow" cx="213" cy="184" r="18" fill="rgba(255,213,126,.3)"/>' +
      '</g>' +
      "</svg>" +
      '<div class="kei-title">[ ECHOES IN KELLIE’S CASTLE ]</div>' +
      '<div class="kei-sub">A Virtual Escape Room</div>';
    var board = el("div", "kei-board");
    var wearBtn = el("button", "ke-woodbtn kei-wear", "▶ Put on the headset");
    board.appendChild(wearBtn);
    intro.appendChild(board);
    intro.appendChild(el("div", "kei-mini", "a one-room taste of the real 3-level VR escape game · with sound"));
    frame.appendChild(intro);
    stage.appendChild(frame);
    container.appendChild(stage);
    var log = el("div", "demo-log");
    container.appendChild(log);

    var svg = frame.querySelector("#ke-svg");
    var $ = function (id) { return svg.querySelector("#" + id); };

    mute.addEventListener("click", function () {
      sfx.setMuted(!sfx.isMuted());
      mute.textContent = sfx.isMuted() ? "🔇 muted" : "🔊 sound";
    });

    var S, worn = false, off = 0;
    function init() {
      S = { candle: false, drawer: false, quizDone: false, escaped: false };
      panelHost.innerHTML = "";
      log.innerHTML = "";
      $("ke-flame").style.opacity = 0;
      $("ke-flame2").style.opacity = 0;
      $("ke-glowE").style.opacity = 0;
      $("ke-plaque-text").style.opacity = 0;
      $("ke-diary").style.opacity = 0;
      $("ke-drawer").style.transform = "";
      $("ke-door").style.transform = "";
      $("ke-glow").style.opacity = 0;
      $("ke-darkflat").style.opacity = 0.55;
      $("ke-darklitR").style.opacity = 0;
      $("ke-flies").innerHTML = "";
      if (worn) story();
    }
    function story() {
      logLine(log, "You wake in a locked room of Kellie's Castle. Too dark to see much - but something on the table might help.", "info");
      logLine(log, "(One room of my FYP in miniature - the real game is three full VR levels.)", "");
    }

    function parch(html) {
      panelHost.innerHTML = "";
      var p = el("div", "ke-parch");
      p.innerHTML = html;
      var x = el("button", "ke-x", "✕");
      x.addEventListener("click", function () { panelHost.innerHTML = ""; });
      p.appendChild(x);
      panelHost.appendChild(p);
      return p;
    }

    function candleClick() {
      if (S.escaped) return;
      if (S.candle) { logLine(log, "The candle already burns steady.", ""); return; }
      S.candle = true;
      sfx.candle();
      $("ke-flame").style.opacity = 1;
      $("ke-flame2").style.opacity = 1;
      $("ke-glowE").style.opacity = 0.9;
      $("ke-darkflat").style.opacity = 0;
      $("ke-darklitR").style.opacity = 1;
      $("ke-plaque-text").style.opacity = 1;
      logLine(log, "The candle flares - warmth washes the room. Scorched letters wake on the plaque: 19 · ·", "ok");
      logLine(log, "(In the real Level 3, hidden messages appear only in candlelight.)", "info");
    }
    function plaqueClick() {
      if (!S.candle) { logLine(log, "A stone plaque - too dark to read anything.", "warn"); return; }
      logLine(log, "“Amidst dreams of grandeur...” - the first digits burn: 19 · ·", "info");
    }
    function doorClick() {
      if (S.escaped) return;
      sfx.drawer();
      logLine(log, "Locked tight. The numpad beside it looks functional.", "warn");
    }
    function dresserClick() {
      if (S.escaped) return;
      if (!S.drawer) {
        S.drawer = true;
        sfx.drawer();
        $("ke-drawer").style.transform = "translateY(-9px)";
        $("ke-diary").style.opacity = 1;
        logLine(log, "The drawer slides open. An old diary rests inside - aim at it again.", "info");
        return;
      }
      if (!S.quizDone) showQuiz();
      else logLine(log, "The diary has told you everything: the code ends with 15.", "info");
    }
    function showQuiz() {
      if (S.quizDone || S.escaped) return;
      sfx.page();
      var p = parch('<h5>the diary · “From Scotland to the Jungle”</h5>' +
        "<p>A question guards its secret: in which year did William Kellie-Smith begin building his castle?</p>");
      var row = el("div", "ke-row");
      ["1905", "1915", "1926", "1935"].forEach(function (year) {
        var b = el("button", "ke-woodbtn", year);
        b.addEventListener("click", function () {
          if (year === "1915") {
            S.quizDone = true;
            sfx.chime();
            panelHost.innerHTML = "";
            logLine(log, "Correct - construction began in 1915. The page glows: ...the code ends with 15.", "ok");
            logLine(log, "You have the full code. The numpad waits beside the door.", "info");
          } else {
            sfx.buzz();
            logLine(log, "The ink fades. " + year + " is not the year - try again.", "warn");
          }
        });
        row.appendChild(b);
      });
      p.appendChild(row);
    }
    function showPad() {
      if (S.escaped) return;
      sfx.page();
      var p = parch("<h5>an iron numpad guards the lock</h5><p>" +
        (S.candle ? "The plaque burns: <b>19 · ·</b>. The diary may know the rest." :
          "Its screen sleeps in the dark. Light might help you find the code.") + "</p>");
      var padEl = el("div", "ke-numpad");
      var disp = el("div", "ke-disp", "_ _ _ _");
      padEl.appendChild(disp);
      var keys = el("div", "ke-keys");
      var code = "";
      function paintDisp() { disp.textContent = (code + "____").slice(0, 4).split("").join(" "); }
      "123456789".split("").concat(["DEL", "0", "ENT"]).forEach(function (k) {
        var b = el("button", "ke-key" + (k === "DEL" ? " del" : k === "ENT" ? " ent" : ""), k);
        b.addEventListener("click", function () {
          if (k === "DEL") { code = code.slice(0, -1); paintDisp(); sfx.beep(0); return; }
          if (k === "ENT") {
            if (code.length < 4) { sfx.buzz(); return; }
            if (code === "1915") { panelHost.innerHTML = ""; escapeNow(); }
            else {
              sfx.buzz();
              disp.classList.add("ke-shake");
              setTimeout(function () { disp.classList.remove("ke-shake"); }, 350);
              logLine(log, "The numpad blinks red. Wrong code" + (S.quizDone ? "." : " - the room still holds clues."), "bad");
              code = ""; paintDisp();
            }
            return;
          }
          if (code.length >= 4) return;
          code += k; sfx.beep(k); paintDisp();
        });
        keys.appendChild(b);
      });
      padEl.appendChild(keys);
      p.appendChild(padEl);
    }
    function spawnFlies() {
      var g = $("ke-flies"), frag = "";
      for (var i = 0; i < 10; i++) {
        frag += '<circle class="ke-fly" cx="' + (90 + Math.random() * 300).toFixed(0) +
          '" cy="' + (235 + Math.random() * 30).toFixed(0) +
          '" r="' + (1.8 + Math.random() * 1.6).toFixed(1) +
          '" fill="#ffe89a" style="animation-delay:' + (Math.random() * 1.4).toFixed(2) + 's"/>';
      }
      g.innerHTML = frag;
    }
    function escapeNow() {
      S.escaped = true;
      sfx.unlock();
      $("ke-door").style.transform = "rotateY(72deg)";
      $("ke-glow").style.opacity = 0.6;
      $("ke-darkflat").style.opacity = 0;
      $("ke-darklitR").style.opacity = 0.2;
      setTimeout(function () { sfx.creak(); }, 250);
      if (!reducedK) spawnFlies();
      logLine(log, "CLICK. The lock surrenders - golden light floods the doorway.", "ok");
      setTimeout(function () {
        sfx.chime();
        var p = parch('<div class="ke-stamp">YOU ESCAPED</div>' +
          "<p>And that was one small room. The real FYP is a full three-level VR escape game inside the actual castle - candlelit messages, a scrambled floor plan, and a code hidden in its history.</p>");
        var row = el("div", "ke-row");
        var a1 = el("a", "ke-woodbtn", "▶ Watch the cinematic");
        a1.href = "kellie.html#k-play";
        var a2 = el("a", "ke-woodbtn", "Enter the full experience ▸");
        a2.href = "kellie.html";
        row.appendChild(a1); row.appendChild(a2);
        p.appendChild(row);
      }, 1100);
    }

    // aimable things (world coords; the plaque sits on the far layer)
    var TARGETS = [
      { x0: 336, y0: 148, x1: 416, y1: 238, far: false, label: "an old candle", fn: candleClick },
      { x0: 420, y0: 142, x1: 508, y1: 238, far: false, label: "a dresser", fn: dresserClick },
      { x0: 152, y0: 136, x1: 196, y1: 200, far: false, label: "a numpad by the door", fn: showPad },
      { x0: 58, y0: 88, x1: 150, y1: 238, far: false, label: "the way out", fn: doorClick },
      { x0: 206, y0: 58, x1: 334, y1: 128, far: true, label: "a stone plaque", fn: plaqueClick }
    ];
    function aimAt(vx, vy) {
      for (var i = 0; i < TARGETS.length; i++) {
        var r = TARGETS[i], x = vx + (r.far ? off * 0.45 : off);
        if (x >= r.x0 && x <= r.x1 && vy >= r.y0 && vy <= r.y1) return r;
      }
      return null;
    }
    function svgPoint(ev) {
      var r = svg.getBoundingClientRect();
      return { x: (ev.clientX - r.left) / r.width * 480, y: (ev.clientY - r.top) / r.height * 300 };
    }
    svg.addEventListener("mousemove", function (ev) {
      var p = svgPoint(ev);
      if (!reducedK) {
        off = (p.x / 480 - 0.5) * 70;
        $("ke-mid").style.transform = "translateX(" + (-off).toFixed(1) + "px)";
        $("ke-far").style.transform = "translateX(" + (-off * 0.45).toFixed(1) + "px)";
      }
      var t = worn ? aimAt(p.x, p.y) : null;
      var laser = $("ke-laser"), ret = $("ke-ret");
      laser.setAttribute("x2", p.x); laser.setAttribute("y2", p.y);
      ret.setAttribute("cx", p.x); ret.setAttribute("cy", p.y);
      var col = t ? "#ff6a4d" : "#6fc4ff";
      laser.setAttribute("stroke", col);
      ret.setAttribute("fill", col);
      $("ke-hint").textContent = t ? t.label : "";
    });
    svg.addEventListener("click", function (ev) {
      if (!worn) return;
      var p = svgPoint(ev);
      var t = aimAt(p.x, p.y);
      if (t) t.fn();
    });

    wearBtn.addEventListener("click", function () {
      worn = true;
      sfx.wear();
      sfx.ambientOn(stage);
      intro.classList.add("off");
      setTimeout(function () { intro.remove(); }, 950);
      story();
    });
    reset.addEventListener("click", init);
    init();
  }

  /* ============================================================
     8. KELLIE VR-360 - drag-to-look-around panoramic navigation,
     mirroring the game's VR360 explore mode (Outdoor / Balcony /
     Courtyard viewpoints). Panoramas are hand-drawn SVG strips
     that wrap seamlessly through a full 360 degrees.
     ============================================================ */
  // Moorish arched opening (dark - the real castle is a glassless ruin)
  function kvArch(x, y, w, h, fill) {
    var c = w * 0.62;
    return '<path d="M' + x + ' ' + y + ' v' + (-(h - c)) + ' q0 ' + (-c) + ' ' + (w / 2) + ' ' + (-c) +
      ' q' + (w / 2) + ' 0 ' + (w / 2) + ' ' + c + ' v' + (h - c) + ' z" fill="' + (fill || "#241b14") + '"/>';
  }
  function panoOutdoor() {
    var i, x;
    // main block: ground-floor arcade + upper windows (brick, like the photos)
    var arcade = "";
    for (i = 0; i < 6; i++) arcade += kvArch(352 + i * 34, 206, 22, 40);
    var uppers = "";
    for (i = 0; i < 7; i++) uppers += kvArch(352 + i * 30, 156, 16, 26);
    // left square tower windows: 4 floors x 2
    var towerWins = "";
    for (i = 0; i < 4; i++) {
      towerWins += kvArch(216, 100 + i * 34, 12, 22) + kvArch(244, 100 + i * 34, 12, 22);
    }
    // white bay cusped arches: 3 floors
    var bayWins = "";
    for (i = 0; i < 3; i++) bayWins += kvArch(292, 128 + i * 30, 14, 22, "#3a2f26") + kvArch(314, 128 + i * 30, 14, 22, "#3a2f26");
    // round tower tall openings
    var roundWins = kvArch(576, 150, 14, 34) + kvArch(598, 150, 14, 34) + kvArch(576, 196, 14, 30) + kvArch(598, 196, 14, 30);
    // entrance sign fence
    var fence = "";
    for (i = 0; i < 22; i++) fence += '<rect x="' + (935 + i * 10) + '" y="216" width="2.5" height="18" fill="#2a2622"/>';
    return '<svg viewBox="0 0 1200 300" height="100%" preserveAspectRatio="xMinYMin meet" style="display:block">' +
      '<defs><linearGradient id="kv-sky1" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#9db4d6"/><stop offset=".55" stop-color="#dce4ea"/><stop offset="1" stop-color="#f2e6c8"/></linearGradient>' +
      '<linearGradient id="kv-brick" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#d18a55"/><stop offset="1" stop-color="#b06a3d"/></linearGradient></defs>' +
      '<rect width="1200" height="300" fill="url(#kv-sky1)"/>' +
      '<circle cx="700" cy="52" r="24" fill="#fbf0cf" opacity=".95"/><circle cx="700" cy="52" r="38" fill="#fbf0cf" opacity=".3"/>' +
      '<ellipse cx="250" cy="52" rx="70" ry="12" fill="#ffffff" opacity=".65"/><ellipse cx="620" cy="34" rx="55" ry="10" fill="#ffffff" opacity=".55"/><ellipse cx="890" cy="60" rx="65" ry="11" fill="#ffffff" opacity=".6"/>' +
      // lawn + the grassy hill the castle sits on (photos: green mound)
      '<rect x="0" y="232" width="1200" height="68" fill="#7fa050"/>' +
      '<path d="M100 300 Q 200 216 400 208 Q 620 202 760 224 Q 840 240 880 300 Z" fill="#74964a"/>' +
      '<path d="M140 300 Q 240 228 420 220 Q 600 214 740 236 Q 810 250 850 300 Z" fill="#8ab05c" opacity=".7"/>' +
      // ===== the castle (brick + white plaster, per the real photos) =====
      // left tall square tower (4 storeys, pilasters, parapet, flag)
      '<rect x="204" y="76" width="62" height="134" fill="url(#kv-brick)" stroke="#7c4526" stroke-width="1.5"/>' +
      '<rect x="204" y="76" width="6" height="134" fill="#cf8f5e"/><rect x="232" y="76" width="6" height="134" fill="#cf8f5e"/><rect x="260" y="76" width="6" height="134" fill="#cf8f5e"/>' +
      '<line x1="204" y1="110" x2="266" y2="110" stroke="#8a5230" stroke-width="1.5"/><line x1="204" y1="144" x2="266" y2="144" stroke="#8a5230" stroke-width="1.5"/><line x1="204" y1="178" x2="266" y2="178" stroke="#8a5230" stroke-width="1.5"/>' +
      towerWins +
      '<rect x="200" y="68" width="70" height="10" fill="#b06a42" stroke="#7c4526"/>' +
      '<line x1="236" y1="68" x2="236" y2="46" stroke="#4a3a2c" stroke-width="1.5"/><path d="M236 46 l14 4 -14 4 z" fill="#c8b98a"/>' +
      // white plastered bay with balconies (the bright section mid-facade)
      '<rect x="282" y="112" width="54" height="98" fill="#ece7da" stroke="#b8ac94" stroke-width="1.5"/>' +
      bayWins +
      '<rect x="284" y="150" width="50" height="4" fill="#d8d0bc"/><rect x="284" y="180" width="50" height="4" fill="#d8d0bc"/>' +
      // main two-storey block with Moorish arcade
      '<rect x="336" y="132" width="230" height="78" fill="url(#kv-brick)" stroke="#7c4526" stroke-width="1.5"/>' +
      '<line x1="336" y1="166" x2="566" y2="166" stroke="#8a5230" stroke-width="2"/>' +
      arcade + uppers +
      '<rect x="336" y="124" width="230" height="8" fill="#b06a42" stroke="#7c4526"/>' +
      '<line x1="380" y1="124" x2="380" y2="106" stroke="#4a3a2c" stroke-width="1.2"/><path d="M380 106 l11 3 -11 3 z" fill="#8a9c6a"/>' +
      '<line x1="470" y1="124" x2="470" y2="104" stroke="#4a3a2c" stroke-width="1.2"/><path d="M470 104 l11 3 -11 3 z" fill="#c8b98a"/>' +
      // round corner tower with overhanging crown (right, like the rotunda photo)
      '<path d="M566 210 V128 a30 30 0 0 1 60 0 V210 Z" fill="#c07a4a" stroke="#7c4526" stroke-width="1.5"/>' +
      '<ellipse cx="596" cy="122" rx="38" ry="9" fill="#a86238" stroke="#7c4526"/>' +
      '<rect x="560" y="112" width="72" height="10" rx="4" fill="#b06a42" stroke="#7c4526"/>' +
      roundWins +
      '<line x1="596" y1="112" x2="596" y2="94" stroke="#4a3a2c" stroke-width="1.2"/><path d="M596 94 l11 3 -11 3 z" fill="#c8b98a"/>' +
      // ===== trees (big leafy tropicals like the site, one palm) =====
      '<rect x="86" y="176" width="9" height="60" fill="#5c4630"/>' +
      '<ellipse cx="90" cy="152" rx="52" ry="34" fill="#527040"/><ellipse cx="64" cy="170" rx="34" ry="24" fill="#5e7f4a"/><ellipse cx="118" cy="168" rx="32" ry="22" fill="#486338"/>' +
      '<rect x="742" y="170" width="10" height="66" fill="#5c4630"/>' +
      '<ellipse cx="748" cy="146" rx="56" ry="36" fill="#527040"/><ellipse cx="716" cy="166" rx="36" ry="24" fill="#5e7f4a"/><ellipse cx="782" cy="162" rx="34" ry="24" fill="#486338"/>' +
      '<g stroke="#4a3a28" stroke-width="5" fill="none"><path d="M1152 236 q6 -44 2 -66"/></g>' +
      '<g stroke="#3c4f36" stroke-width="4" fill="none" stroke-linecap="round">' +
      '<path d="M1154 170 q-22 -12 -38 -3"/><path d="M1154 170 q22 -12 38 -3"/><path d="M1154 170 q-10 -24 -26 -28"/><path d="M1154 170 q10 -24 26 -28"/></g>' +
      // ===== the iconic white entrance sign on the lawn =====
      fence +
      '<text x="1046" y="232" text-anchor="middle" font-size="15" font-weight="bold" font-family="Georgia, serif" fill="#f2efe6" stroke="#8a8474" stroke-width=".4">KELLIE’S CASTLE</text>' +
      '</svg>';
  }
  function panoBalcony() {
    var posts = "";
    for (var i = 0; i < 30; i++) posts += '<rect x="' + (i * 40 + 12) + '" y="238" width="8" height="42" rx="3" fill="#9a8c74"/>';
    return '<svg viewBox="0 0 1200 300" height="100%" preserveAspectRatio="xMinYMin meet" style="display:block">' +
      '<defs><linearGradient id="kv-sky2" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#8fa8cf"/><stop offset="1" stop-color="#e6d3b4"/></linearGradient></defs>' +
      '<rect width="1200" height="300" fill="url(#kv-sky2)"/>' +
      '<ellipse cx="300" cy="60" rx="60" ry="12" fill="#ffffff" opacity=".6"/><ellipse cx="720" cy="44" rx="80" ry="14" fill="#ffffff" opacity=".55"/><ellipse cx="1050" cy="70" rx="50" ry="10" fill="#ffffff" opacity=".6"/>' +
      '<path d="M0 190 Q 180 168 360 186 T 720 182 T 1200 190 V300 H0 Z" fill="#6d8a58"/>' +
      '<path d="M0 214 Q 300 198 600 210 T 1200 212 V300 H0 Z" fill="#82a061"/>' +
      '<path d="M120 300 Q 260 232 420 260 Q 560 284 680 300 Z" fill="#9dbdd8" opacity=".85"/>' +
      '<g fill="#4d6a3c"><ellipse cx="200" cy="206" rx="22" ry="10"/><ellipse cx="540" cy="200" rx="26" ry="11"/><ellipse cx="940" cy="206" rx="24" ry="10"/><ellipse cx="1120" cy="198" rx="18" ry="8"/></g>' +
      '<g stroke="#3f4550" stroke-width="2.5" fill="none"><path d="M380 84 q8 6 16 0"/><path d="M420 70 q8 6 16 0"/><path d="M840 92 q8 6 16 0"/></g>' +
      // brick tower we stand beside (matching the real castle)
      '<path d="M40 300 V96 a44 44 0 0 1 88 0 V300 Z" fill="#b06a42" stroke="#7c4526" stroke-width="2"/>' +
      '<rect x="46" y="96" width="6" height="204" fill="#cf8f5e"/><rect x="116" y="96" width="6" height="204" fill="#cf8f5e"/>' +
      '<line x1="40" y1="150" x2="128" y2="150" stroke="#8a5230" stroke-width="2"/><line x1="40" y1="204" x2="128" y2="204" stroke="#8a5230" stroke-width="2"/>' +
      kvArch(62, 140, 16, 28) + kvArch(90, 140, 16, 28) + kvArch(62, 192, 16, 28) + kvArch(90, 192, 16, 28) +
      // balcony railing full wrap
      '<rect x="0" y="232" width="1200" height="10" rx="4" fill="#b8ab94"/>' + posts +
      '<rect x="0" y="276" width="1200" height="8" rx="3" fill="#9a8c74"/>' +
      '</svg>';
  }
  function panoCourtyard() {
    var seg = "";
    for (var i = 0; i < 6; i++) {
      var x = i * 200;
      seg += '<rect x="' + x + '" y="60" width="26" height="180" fill="#a5643c" stroke="#7c4526"/>' +
             '<rect x="' + x + '" y="60" width="5" height="180" fill="#c07a4a"/>' +
             '<path d="M' + (x + 26) + ' 240 v-110 q0 -70 74 -70 q74 0 74 70 v110 z" fill="#8facc8"/>' +
             '<path d="M' + (x + 26) + ' 240 v-110 q0 -70 74 -70 q74 0 74 70 v110" fill="none" stroke="#7c4526" stroke-width="4"/>' +
             '<path d="M' + (x + 40) + ' 240 v-96 q0 -56 60 -56 q60 0 60 56 v96 z" fill="none" stroke="#cf8f5e" stroke-width="2"/>' +
             '<ellipse cx="' + (x + 100) + '" cy="236" rx="60" ry="5" fill="#d9c39c" opacity=".35"/>' +
             '<rect x="' + (x + 176) + '" y="120" width="10" height="16" rx="2" fill="#5a3a24"/>' +
             '<ellipse cx="' + (x + 181) + '" cy="118" rx="7" ry="9" fill="#F5B301" opacity=".85"/>';
    }
    var bricksTop = "";
    for (var b = 0; b < 30; b++) bricksTop += '<rect x="' + (b * 40 + (b % 2) * 20) + '" y="' + (34 + (b % 2) * 13) + '" width="36" height="11" fill="#96552f" opacity=".35"/>';
    var tiles = "";
    for (var r = 0; r < 3; r++) for (var c = 0; c < 15; c++)
      tiles += '<rect x="' + (c * 80 + (r % 2) * 40) + '" y="' + (250 + r * 17) + '" width="76" height="14" rx="3" fill="#8a5230" opacity="' + (0.25 + (c % 3) * 0.1) + '"/>';
    return '<svg viewBox="0 0 1200 300" height="100%" preserveAspectRatio="xMinYMin meet" style="display:block">' +
      '<rect width="1200" height="300" fill="#9a6038"/>' +
      '<rect x="0" y="0" width="1200" height="60" fill="#824c28"/>' + bricksTop +
      '<rect x="0" y="240" width="1200" height="60" fill="#7a4c2c"/>' + tiles + seg +
      '</svg>';
  }

  /* ---- interior rooms for the wander mode. The real game's rooms are
     dark grey stone with warm light pools and simple furniture - this
     minimal painted style is faithful to the actual build. ---- */
  function kvRoom(inner) {
    return '<svg viewBox="0 0 1200 300" height="100%" preserveAspectRatio="xMinYMin meet" style="display:block">' +
      '<rect width="1200" height="300" fill="#4c4557"/>' +
      '<rect y="0" width="1200" height="34" fill="#3b3547"/>' +
      '<rect y="216" width="1200" height="84" fill="#846f54"/>' +
      '<g stroke="#5c4c39" stroke-width="1.5"><line x1="0" y1="244" x2="1200" y2="244"/><line x1="0" y1="272" x2="1200" y2="272"/></g>' +
      inner + "</svg>";
  }
  function kvWarm(x, y, rx, ry) {
    return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="rgba(255,210,130,.2)"/>';
  }
  function kvWindowArch(x, w, h, bright) {
    var y = 190, c = w * 0.6;
    return '<path d="M' + x + " " + y + " v" + (-(h - c)) + " q0 " + (-c) + " " + (w / 2) + " " + (-c) +
      " q" + (w / 2) + " 0 " + (w / 2) + " " + c + " v" + (h - c) + ' z" fill="' + (bright || "#ddd0a8") + '"/>' +
      kvWarm(x + w / 2, 210, w * 1.1, 16);
  }
  function panoVerandah() {
    var arches = "", cols = "";
    for (var i = 0; i < 5; i++) {
      var x = 120 + i * 200;
      arches += '<path d="M' + x + ' 210 v-100 q0 -56 62 -56 q62 0 62 56 v100 z" fill="#b9cfdd"/>' +
        '<path d="M' + x + ' 210 v-100 q0 -56 62 -56 q62 0 62 56 v100" fill="none" stroke="#241f2b" stroke-width="5"/>' +
        '<path d="M' + x + ' 176 q40 -18 124 -2 l0 34 h-124 z" fill="#7fae6b"/>' +
        '<ellipse cx="' + (x + 62) + '" cy="226" rx="70" ry="10" fill="#f2e6c2" opacity=".5"/>';
      cols += '<rect x="' + (x + 124) + '" y="60" width="22" height="156" fill="#2f2a38"/>';
    }
    return '<svg viewBox="0 0 1200 300" height="100%" preserveAspectRatio="xMinYMin meet" style="display:block">' +
      '<rect width="1200" height="300" fill="#4c4557"/>' +
      '<rect y="0" width="1200" height="60" fill="#e3d6ae"/>' +
      '<rect y="52" width="1200" height="8" fill="#c9bb92"/>' +
      '<rect y="216" width="1200" height="84" fill="#e8dcb4"/>' +
      '<g stroke="#cec19a" stroke-width="2"><line x1="0" y1="240" x2="1200" y2="240"/><line x1="0" y1="268" x2="1200" y2="268"/></g>' +
      arches + cols +
      '<rect x="900" y="96" width="76" height="120" rx="4" fill="#241f2b"/>' +
      '<rect x="906" y="104" width="64" height="112" rx="3" fill="#5f4325"/>' +
      '<circle cx="958" cy="164" r="4" fill="#c9a86a"/>' +
      '<circle cx="330" cy="46" r="7" fill="#ffd98a"/><circle cx="730" cy="46" r="7" fill="#ffd98a"/>' +
      kvWarm(330, 60, 60, 18) + kvWarm(730, 60, 60, 18) +
      "</svg>";
  }
  function panoLiving() {
    return kvRoom(
      kvWindowArch(180, 90, 120) + kvWindowArch(880, 90, 120) +
      // fireplace
      '<g class="kv-act" data-act="fire"><rect x="420" y="120" width="120" height="96" fill="#4a4450" stroke="#241f2b" stroke-width="3"/>' +
      '<path d="M440 216 v-64 q40 -26 80 0 v64 z" fill="#241f2b"/>' +
      '<path class="kv-flame" d="M470 208 q10 -26 10 -34 q14 14 6 34 z" fill="#e8843e"/>' +
      '<circle class="kv-flame" cx="484" cy="200" r="6" fill="#F5B301"/>' +
      kvWarm(480, 208, 90, 26) + "</g>" +
      // long table + benches
      '<g class="kv-act" data-act="bench"><rect x="620" y="176" width="180" height="10" rx="3" fill="#6b4a2e"/>' +
      '<rect x="632" y="186" width="10" height="34" fill="#573a22"/><rect x="778" y="186" width="10" height="34" fill="#573a22"/>' +
      '<rect x="600" y="196" width="60" height="7" rx="2" fill="#5f4325"/><rect x="606" y="203" width="7" height="18" fill="#4c3319"/>' +
      '<rect x="760" y="196" width="60" height="7" rx="2" fill="#5f4325"/><rect x="806" y="203" width="7" height="18" fill="#4c3319"/>' +
      '<rect x="668" y="164" width="18" height="12" rx="2" fill="#c9b98a"/></g>' +
      // cabinet
      '<rect x="1020" y="140" width="76" height="76" rx="3" fill="#5c4430" stroke="#3a2a1c" stroke-width="2"/>' +
      '<line x1="1058" y1="140" x2="1058" y2="216" stroke="#3a2a1c" stroke-width="2"/>' +
      '<ellipse cx="710" cy="236" rx="120" ry="12" fill="#5f4030" opacity=".8"/>'
    );
  }
  function panoStudy() {
    var books = "";
    for (var r = 0; r < 2; r++) for (var i = 0; i < 14; i++) {
      var bx = 160 + i * 16 + (r % 2) * 4, cyc = ["#8a5a3c", "#5f7d4a", "#5a7a9e", "#a05252", "#b8934a"][i % 5];
      books += '<rect x="' + bx + '" y="' + (108 + r * 52) + '" width="11" height="38" rx="1.5" fill="' + cyc + '"/>';
    }
    return kvRoom(
      '<g class="kv-act" data-act="books"><rect x="140" y="88" width="260" height="128" fill="#4a3826" stroke="#241f2b" stroke-width="3"/>' +
      '<rect x="148" y="150" width="244" height="6" fill="#33251a"/>' + books + "</g>" +
      // desk with candle
      '<rect x="560" y="170" width="130" height="9" rx="2" fill="#6b4a2e"/>' +
      '<rect x="570" y="179" width="9" height="38" fill="#573a22"/><rect x="670" y="179" width="9" height="38" fill="#573a22"/>' +
      '<rect x="600" y="150" width="8" height="20" fill="#e8e0cc"/><ellipse cx="604" cy="144" rx="4" ry="7" fill="#F5B301"/>' +
      kvWarm(604, 168, 70, 22) +
      // chalk slate (the game's hint board)
      '<g class="kv-act" data-act="slate"><rect x="800" y="100" width="130" height="96" rx="4" fill="#1d1a24" stroke="#5c4430" stroke-width="5"/>' +
      '<path d="M816 130 q30 -12 54 0 M816 152 q40 -10 84 -2 M816 174 q24 -8 48 0" stroke="#cfc4e0" stroke-width="2.5" fill="none" opacity=".8"/></g>' +
      kvWindowArch(1030, 84, 116)
    );
  }
  function panoKitchen() {
    var shelfpots = "";
    for (var i = 0; i < 5; i++) {
      shelfpots += '<rect x="' + (656 + i * 34) + '" y="106" width="22" height="16" rx="3" fill="' + (i % 2 ? "#8a8494" : "#b06a3d") + '"/>';
    }
    return kvRoom(
      // counter run
      '<rect x="120" y="160" width="330" height="12" rx="2" fill="#3f3a46"/>' +
      '<rect x="126" y="172" width="318" height="48" fill="#5c4430" stroke="#3a2a1c" stroke-width="2"/>' +
      '<line x1="230" y1="172" x2="230" y2="220" stroke="#3a2a1c" stroke-width="2"/><line x1="340" y1="172" x2="340" y2="220" stroke="#3a2a1c" stroke-width="2"/>' +
      // stove + pot
      '<rect x="250" y="146" width="70" height="14" rx="3" fill="#2d2937"/>' +
      '<rect x="262" y="130" width="44" height="18" rx="4" fill="#8a8494"/><rect x="278" y="122" width="12" height="8" fill="#8a8494"/>' +
      // teapot (steam on click)
      '<g class="kv-act" data-act="teapot"><path d="M160 160 q-2 -18 14 -18 q16 0 14 18 z" fill="#e8e0cc"/>' +
      '<path d="M186 150 q10 -2 8 8" stroke="#e8e0cc" stroke-width="4" fill="none"/>' +
      '<path class="kv-steam" d="M172 136 q4 -8 0 -14 q-4 -6 0 -12" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>' +
      // shelf with pots
      '<rect x="640" y="122" width="200" height="7" fill="#4a3826"/>' + shelfpots +
      // washing basin
      '<g class="kv-act" data-act="basin"><rect x="890" y="158" width="120" height="14" rx="3" fill="#3f3a46"/>' +
      '<ellipse cx="950" cy="164" rx="40" ry="8" fill="#8fb3c9"/>' +
      '<rect x="896" y="172" width="108" height="46" fill="#5c4430" stroke="#3a2a1c" stroke-width="2"/>' +
      '<path d="M938 148 q0 -14 14 -12" stroke="#8a8494" stroke-width="5" fill="none"/></g>' +
      kvWindowArch(1060, 80, 110) + kvWarm(300, 180, 130, 30)
    );
  }
  function panoLaundry() {
    var clothes = "";
    [[520, "#a05252", 26], [578, "#e8e0cc", 22], [630, "#5a7a9e", 28], [690, "#c9b98a", 24]].forEach(function (c) {
      clothes += '<g class="kv-sway" style="animation-delay:' + (c[0] % 3) * 0.5 + 's">' +
        '<rect x="' + c[0] + '" y="112" width="' + c[2] + '" height="' + (34 + c[2]) + '" rx="4" fill="' + c[1] + '"/></g>';
    });
    return kvRoom(
      // washing machine with spinning drum
      '<g class="kv-act" data-act="machine"><rect x="150" y="140" width="80" height="80" rx="6" fill="#cfd4da" stroke="#8a8494" stroke-width="2.5"/>' +
      '<rect x="158" y="148" width="64" height="12" rx="3" fill="#8a8494"/>' +
      '<circle cx="190" cy="192" r="24" fill="#5a7a9e" stroke="#3e5674" stroke-width="3"/>' +
      '<g class="kv-drum"><circle cx="190" cy="192" r="17" fill="#8fb3c9"/><circle cx="196" cy="184" r="5" fill="#e8f2fa"/></g></g>' +
      // washing basin on stand
      '<g class="kv-act" data-act="basin"><ellipse cx="300" cy="168" rx="34" ry="10" fill="#8fb3c9"/>' +
      '<path d="M268 168 q4 22 32 22 q28 0 32 -22 z" fill="#9aa0a8"/>' +
      '<rect x="292" y="190" width="16" height="30" fill="#6b4a2e"/></g>' +
      // hanging line with swaying clothes
      '<path d="M480 112 Q 610 126 730 112" stroke="#c9b98a" stroke-width="2.5" fill="none"/>' +
      '<rect x="472" y="96" width="7" height="124" fill="#573a22"/><rect x="726" y="96" width="7" height="124" fill="#573a22"/>' +
      '<g class="kv-act" data-act="clothes">' + clothes + "</g>" +
      // drying rack
      '<g class="kv-act" data-act="rack"><rect x="800" y="140" width="90" height="80" fill="none" stroke="#6b4a2e" stroke-width="5"/>' +
      '<line x1="800" y1="168" x2="890" y2="168" stroke="#6b4a2e" stroke-width="4"/>' +
      '<line x1="800" y1="196" x2="890" y2="196" stroke="#6b4a2e" stroke-width="4"/>' +
      '<rect x="808" y="146" width="34" height="18" rx="3" fill="#e8e0cc"/><rect x="850" y="174" width="30" height="18" rx="3" fill="#a05252"/></g>' +
      // storage wardrobe + folded cloth + bench
      '<rect x="960" y="120" width="90" height="100" rx="3" fill="#5c4430" stroke="#3a2a1c" stroke-width="2.5"/>' +
      '<line x1="1005" y1="120" x2="1005" y2="220" stroke="#3a2a1c" stroke-width="2"/>' +
      '<rect x="972" y="132" width="26" height="10" rx="2" fill="#e8e0cc"/><rect x="972" y="146" width="26" height="10" rx="2" fill="#c9b98a"/>' +
      '<g class="kv-act" data-act="bench"><rect x="1080" y="190" width="90" height="8" rx="3" fill="#6b4a2e"/>' +
      '<rect x="1088" y="198" width="8" height="22" fill="#573a22"/><rect x="1156" y="198" width="8" height="22" fill="#573a22"/></g>' +
      kvWarm(600, 170, 160, 40)
    );
  }
  function panoStairs() {
    var steps = "";
    for (var i = 0; i < 9; i++) {
      steps += '<rect x="' + (420 + i * 44) + '" y="' + (214 - i * 14) + '" width="52" height="10" rx="2" fill="#b5a888" transform="rotate(' + (-3 - i) + ' ' + (446 + i * 44) + ' ' + (218 - i * 14) + ')"/>';
    }
    return kvRoom(
      '<rect x="560" y="34" width="60" height="182" fill="#2f2a38"/>' +
      '<path d="M560 34 h60 M560 216 h60" stroke="#241f2b" stroke-width="3"/>' +
      steps +
      '<path d="M420 200 Q 610 140 800 96" stroke="#8a7a5e" stroke-width="5" fill="none"/>' +
      '<path d="M446 214 v-16 M534 190 v-16 M622 158 v-16 M710 128 v-16 M790 104 v-14" stroke="#8a7a5e" stroke-width="3.5"/>' +
      kvWindowArch(200, 60, 90) + kvWindowArch(940, 60, 90) +
      kvWarm(610, 160, 140, 60)
    );
  }
  function panoBedroom() {
    return kvRoom(
      // bed
      '<g class="kv-act" data-act="bed"><rect x="300" y="130" width="20" height="90" rx="4" fill="#5c4430"/>' +
      '<rect x="316" y="160" width="180" height="46" rx="6" fill="#e8e0cc"/>' +
      '<rect x="316" y="176" width="180" height="34" rx="6" fill="#6d8a9e"/>' +
      '<rect x="322" y="152" width="42" height="20" rx="6" fill="#f4efe2"/><rect x="370" y="152" width="42" height="20" rx="6" fill="#f4efe2"/>' +
      '<rect x="316" y="206" width="180" height="14" fill="#573a22"/></g>' +
      '<rect x="510" y="176" width="34" height="44" rx="3" fill="#5c4430"/>' +
      // wardrobe with opening doors
      '<g class="kv-act" data-act="wardrobe"><rect x="700" y="96" width="120" height="124" rx="4" fill="#4a3322" stroke="#2e1f12" stroke-width="3"/>' +
      '<rect x="708" y="104" width="104" height="108" fill="#241f2b"/>' +
      '<rect x="716" y="112" width="14" height="60" rx="3" fill="#a05252"/><rect x="736" y="112" width="14" height="60" rx="3" fill="#5a7a9e"/>' +
      '<rect x="756" y="112" width="14" height="60" rx="3" fill="#c9b98a"/><rect x="776" y="112" width="14" height="60" rx="3" fill="#5f7d4a"/>' +
      '<rect class="kv-swing-l" x="704" y="100" width="56" height="116" rx="3" fill="#5c4430" stroke="#2e1f12" stroke-width="2"/>' +
      '<rect class="kv-swing-r" x="760" y="100" width="56" height="116" rx="3" fill="#5c4430" stroke="#2e1f12" stroke-width="2"/>' +
      '<circle cx="754" cy="158" r="3" fill="#c9a86a"/><circle cx="766" cy="158" r="3" fill="#c9a86a"/></g>' +
      // framed plan + curtained window
      '<rect x="900" y="110" width="70" height="52" rx="3" fill="#e8dfc6" stroke="#5c4430" stroke-width="4"/>' +
      '<path d="M910 124 h50 M910 136 h36 M910 148 h44" stroke="#4a3f2e" stroke-width="2"/>' +
      kvWindowArch(1040, 80, 110) +
      '<path d="M1036 80 q10 70 4 110 M1128 80 q-10 70 -4 110" stroke="#8a6b4a" stroke-width="10" fill="none"/>' +
      '<ellipse cx="420" cy="238" rx="110" ry="11" fill="#5f4030" opacity=".8"/>'
    );
  }

  function demoKellieVR(container) {
    var ROOMS = {
      outdoor: { name: "THE LAWN · OUTDOOR", draw: panoOutdoor, sky: true,
        line: "The lawn before Kellie's Castle - red brick against a storm sky. Drag to look around.",
        exits: [{ x: 470, y: 192, to: "verandah", label: "enter the castle" }],
        hs: [
          { x: 236, y: 84, fact: "The six-storey tower - in its day among the tallest structures in Perak. You can climb it in the game." },
          { x: 1046, y: 198, fact: "The white lawn sign every visitor photographs. Construction began in 1915 - and never finished." }
        ] },
      verandah: { name: "GROUND · VERANDAH", draw: panoVerandah,
        line: "The long verandah - Moorish arches on one side, the valley beyond.",
        exits: [
          { x: 80, y: 190, to: "outdoor", label: "the lawn" },
          { x: 938, y: 226, to: "living", label: "living room" },
          { x: 1140, y: 190, to: "courtyard", label: "courtyard" }
        ] },
      courtyard: { name: "GROUND · COURTYARD", draw: panoCourtyard,
        line: "Unfinished corridors, lit by lamps - the dream, frozen in 1926.",
        exits: [{ x: 110, y: 190, to: "verandah", label: "verandah" }],
        hs: [{ x: 326, y: 140, fact: "Moorish arches, left unfinished when the hammers fell silent in 1926." }] },
      living: { name: "GROUND · LIVING ROOM", draw: panoLiving,
        line: "The living hall - a fire, a long table, room for guests who never came.",
        exits: [
          { x: 70, y: 190, to: "verandah", label: "verandah" },
          { x: 320, y: 190, to: "study", label: "study room" },
          { x: 960, y: 190, to: "kitchen", label: "kitchen" },
          { x: 1130, y: 150, dir: "up", to: "stairs", label: "staircase" }
        ] },
      study: { name: "GROUND · STUDY ROOM", draw: panoStudy,
        line: "The study - shelves of knowledge, and the slate where Level 2's clues live.",
        exits: [{ x: 1130, y: 190, to: "living", label: "living room" }] },
      kitchen: { name: "GROUND · KITCHEN", draw: panoKitchen,
        line: "The kitchen - kettle on the stove, pots on the shelf, a basin under the window.",
        exits: [
          { x: 70, y: 190, to: "living", label: "living room" },
          { x: 1150, y: 235, to: "laundry", label: "multipurpose room" }
        ] },
      laundry: { name: "GROUND · MULTIPURPOSE", draw: panoLaundry,
        line: "The multipurpose room - washing machine, basin, drying line, racks and benches.",
        exits: [{ x: 60, y: 190, to: "kitchen", label: "kitchen" }] },
      stairs: { name: "THE WINDING STAIRCASE", draw: panoStairs,
        line: "The famous spiral staircase, step by step around the column.",
        exits: [
          { x: 250, y: 210, dir: "down", to: "living", label: "down · the hall" },
          { x: 900, y: 100, dir: "up", to: "bedroom", label: "up · bedroom" }
        ] },
      bedroom: { name: "LEVEL 1 · BEDROOM", draw: panoBedroom,
        line: "The master bedroom - and the wardrobe. Everything here opens.",
        exits: [
          { x: 100, y: 190, dir: "down", to: "stairs", label: "staircase" },
          { x: 1150, y: 165, to: "balcony", label: "balcony" }
        ] },
      balcony: { name: "LEVEL 1 · BALCONY", draw: panoBalcony, sky: true,
        line: "From the balcony the Kinta valley rolls out below. The railing runs all the way around.",
        exits: [{ x: 600, y: 186, to: "bedroom", label: "back inside" }],
        hs: [{ x: 84, y: 130, fact: "Inside this tower: the winding staircase - and one of the castle's hidden escape routes." }] }
    };
    var ACT_FACTS = {
      fire: "The hearth crackles - in the game its light flickers over the hall at night.",
      bench: "Hand-built benches - grab-and-move physics in the real game.",
      books: "The study's shelves - Level 2 hides message fragments between these books.",
      slate: "The chalk slate - 'my studies demand order' - a Level 2 clue lives here.",
      teapot: "The kettle still works. Steam, sound and all - little touches sell VR.",
      basin: "The washing basin - water you can splash in the real build.",
      machine: "The washing machine - the drum really spins. Physics toys everywhere.",
      clothes: "Laundry on the line - cloth that sways as you walk past.",
      rack: "The drying rack - one of the many grabbable props.",
      wardrobe: "The wardrobe swings open - in the game, things hide in places like this.",
      bed: "The master bed - rest here and the castle keeps creaking around you."
    };
    var sfx = keSfx();
    var stage = el("div", "demo-stage");
    var frame = el("div", "ke-frame kv-frame");
    var track = el("div", "kv-track");
    frame.appendChild(track);
    var near = el("div", "kv-near");
    frame.appendChild(near);
    var ui = el("div", "kv-ui");
    var outBtn = el("button", "ke-woodbtn kv-btn", "OUTDOOR");
    var balBtn = el("button", "ke-woodbtn kv-btn", "BALCONY");
    var locBoard = el("span", "ke-woodbtn kv-btn kv-loc", "");
    outBtn.addEventListener("click", function (ev) { ev.stopPropagation(); goTo("outdoor"); });
    balBtn.addEventListener("click", function (ev) { ev.stopPropagation(); goTo("balcony"); });
    ui.appendChild(outBtn); ui.appendChild(balBtn); ui.appendChild(locBoard);
    frame.appendChild(ui);
    var compass = el("div", "kv-compass");
    var cstrip = el("div", "kv-cstrip");
    compass.appendChild(cstrip);
    frame.appendChild(compass);
    var pop = el("div", "kv-pop");
    frame.appendChild(pop);
    var hint = el("div", "kv-hint", "drag to look · golden arrows travel · click the furniture");
    frame.appendChild(hint);
    stage.appendChild(frame);
    container.appendChild(stage);
    var log = el("div", "demo-log");
    container.appendChild(log);

    var reducedV = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var offset = 0, sceneW = 840, dragging = false, lastX = 0, vel = 0, moved = 0;
    var visible = true, current = "", downTarget = null;

    var DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    (function buildCompass() {
      var h = "";
      for (var i = 0; i < 17; i++) h += '<span style="left:' + (i * 54) + 'px">' + DIRS[i % 8] + "</span>";
      cstrip.innerHTML = h;
    })();

    function sceneWidth() { return frame.clientHeight * 4 || 840; }
    function apply() {
      sceneW = sceneWidth();
      offset = ((offset % sceneW) + sceneW) % sceneW;
      track.style.transform = "translateX(" + (-offset) + "px)";
      near.style.transform = "translateX(" + (-((offset * 1.35) % sceneW)) + "px)";
      var deg = offset / sceneW * 360;
      var cw = compass.clientWidth || 160;
      cstrip.style.transform = "translateX(" + (-((deg * 1.2) % (8 * 54)) + cw / 2) + "px)";
    }
    function exitMarkup(room) {
      var m = "";
      (room.exits || []).forEach(function (e) {
        var rot = e.dir === "up" ? -90 : e.dir === "down" ? 90 : 0;
        m += '<g class="kv-exit" data-to="' + e.to + '" transform="translate(' + e.x + "," + e.y + ')">' +
          '<circle r="15" fill="rgba(255,217,138,.14)"/>' +
          '<g transform="rotate(' + rot + ')"><path class="kv-exit-glow" d="M-5 -9 L9 0 L-5 9 Z" fill="#ffd98a" stroke="#8a6200" stroke-width="1.2"/></g>' +
          '<rect x="-44" y="16" width="88" height="17" rx="4" fill="#5f4325" stroke="#3e2c16" stroke-width="1.5"/>' +
          '<text x="0" y="28" text-anchor="middle" font-size="9.5" font-family="Georgia, serif" fill="#f2cf6e">' + e.label + "</text></g>";
      });
      return m;
    }
    function hsMarkup(room) {
      var m = "";
      (room.hs || []).forEach(function (h, i) {
        m += '<g class="kv-hs" data-hs="' + i + '" transform="translate(' + h.x + "," + h.y + ')">' +
          '<circle class="kv-ring" r="7" fill="none" stroke="#ffd98a" stroke-width="2"/>' +
          '<circle r="7" fill="rgba(255,217,138,.2)" stroke="#ffd98a" stroke-width="1.6"/>' +
          '<circle r="2.4" fill="#ffd98a"/></g>';
      });
      return m;
    }
    function kvMist() {
      return '<svg viewBox="0 0 1200 300" height="100%" preserveAspectRatio="xMinYMin meet" style="display:block">' +
        '<g fill="#ffffff" opacity=".1">' +
        '<ellipse cx="180" cy="286" rx="150" ry="16"/><ellipse cx="560" cy="292" rx="190" ry="14"/>' +
        '<ellipse cx="920" cy="288" rx="160" ry="15"/><ellipse cx="1150" cy="294" rx="120" ry="12"/></g></svg>';
    }
    function goTo(id, first) {
      if (current === id) return;
      current = id;
      var room = ROOMS[id];
      locBoard.textContent = room.name;
      outBtn.classList.toggle("on", id === "outdoor");
      balBtn.classList.toggle("on", id === "balcony");
      pop.innerHTML = "";
      if (!first) sfx.steps();
      function swap() {
        var one = room.draw().replace("</svg>", exitMarkup(room) + hsMarkup(room) + "</svg>");
        track.innerHTML = one + one;
        near.innerHTML = room.sky ? kvMist() + kvMist() : "";
        offset = 0; vel = 0;
        apply();
        track.style.transition = first ? "none" : "opacity .35s";
        track.style.opacity = 1;
        logLine(log, room.line, "info");
      }
      if (first || reducedV) { swap(); return; }
      track.style.opacity = 0;
      setTimeout(swap, 170);
    }
    function showFact(text) {
      sfx.page();
      pop.innerHTML = "";
      var p = el("div", "ke-parch kv-parch");
      p.innerHTML = "<p>" + text + "</p>";
      var x = el("button", "ke-x", "✕");
      x.addEventListener("click", function () { pop.innerHTML = ""; });
      p.appendChild(x);
      pop.appendChild(p);
    }

    frame.addEventListener("pointerdown", function (ev) {
      // presses on the HUD or a popover belong to those elements - starting
      // a drag here would capture the pointer and steal their click; also
      // drop the previous downTarget or their bubbled click re-triggers it
      if (ev.target.closest && ev.target.closest(".kv-ui, .kv-pop")) { downTarget = null; return; }
      dragging = true; lastX = ev.clientX; vel = 0; moved = 0;
      downTarget = ev.target;
      frame.style.cursor = "grabbing";
      try { frame.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    frame.addEventListener("pointermove", function (ev) {
      if (!dragging) return;
      var dx = ev.clientX - lastX;
      offset -= dx; vel = -dx; moved += Math.abs(dx);
      lastX = ev.clientX;
      apply();
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      frame.style.cursor = "grab";
      if (!reducedV && Math.abs(vel) > 1.5) glide();
    }
    function glide() {
      if (dragging || Math.abs(vel) < 0.08) return;
      offset += vel; vel *= 0.94;
      apply();
      requestAnimationFrame(glide);
    }
    frame.addEventListener("pointerup", endDrag);
    frame.addEventListener("pointercancel", endDrag);
    // pointer capture retargets clicks to the frame - resolve what the
    // pointer actually went DOWN on
    frame.addEventListener("click", function (ev) {
      if (moved > 8) return;
      function find(sel) {
        return (ev.target.closest && ev.target.closest(sel)) ||
               (downTarget && downTarget.closest && downTarget.closest(sel));
      }
      var ex = find(".kv-exit");
      if (ex) { goTo(ex.getAttribute("data-to")); return; }
      var act = find(".kv-act");
      if (act) {
        var kind = act.getAttribute("data-act");
        act.classList.toggle("on");
        sfx[kind === "wardrobe" || kind === "machine" ? "drawer" : "page"]();
        if (ACT_FACTS[kind]) logLine(log, ACT_FACTS[kind], "ok");
        return;
      }
      var hs = find(".kv-hs");
      if (hs) showFact((ROOMS[current].hs || [])[parseInt(hs.getAttribute("data-hs"), 10)].fact);
    });
    window.addEventListener("resize", apply);

    if (!reducedV) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(frame);
      (function drift() {
        if (!frame.isConnected) return;
        if (visible && !dragging && Math.abs(vel) < 0.5) { offset += 0.22; apply(); }
        requestAnimationFrame(drift);
      })();
    }

    logLine(log, "The real game's VR-360 mode: walk the whole castle freely. Golden arrows lead the way.", "");
    goTo("outdoor", true);
  }

  /* file-folder switcher: the exhibit is a stack of tagged paper documents;
     the tabs read as folder tags fused to the front document - visually a
     different species from the wax-seal action buttons INSIDE each demo,
     so the switch level of the hierarchy can't be confused with controls */
  function folderTabs(container, defs) {
    var wrap = el("div", "folder-wrap");
    var tabs = el("div", "folder-tabs");
    tabs.setAttribute("role", "tablist");
    var panel = el("div", "folder-panel");
    var inner = el("div");
    panel.appendChild(inner);
    var cur = -1;
    var btns = defs.map(function (d, i) {
      var b = el("button", "folder-tab", d[0]);
      b.setAttribute("role", "tab");
      b.addEventListener("click", function () { pick(i); });
      tabs.appendChild(b);
      return b;
    });
    wrap.appendChild(tabs);
    wrap.appendChild(panel);
    container.appendChild(wrap);
    function pick(i) {
      if (i === cur) return;
      cur = i;
      btns.forEach(function (b, bi) {
        b.classList.toggle("on", bi === i);
        b.setAttribute("aria-selected", bi === i ? "true" : "false");
      });
      var playing = inner.querySelector("video");
      if (playing) playing.pause();
      inner.innerHTML = "";
      REGISTRY[defs[i][1]](inner);
      // the chosen document slides up out of the folder stack
      panel.classList.remove("flip");
      void panel.offsetWidth;
      panel.classList.add("flip");
    }
    pick(0);
  }

  /* dot-tab shell: persistent tagged panels + app-style red notification
     dots; used by the multi-card walkthrough demos (DO rename, BNM sync).
     Unlike folderTabs, panels keep their state across switches. */
  function dotTabs(container, labels, onOpen) {
    var tabs = el("div", "folder-tabs");
    tabs.setAttribute("role", "tablist");
    var panelBox = el("div", "folder-panel");
    var panels = [], btns = [], cur = -1;
    var api;
    labels.forEach(function (lb, i) {
      var b = el("button", "folder-tab", lb);
      b.setAttribute("role", "tab");
      b.addEventListener("click", function () { api.open(i); });
      tabs.appendChild(b);
      btns.push(b);
      var p = el("div");
      p.style.display = "none";
      panelBox.appendChild(p);
      panels.push(p);
    });
    // same wrapper folderTabs uses: .demo is a flex column with a gap, and a
    // gap between the tags and the body would break the one-piece-of-card look
    var wrap = el("div", "folder-wrap");
    wrap.appendChild(tabs);
    wrap.appendChild(panelBox);
    container.appendChild(wrap);
    api = {
      panels: panels,
      badge: function (i) {
        if (!btns[i].querySelector(".tab-dot")) btns[i].appendChild(el("span", "tab-dot"));
      },
      open: function (i) {
        if (i === cur) return;
        cur = i;
        btns.forEach(function (b, bi) {
          b.classList.toggle("on", bi === i);
          b.setAttribute("aria-selected", bi === i ? "true" : "false");
        });
        panels.forEach(function (p, pi) { p.style.display = pi === i ? "" : "none"; });
        var dot = btns[i].querySelector(".tab-dot");
        if (dot) dot.remove();
        panelBox.classList.remove("flip");
        void panelBox.offsetWidth;
        panelBox.classList.add("flip");
        if (onOpen) onOpen(i);
      }
    };
    return api;
  }

  function demoKellieFyp(container) {
    folderTabs(container, [["Escape room", "kellie-escape"], ["VR-360", "kellie-vr360"]]);
  }

  /* ============================================================
     10. ACADEMIC - Student Routine Organizer: my habit tracker
     module (streaks, weekly progress, timer habits)
     ============================================================ */
  function demoRoutineHabits(container) {
    var habits = [
      { name: "Morning run", cat: "Exercise", streak: 4, week: [1, 1, 0, 1, 1, 0, 0], today: false },
      { name: "Read 20 pages", cat: "Study", streak: 11, week: [1, 1, 1, 1, 1, 1, 0], today: false },
      { name: "Pomodoro x4", cat: "Timer habit", streak: 2, week: [0, 1, 0, 0, 1, 1, 0], today: false }
    ];
    var stage = el("div", "demo-stage");
    var list = el("div", "rbac-tiles");
    list.style.gridTemplateColumns = "1fr";
    stage.appendChild(list);
    container.appendChild(stage);
    var log = el("div", "demo-log");
    container.appendChild(log);

    function render() {
      list.innerHTML = "";
      habits.forEach(function (h) {
        var t = el("div", "rbac-tile granted");
        t.style.textAlign = "left";
        var top = el("div");
        top.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:.5rem;flex-wrap:wrap";
        var name = el("span", null, h.name + " ");
        name.appendChild(el("span", "tag", h.cat));
        top.appendChild(name);
        top.appendChild(el("span", null, "\u{1F525} " + h.streak + "-day streak"));
        t.appendChild(top);
        var week = el("div");
        week.style.cssText = "display:flex;gap:3px;align-items:center;margin:.45rem 0";
        var done = 0;
        h.week.forEach(function (w) {
          var c = el("span");
          c.style.cssText = "width:16px;height:8px;border-radius:3px;background:" + (w ? "var(--good)" : "var(--line)");
          week.appendChild(c);
          if (w) done++;
        });
        var pct = el("span", null, " " + Math.round(done / 7 * 100) + "% this week");
        pct.style.cssText = "font-size:.7rem;color:var(--ink-2)";
        week.appendChild(pct);
        t.appendChild(week);
        var b = el("button", "demo-run", h.today ? "Unmark today" : "Mark today");
        b.addEventListener("click", function () {
          h.today = !h.today;
          h.streak += h.today ? 1 : -1;
          h.week[6] = h.today ? 1 : 0;
          logLine(log, h.today
            ? "'" + h.name + "' logged for today - streak " + h.streak + " days" +
              (h.cat === "Timer habit" ? " (timer habits log themselves when the timer stops)" : "")
            : "'" + h.name + "' unmarked - streak back to " + h.streak,
            h.today ? "ok" : "warn");
          render();
        });
        t.appendChild(b);
        list.appendChild(t);
      });
    }
    render();
    logLine(log, "my module of the 4-person PHP/MySQL app: habits, streaks, weekly progress, timer habits", "info");
  }

  /* ============================================================
     11. ACADEMIC - MindHarmony: mood check-in + AI companion
     ============================================================ */
  function demoMindHarmony(container) {
    var tb = toolbar();
    var who = select("companion:", [
      ["luna", "Luna - gentle listener"],
      ["max", "Max - upbeat coach"],
      ["sage", "Sage - calm mentor"]
    ]);
    var breathe = runBtn("Guided breathing");
    tb.appendChild(who.wrap); tb.appendChild(breathe);
    container.appendChild(tb);

    var moodRow = el("div", "demo-toolbar");
    moodRow.appendChild(el("label", null, "today's mood:"));
    var moods = [
      ["\u{1F614}", "low"], ["\u{1F610}", "meh"], ["\u{1F642}", "okay"], ["\u{1F60A}", "good"], ["\u{1F604}", "great"]
    ];
    var strip = el("span", null, "");
    strip.style.cssText = "font-size:.7rem;color:var(--ink-2);font-family:var(--mono)";
    container.appendChild(moodRow);
    var log = el("div", "demo-log");
    container.appendChild(log);

    var replies = {
      low:  { luna: "I'm here with you. Rough days are allowed - want to write it down in the journal?",
              max:  "Tough day, huh? We log it, we own it, and tomorrow we go again.",
              sage: "Notice the feeling without judging it. It passes - it always does." },
      meh:  { luna: "A flat day still counts. Something small and kind for yourself tonight?",
              max:  "Neutral is a launchpad! One tiny win before bed - pick one.",
              sage: "Even still water is doing something. Rest is progress too." },
      okay: { luna: "Steady is good. Your calendar shows three okay-or-better days in a row.",
              max:  "Okay today, great tomorrow - momentum is building!",
              sage: "Balance is not exciting, and that is exactly its value." },
      good: { luna: "Love that for you. What made today good? The journal remembers.",
              max:  "YES. Bottle this feeling - we are using it tomorrow!",
              sage: "Savour it slowly. Gratitude doubles a good day." },
      great:{ luna: "A great day! Noted in your tracker - your week is glowing.",
              max:  "Champion energy! Streak it - same again tomorrow?",
              sage: "Joy shared is joy kept. Tell someone about today." }
    };
    var names = { luna: "Luna", max: "Max", sage: "Sage" };
    var history = [];

    moods.forEach(function (m) {
      var b = el("button", "demo-run", m[0]);
      b.title = m[1];
      b.addEventListener("click", function () {
        var c = who.select.value;
        history.push(m[0]);
        if (history.length > 7) history.shift();
        strip.textContent = " week: " + history.join(" ");
        logLine(log, "you: feeling " + m[1] + " " + m[0], "info");
        logLine(log, names[c] + ": " + replies[m[1]][c], "ok");
        logLine(log, "mood saved to the well-being tracker (SQLite) - calendar view updated", "info");
      });
      moodRow.appendChild(b);
    });
    moodRow.appendChild(strip);

    breathe.addEventListener("click", async function () {
      breathe.disabled = true;
      logLine(log, "guided mindfulness: 4-4-4 breathing, 2 rounds", "info");
      for (var r = 0; r < 2; r++) {
        logLine(log, "breathe in . . . 2 . . . 3 . . . 4", "ok"); await sleep(900);
        logLine(log, "hold - - - 2 - - - 3 - - - 4", "warn"); await sleep(900);
        logLine(log, "breathe out . . . 2 . . . 3 . . . 4", "ok"); await sleep(900);
      }
      logLine(log, "session logged. The app also has meditation, focus and study modes with timers.", "info");
      breathe.disabled = false;
    });
    logLine(log, "pick a mood - your companion answers in their own voice", "info");
  }

  /* ============================================================
     12. ACADEMIC - Eco-Assistant: AI waste sorting
     ============================================================ */
  function demoEcoSort(container) {
    var tb = toolbar();
    var item = select("photo of:", [
      ["pet", "plastic bottle (PET)"],
      ["can", "aluminium drink can"],
      ["banana", "banana peel"],
      ["phone", "old smartphone"],
      ["foam", "polystyrene food box"]
    ]);
    var run = runBtn("Analyse with AI");
    tb.appendChild(item.wrap); tb.appendChild(run);
    container.appendChild(tb);
    var verdict = el("div", "verdict");
    container.appendChild(verdict);
    var log = el("div", "demo-log");
    container.appendChild(log);

    var data = {
      pet:    { cls: "PET plastic (code 1)", how: "rinse, squash, cap off - plastics bin", price: "RM 0.60 - 1.20 / kg", v: "good", msg: "RECYCLABLE" },
      can:    { cls: "aluminium", how: "rinse and crush - metals bin", price: "RM 4.50 - 6.00 / kg (best value in the bag!)", v: "good", msg: "RECYCLABLE - HIGH VALUE" },
      banana: { cls: "organic waste", how: "compost it - it does not belong in the recycling bin", price: "no market value, great fertiliser", v: "warn", msg: "COMPOST, DON'T RECYCLE" },
      phone:  { cls: "e-waste", how: "never the normal bin - take it to an e-waste collection point", price: "recovery value varies by model", v: "warn", msg: "E-WASTE - SPECIAL HANDLING" },
      foam:   { cls: "polystyrene (EPS)", how: "most Malaysian centres reject EPS - reduce and reuse instead", price: "no market value", v: "bad", msg: "NOT RECYCLABLE HERE" }
    };

    run.addEventListener("click", async function () {
      run.disabled = true;
      log.innerHTML = ""; verdict.className = "verdict";
      var d = data[item.select.value];
      logLine(log, "uploading photo...", "info"); await sleep(350);
      logLine(log, "vision model (Gemini) classifying the material...", "info"); await sleep(500);
      logLine(log, "detected: " + d.cls, "ok"); await sleep(300);
      logLine(log, "how to handle: " + d.how, "ok"); await sleep(300);
      logLine(log, "market price: " + d.price, "info");
      logLine(log, "(the sidebar can also look up recycling centres near your postcode)", "info");
      verdict.textContent = d.msg + " - " + d.how;
      verdict.className = "verdict show " + d.v;
      run.disabled = false;
    });
  }

  /* ============================================================
     13. ACADEMIC - AR Fire Extinguisher: marker-based AR
     ============================================================ */
  function svgArView() {
    var mk = '';
    [[0, 0], [2, 0], [0, 2], [1, 1], [2, 2]].forEach(function (p) {
      mk += '<rect x="' + (214 + p[0] * 18) + '" y="' + (222 + p[1] * 12) + '" width="14" height="9" fill="#111"/>';
    });
    // a sunlit valley classroom seen through the AR camera
    return '<svg viewBox="0 0 480 270" width="100%" role="img" aria-label="AR camera view" style="border-radius:8px;display:block">' +
      '<rect width="480" height="270" fill="#e9dfc4"/>' +
      '<rect x="0" y="206" width="480" height="64" fill="#b1c194"/>' +
      '<line x1="0" y1="206" x2="480" y2="206" stroke="#8fa06f" stroke-width="2"/>' +
      '<rect x="330" y="30" width="96" height="70" rx="6" fill="#a9d0e8" stroke="#5d4a33" stroke-width="2.5"/>' +
      '<path d="M330 88 q 20 -16 38 -6 q 22 -18 40 -4 q 12 -8 18 -2 L426 100 L330 100 Z" fill="#7fae6b" opacity=".9"/>' +
      '<circle cx="352" cy="48" r="9" fill="#fff" opacity=".85"/><ellipse cx="366" cy="52" rx="12" ry="7" fill="#fff" opacity=".7"/>' +
      '<path d="M378 30 v70 M330 64 h96" stroke="#5d4a33" stroke-width="2"/>' +
      '<g id="arx-marker" style="cursor:pointer"><rect x="206" y="216" width="70" height="44" rx="3" fill="#fdf6e0" stroke="#5d4a33" stroke-width="1.5"/>' + mk + '</g>' +
      '<g id="arx-ext" opacity="0" style="transition:opacity .6s ease, transform .4s ease;transform-origin:240px 150px">' +
      '<path id="arx-hose" d="M226 128 q-26 8 -22 44 q1 10 10 12" fill="none" stroke="#4a3d28" stroke-width="6" stroke-linecap="round"/>' +
      '<rect id="arx-tank" x="224" y="108" width="34" height="86" rx="10" fill="#d95f52" stroke="#8f3b2c" stroke-width="2.5"/>' +
      '<rect x="234" y="128" width="14" height="30" rx="2" fill="#fdf6e0" opacity=".92"/>' +
      '<text x="241" y="149" text-anchor="middle" font-size="9" font-weight="bold" fill="#c23c3c">CO2</text>' +
      '<rect id="arx-handle" x="228" y="92" width="30" height="8" rx="3" fill="#5d4a33"/>' +
      '<rect x="232" y="100" width="18" height="8" rx="2" fill="#6f6353"/>' +
      '<circle id="arx-pin" cx="262" cy="98" r="6" fill="none" stroke="#e8b23a" stroke-width="3"/>' +
      '<g id="arx-spray" opacity="0" style="transition:opacity .3s">' +
      '<path d="M212 182 q-30 -6 -58 8" stroke="#cfe3ea" stroke-width="10" fill="none" stroke-linecap="round" opacity=".8"/>' +
      '<circle cx="160" cy="186" r="7" fill="#eaf5fb" opacity=".85"/><circle cx="140" cy="192" r="9" fill="#cfe3ea" opacity=".65"/><circle cx="120" cy="196" r="11" fill="#a9d0e8" opacity=".45"/>' +
      '</g>' +
      '<circle id="arx-ring" r="14" fill="none" stroke="var(--accent, #F5B301)" stroke-width="3" opacity="0"/>' +
      '</g>' +
      '<text id="arx-label" x="14" y="24" font-size="12" font-family="monospace" fill="#4a3f2e"></text>' +
      '<text id="arx-sublabel" x="14" y="40" font-size="10" font-family="monospace" fill="#8a7a5e"></text>' +
      '<g stroke="#5d4a33" stroke-width="2.5" fill="none" opacity=".8">' +
      '<path d="M8 26 V8 H26"/><path d="M454 8 h18 v18"/><path d="M8 244 v18 h18"/><path d="M472 244 v18 h-18"/>' +
      '</g></svg>';
  }

  function demoArExtinguisher(container) {
    var tb = toolbar();
    var scan = runBtn("Scan marker");
    var rotL = runBtn("⟲ rotate");
    var rotR = runBtn("⟳ rotate");
    var parts = runBtn("Parts");
    var spray = runBtn("Spray");
    var info = runBtn("Info");
    [scan, rotL, rotR, parts, spray, info].forEach(function (b) { tb.appendChild(b); });
    container.appendChild(tb);
    var stage = el("div", "demo-stage");
    stage.innerHTML = svgArView();
    container.appendChild(stage);
    var verdict = el("div", "verdict");
    container.appendChild(verdict);
    var log = el("div", "demo-log");
    container.appendChild(log);

    var $ = function (id) { return stage.querySelector("#" + id); };
    var spawned = false, angle = 0, partIdx = -1, spraying = false;
    var partDefs = [
      ["arx-pin", 262, 98, "Pin lock", "pull the pin to arm the extinguisher"],
      ["arx-handle", 243, 96, "Handle", "squeeze to discharge"],
      ["arx-hose", 208, 160, "Hose / horn", "aim at the BASE of the fire, sweep side to side"]
    ];

    function doScan() {
      if (spawned) return;
      spawned = true;
      $("arx-ext").setAttribute("opacity", "1");
      $("arx-label").textContent = "marker detected - CO2 extinguisher spawned";
      logLine(log, "AR Foundation: image marker recognised", "ok");
      logLine(log, "extinguisher anchored to the marker at realistic scale (30-50 cm)", "ok");
      logLine(log, "(in the app a spatial-audio voice starts explaining - volume follows your distance)", "info");
    }
    scan.addEventListener("click", doScan);
    $("arx-marker").addEventListener("click", doScan);

    function needSpawn() {
      if (!spawned) { logLine(log, "scan the marker first - point the camera at the card", "warn"); return true; }
      return false;
    }
    function rotate(d) {
      if (needSpawn()) return;
      angle += d;
      $("arx-ext").style.transform = "rotate(" + angle + "deg)";
      logLine(log, "rotated to " + angle + "° - inspect it from every side", "info");
    }
    rotL.addEventListener("click", function () { rotate(-20); });
    rotR.addEventListener("click", function () { rotate(20); });

    parts.addEventListener("click", function () {
      if (needSpawn()) return;
      partIdx = (partIdx + 1) % partDefs.length;
      var p = partDefs[partIdx];
      var ring = $("arx-ring");
      ring.setAttribute("cx", p[1]); ring.setAttribute("cy", p[2]); ring.setAttribute("opacity", "1");
      $("arx-label").textContent = p[3];
      $("arx-sublabel").textContent = p[4];
      logLine(log, p[3] + ": " + p[4], "ok");
    });

    spray.addEventListener("click", function () {
      if (needSpawn()) return;
      spraying = !spraying;
      $("arx-spray").setAttribute("opacity", spraying ? "1" : "0");
      logLine(log, spraying ? "spray effect playing (with hissing audio in the app)" : "spray stopped", spraying ? "ok" : "info");
    });

    info.addEventListener("click", function () {
      if (needSpawn()) return;
      var on = verdict.classList.contains("show");
      verdict.textContent = "CO2 extinguisher - use on: electrical fires ✓, flammable liquids ✓. NEVER on: cooking oil ✗, metal fires ✗. CO2 displaces oxygen - ventilate small rooms.";
      verdict.className = on ? "verdict" : "verdict show warn";
      if (!on) logLine(log, "world-space info panel: fire-class suitability + safety notes", "info");
    });
    logLine(log, "point the camera at the marker (click it) to begin", "info");
  }

  /* ============================================================
     13b. ACADEMIC - AR Fire Extinguisher: real-app demo video +
     tab wrapper (mini game / video), same pattern as kellie-fyp
     ============================================================ */
  function demoArVideo(container) {
    var frame = el("div", "exhibit-frame portrait");
    var v = document.createElement("video");
    v.src = "assets/ar/ar-fire-demo.mp4";
    v.poster = "assets/ar/ar-fire-demo-poster.jpg";
    v.controls = true;
    v.preload = "metadata";
    v.playsInline = true;
    frame.appendChild(v);
    container.appendChild(frame);
  }

  function demoArFireTabs(container) {
    folderTabs(container, [["Mini game", "ar-extinguisher"], ["Video", "ar-video"]]);
  }

  /* ============================================================
     14. ACADEMIC - VR Fire Extinguisher Training: hold to spray,
     fires have health and regrow if you stop too early
     ============================================================ */
  function svgFactory() {
    // a bright valley workshop - the fire is the only thing that should feel wrong
    return '<svg viewBox="0 0 480 270" width="100%" role="img" aria-label="workshop fire scene" style="border-radius:8px;display:block">' +
      '<rect width="480" height="270" fill="#e9dfc4"/>' +
      '<rect y="200" width="480" height="70" fill="#c9bb98"/>' +
      '<g stroke="#b3a480" stroke-width="1.5"><line x1="0" y1="222" x2="480" y2="222"/><line x1="0" y1="246" x2="480" y2="246"/></g>' +
      '<rect x="26" y="34" width="72" height="56" rx="5" fill="#a9d0e8" stroke="#5d4a33" stroke-width="2.5"/>' +
      '<path d="M26 80 q 18 -13 34 -5 q 18 -14 38 -2 L98 90 L26 90 Z" fill="#7fae6b" opacity=".9"/>' +
      '<path d="M62 34 v56 M26 62 h72" stroke="#5d4a33" stroke-width="2"/>' +
      '<rect x="30" y="120" width="70" height="80" rx="3" fill="#4d7f68" stroke="#3a5f4e" stroke-width="2"/>' +
      '<rect x="45" y="140" width="40" height="26" rx="2" fill="#a9d0e8" stroke="#3a5f4e"/>' +
      '<rect x="110" y="150" width="46" height="50" rx="3" fill="#c9a06a" stroke="#8a6242" stroke-width="2"/>' +
      '<rect x="118" y="158" width="30" height="8" rx="2" fill="#a8815a"/>' +
      '<g id="fx-panel"><rect x="360" y="96" width="70" height="104" rx="5" fill="#5a7a9e" stroke="#3e5674" stroke-width="2.5"/>' +
      '<circle cx="378" cy="116" r="5" fill="#e8b23a"/><circle cx="396" cy="116" r="5" fill="#9aa0a8"/><circle cx="414" cy="116" r="5" fill="#c23c3c"/>' +
      '<rect x="372" y="132" width="46" height="30" rx="3" fill="#1d2940"/><path d="M380 140 l10 8 l-6 2 l10 8" stroke="#ffd57e" stroke-width="2" fill="none"/></g>' +
      '<g id="fx-fire">' +
      '<ellipse id="fx-f1" cx="395" cy="188" rx="26" ry="30" fill="#e8641f" opacity=".9"/>' +
      '<ellipse id="fx-f2" cx="395" cy="192" rx="16" ry="20" fill="#F5B301"/>' +
      '<ellipse id="fx-f3" cx="395" cy="196" rx="8" ry="10" fill="#fff2c4"/>' +
      '<ellipse id="fx-smoke" cx="395" cy="120" rx="18" ry="12" fill="#9aa3ae" opacity="0"/>' +
      '</g>' +
      '<g id="fx-sprayer">' +
      '<rect x="120" y="196" width="26" height="58" rx="8" fill="#d95f52" stroke="#8f3b2c" stroke-width="2.5"/>' +
      '<rect x="123" y="186" width="20" height="7" rx="3" fill="#5d4a33"/>' +
      '<path d="M146 206 q26 -6 60 -2" fill="none" stroke="#4a3d28" stroke-width="5" stroke-linecap="round"/>' +
      '<g id="fx-spray" opacity="0"><path d="M206 202 q80 -14 160 -10" stroke="#cfe3ea" stroke-width="12" fill="none" stroke-linecap="round" opacity=".75"/>' +
      '<circle cx="300" cy="196" r="8" fill="#eaf5fb" opacity=".8"/><circle cx="340" cy="194" r="10" fill="#cfe3ea" opacity=".6"/><circle cx="375" cy="192" r="12" fill="#a9d0e8" opacity=".45"/></g>' +
      '</g>' +
      '<rect x="330" y="70" width="130" height="10" rx="5" fill="none" stroke="#5d4a33"/>' +
      '<rect id="fx-health" x="332" y="72" width="126" height="6" rx="3" fill="#e8641f"/>' +
      '<text x="330" y="62" font-size="10" font-family="monospace" fill="#4a3f2e">fire intensity</text>' +
      '</svg>';
  }

  function demoVrExtinguisher(container) {
    var tb = toolbar();
    var hold = runBtn("HOLD to spray (grip + trigger)");
    var reset = runBtn("Reset drill");
    tb.appendChild(hold); tb.appendChild(reset);
    container.appendChild(tb);
    var stage = el("div", "demo-stage");
    stage.innerHTML = svgFactory();
    container.appendChild(stage);
    var verdict = el("div", "verdict");
    container.appendChild(verdict);
    var log = el("div", "demo-log");
    container.appendChild(log);

    var $ = function (id) { return stage.querySelector("#" + id); };
    var health = 100, holding = false, out = false, warned = false;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function paint() {
      var f = Math.max(health, 0) / 100;
      $("fx-f1").setAttribute("ry", 30 * f + 2); $("fx-f1").setAttribute("rx", 26 * f + 2);
      $("fx-f2").setAttribute("ry", 20 * f + 1); $("fx-f2").setAttribute("rx", 16 * f + 1);
      $("fx-f3").setAttribute("ry", 10 * f + 1); $("fx-f3").setAttribute("rx", 8 * f + 1);
      $("fx-health").setAttribute("width", 126 * f);
      $("fx-smoke").setAttribute("opacity", out ? "0.8" : "0");
    }
    var timer = setInterval(function () {
      if (!stage.isConnected) { clearInterval(timer); return; }
      if (out) return;
      if (holding) {
        health -= reduced ? 12 : 4;
        if (health <= 0) {
          health = 0; out = true; holding = false;
          $("fx-spray").setAttribute("opacity", "0");
          logLine(log, "fire extinguished - drill complete", "ok");
          verdict.textContent = "FIRE OUT. In VR you would reset the scene and drill again - repetition builds the reflex.";
          verdict.className = "verdict show good";
        }
      } else if (health < 100 && health > 0) {
        health += 0.6;
        if (health > 35 && !warned) { warned = true; logLine(log, "you stopped too early - the fire is regrowing!", "warn"); }
      }
      paint();
    }, 110);

    function start(ev) {
      ev.preventDefault();
      if (out) return;
      holding = true; warned = false;
      $("fx-spray").setAttribute("opacity", "1");
      logLine(log, "squeezing the trigger - CO2 at the BASE of the fire", "info");
    }
    function stop() {
      if (!holding) return;
      holding = false;
      $("fx-spray").setAttribute("opacity", "0");
      if (!out && health > 0) logLine(log, "released at " + Math.round(health) + "% intensity", "warn");
    }
    hold.addEventListener("pointerdown", start);
    hold.addEventListener("pointerup", stop);
    hold.addEventListener("pointerleave", stop);

    reset.addEventListener("click", function () {
      health = 100; out = false; holding = false; warned = false;
      verdict.className = "verdict";
      paint();
      logLine(log, "scene reset - extinguisher back on the wall, fire relit", "info");
    });
    paint();
    logLine(log, "grab-and-spray, straight from the Unity XR build: fires have health, shrink at the base, regrow if you quit early", "info");
  }

  /* ============================================================
     15. ACADEMIC - Math Adventure: four Flutter game modules
     ============================================================ */
  function demoMathAdventure(container) {
    var score = 0, streak = 0, mode = "compare";
    var tabs = el("div", "demo-toolbar");
    var modes = [["compare", "Compare"], ["compose", "Compose"], ["order", "Order"], ["bonds", "Number bonds"]];
    var scoreEl = el("span", "tag", "score 0");
    var btns = modes.map(function (m, i) {
      var b = el("button", "demo-run", m[1]);
      b.addEventListener("click", function () { pick(i); });
      tabs.appendChild(b);
      return b;
    });
    tabs.appendChild(scoreEl);
    container.appendChild(tabs);
    var qText = el("div");
    qText.style.cssText = "font-family:var(--mono);font-size:1rem;margin:.5rem 0 .3rem";
    var ansRow = el("div", "demo-toolbar");
    container.appendChild(qText);
    container.appendChild(ansRow);
    var log = el("div", "demo-log");
    container.appendChild(log);

    function rnd(n) { return Math.floor(Math.random() * n); }
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function ans(label, fn) {
      var b = el("button", "demo-run", String(label));
      b.addEventListener("click", function () { fn(b); });
      ansRow.appendChild(b);
      return b;
    }
    function good(msg) {
      score++; streak++;
      scoreEl.textContent = "score " + score;
      logLine(log, msg + (streak >= 3 ? " - streak x" + streak + "!" : ""), "ok");
      next();
    }
    function bad(msg) { streak = 0; logLine(log, msg, "bad"); }

    function next() {
      ansRow.innerHTML = "";
      if (mode === "compare") {
        var a = rnd(90) + 10, b = rnd(90) + 10;
        while (b === a) b = rnd(90) + 10;
        qText.textContent = "Tap the GREATER number:";
        shuffle([a, b]).forEach(function (n) {
          ans(n, function () {
            n === Math.max(a, b) ? good(n + " is greater - correct!") : bad(n + " is the smaller one - look again");
          });
        });
      } else if (mode === "compose") {
        var x = rnd(8) + 1, sum = x + rnd(9) + 1, miss = sum - x;
        qText.textContent = x + " + ? = " + sum;
        shuffle([miss, miss + 1, miss > 2 ? miss - 2 : miss + 2]).forEach(function (n) {
          ans(n, function () { n === miss ? good(x + " + " + miss + " = " + sum + " - correct!") : bad("not quite - count up from " + x); });
        });
      } else if (mode === "order") {
        var nums = [];
        while (nums.length < 3) { var v = rnd(50) + 1; if (nums.indexOf(v) === -1) nums.push(v); }
        var sorted = nums.slice().sort(function (p, q) { return p - q; });
        var pos = 0;
        qText.textContent = "Tap them in ASCENDING order:";
        shuffle(nums.slice()).forEach(function (n) {
          ans(n, function (b) {
            if (n === sorted[pos]) {
              pos++; b.disabled = true;
              if (pos === 3) good(sorted.join(" < ") + " - ordered!");
            } else {
              pos = 0;
              bad(n + " is not next - start the order again");
              Array.prototype.forEach.call(ansRow.children, function (c) { c.disabled = false; });
            }
          });
        });
      } else {
        var have = rnd(9) + 1;
        qText.textContent = "Number bond: " + have + " + ? = 10";
        var need = 10 - have;
        shuffle([need, need + 1 > 9 ? need - 1 : need + 1, have]).forEach(function (n) {
          ans(n, function () { n === need ? good(have + " and " + need + " bond to 10!") : bad("that makes " + (have + n) + ", not 10"); });
        });
      }
    }
    function pick(i) {
      mode = modes[i][0];
      btns.forEach(function (b, bi) {
        b.classList.toggle("off", bi !== i);   // dims the unselected seals (css)
      });
      next();
    }
    pick(0);
    logLine(log, "the real app: Flutter modules for compare / compose / order / number bonds, one codebase on Android, iOS and web", "info");
  }

  /* ============================================================
     16. ACADEMIC - Stock Management System (JavaFX TableView)
     ============================================================ */
  function demoStockFx(container) {
    var prods = [
      { type: "TV", model: "Samsung 55Q", qty: 8, price: 2599 },
      { type: "Smartphone", model: "Pixel 9", qty: 15, price: 3299 },
      { type: "Refrigerator", model: "LG InstaView", qty: 4, price: 4899 },
      { type: "Blender", model: "Philips 5000", qty: 22, price: 249 },
      { type: "Air Conditioner", model: "Daikin 1.5HP", qty: 6, price: 1799 }
    ];
    var sel = 0, sortKey = null, sortAsc = true;
    var tb = toolbar();
    var stockIn = runBtn("Stock in +5");
    var sell = runBtn("Sell 1");
    var sortQty = runBtn("Sort qty");
    var sortPrice = runBtn("Sort price");
    [stockIn, sell, sortQty, sortPrice].forEach(function (b) { tb.appendChild(b); });
    container.appendChild(tb);
    var stage = el("div", "demo-stage");
    container.appendChild(stage);
    var log = el("div", "demo-log");
    container.appendChild(log);

    function render() {
      var rows = prods.slice();
      if (sortKey) rows.sort(function (a, b) { return sortAsc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]; });
      var html = '<table style="width:100%;border-collapse:collapse;font-family:var(--mono);font-size:.76rem">' +
        '<tr>' + ["Type", "Model", "Qty", "Price (RM)"].map(function (h) {
          return '<th style="text-align:left;padding:.3rem .5rem;border-bottom:1px solid var(--line);color:var(--ink-2)">' + h + "</th>";
        }).join("") + "</tr>";
      rows.forEach(function (p) {
        var i = prods.indexOf(p);
        html += '<tr data-i="' + i + '" style="cursor:pointer;' + (i === sel ? "background:color-mix(in srgb, var(--accent) 14%, transparent)" : "") + '">' +
          "<td style='padding:.3rem .5rem'>" + p.type + "</td><td style='padding:.3rem .5rem'>" + p.model + "</td>" +
          "<td style='padding:.3rem .5rem'>" + p.qty + (p.qty <= 4 ? " ⚠" : "") + "</td><td style='padding:.3rem .5rem'>" + p.price.toLocaleString() + "</td></tr>";
      });
      stage.innerHTML = html + "</table>";
      stage.querySelectorAll("tr[data-i]").forEach(function (r) {
        r.addEventListener("click", function () { sel = +r.getAttribute("data-i"); render(); });
      });
    }
    stockIn.addEventListener("click", function () {
      prods[sel].qty += 5;
      logLine(log, "stocked in 5 x " + prods[sel].model + " - ObservableList updated, TableView refreshed", "ok");
      render();
    });
    sell.addEventListener("click", function () {
      if (prods[sel].qty === 0) { logLine(log, prods[sel].model + " is OUT OF STOCK - sale blocked by validation", "bad"); return; }
      prods[sel].qty--;
      logLine(log, "sold 1 x " + prods[sel].model + " - " + prods[sel].qty + " left" + (prods[sel].qty <= 4 ? " (low-stock warning)" : ""), prods[sel].qty <= 4 ? "warn" : "ok");
      render();
    });
    function sortBy(k) {
      sortAsc = sortKey === k ? !sortAsc : true; sortKey = k;
      logLine(log, "SortedList: ordered by " + k + " " + (sortAsc ? "ascending" : "descending"), "info");
      render();
    }
    sortQty.addEventListener("click", function () { sortBy("qty"); });
    sortPrice.addEventListener("click", function () { sortBy("price"); });
    render();
    logLine(log, "logged in via the JavaFX login pane - click a row to select, then act on it", "info");
    logLine(log, "five appliance classes extend one Product base class - inheritance doing real work", "info");
  }

  /* ============================================================
     17. ACADEMIC - Fruit Stall Inventory (C++ console)
     ============================================================ */
  function demoFruitStall(container) {
    var fruits = [
      { n: "Apple", cost: 1.2, price: 2.0, qty: 40, sold: 0 },
      { n: "Banana", cost: 0.5, price: 1.0, qty: 60, sold: 0 },
      { n: "Mango", cost: 2.5, price: 4.5, qty: 25, sold: 0 }
    ];
    var tb = toolbar();
    var bView = runBtn("1 view stock");
    var bIn = runBtn("2 stock in");
    var bSell = runBtn("3 sell");
    var bRep = runBtn("4 profit report");
    [bView, bIn, bSell, bRep].forEach(function (b) { tb.appendChild(b); });
    container.appendChild(tb);
    var term = el("div", "terminal");
    term.innerHTML = '<div class="terminal-bar"><span></span><span></span><span></span><em>fruit_stall.exe</em></div>';
    var body = el("pre", "terminal-body");
    term.appendChild(body);
    container.appendChild(term);

    function print(s) {
      body.textContent += s + "\n";
      body.scrollTop = body.scrollHeight;
    }
    function pad(s, w) { s = String(s); while (s.length < w) s += " "; return s; }
    print("=== FRUIT STALL INVENTORY MANAGEMENT SYSTEM ===");
    print("loaded fruit_inventory.txt + CostGoods.txt");
    print("choose an option above (just like the C++ menu)");

    bView.addEventListener("click", function () {
      print("");
      print(pad("FRUIT", 10) + pad("QTY", 6) + pad("COST", 8) + "PRICE");
      fruits.forEach(function (f) {
        print(pad(f.n, 10) + pad(f.qty, 6) + pad("RM" + f.cost.toFixed(2), 8) + "RM" + f.price.toFixed(2));
      });
    });
    bIn.addEventListener("click", function () {
      var f = fruits.reduce(function (a, b) { return a.qty <= b.qty ? a : b; });
      f.qty += 10;
      print("> restocked " + f.n + " +10 (cost RM" + (f.cost * 10).toFixed(2) + ") - appended to CostGoods.txt");
    });
    bSell.addEventListener("click", function () {
      var f = fruits[Math.floor(Math.random() * fruits.length)];
      if (f.qty === 0) { print("> " + f.n + " out of stock!"); return; }
      var n = Math.min(f.qty, Math.floor(Math.random() * 4) + 1);
      f.qty -= n; f.sold += n;
      print("> sold " + n + " x " + f.n + " @ RM" + f.price.toFixed(2) + "  (stock left: " + f.qty + ") - saved to fruit_inventory.txt");
    });
    bRep.addEventListener("click", function () {
      var rev = 0, cogs = 0;
      fruits.forEach(function (f) { rev += f.sold * f.price; cogs += f.sold * f.cost; });
      print("");
      print("---- PROFIT REPORT ----");
      print("revenue        : RM" + rev.toFixed(2));
      print("cost of goods  : RM" + cogs.toFixed(2));
      print("profit         : RM" + (rev - cogs).toFixed(2) + (rev - cogs > 0 ? "  :)" : ""));
    });
  }

  /* ============================================================
     18. ACADEMIC - Food Ordering System (Oracle schema walk)
     ============================================================ */
  function demoFoodOrdering(container) {
    var tb = toolbar();
    var cust = select("customer:", [
      ["member", "Member (Gold - 5% off)"],
      ["guest", "Walk-in guest"]
    ]);
    var run = runBtn("Place order");
    tb.appendChild(cust.wrap); tb.appendChild(run);
    container.appendChild(tb);

    var menuRow = el("div", "demo-toolbar");
    menuRow.appendChild(el("label", null, "menu:"));
    var items = [["Nasi Lemak Ayam", 8.5], ["Chicken Burger", 12.0], ["Teh Ais", 3.2]];
    var picked = [true, false, true];
    items.forEach(function (it, i) {
      var b = el("button", "pipe-stage" + (picked[i] ? " done" : ""), it[0] + " RM" + it[1].toFixed(2));
      b.style.cursor = "pointer";
      b.addEventListener("click", function () {
        picked[i] = !picked[i];
        b.className = "pipe-stage" + (picked[i] ? " done" : "");
      });
      menuRow.appendChild(b);
    });
    container.appendChild(menuRow);

    var pipe = el("div", "pipe");
    var tables = ["PERSON", "CUSTOMER", "MEMBER / GUEST", "ORDER_S", "ORDER_ITEM", "PAYMENT"];
    var stageEls = tables.map(function (t, i) {
      var s = el("span", "pipe-stage", t);
      pipe.appendChild(s);
      if (i < tables.length - 1) pipe.appendChild(el("span", "pipe-arrow", ">"));
      return s;
    });
    container.appendChild(pipe);
    var log = el("div", "demo-log");
    container.appendChild(log);

    run.addEventListener("click", async function () {
      run.disabled = true;
      log.innerHTML = "";
      stageEls.forEach(function (s) { s.className = "pipe-stage"; });
      var chosen = items.filter(function (_, i) { return picked[i]; });
      if (!chosen.length) { logLine(log, "pick at least one dish from the menu", "warn"); run.disabled = false; return; }
      var m = cust.select.value === "member";
      async function step(i, lines) {
        stageEls[i].classList.add("active");
        for (var li = 0; li < lines.length; li++) { logLine(log, lines[li][0], lines[li][1]); await sleep(320); }
        stageEls[i].classList.remove("active"); stageEls[i].classList.add("done");
      }
      await step(0, [["supertype: INSERT INTO PERSON (person_id, name, phone) VALUES (2041, ...)", "info"]]);
      await step(1, [["subtype:   INSERT INTO CUSTOMER (person_id) VALUES (2041)", "info"]]);
      await step(2, [[m ? "subtype:   INSERT INTO MEMBER (person_id, level_id) -> Gold" : "subtype:   INSERT INTO GUEST (person_id)", "ok"]]);
      var oid = 7000 + Math.floor(Math.random() * 999);
      await step(3, [["INSERT INTO ORDER_S (order_id, person_id, order_date) VALUES (" + oid + ", 2041, SYSDATE)", "info"]]);
      var total = 0, lines = [];
      chosen.forEach(function (c, i2) {
        total += c[1];
        lines.push(["INSERT INTO ORDER_ITEM (" + oid + ", " + (i2 + 1) + ", '" + c[0] + "', RM" + c[1].toFixed(2) + ")", "info"]);
      });
      await step(4, lines);
      var pay = m ? total * 0.95 : total;
      await step(5, [[
        "INSERT INTO PAYMENT (" + oid + ") - RM" + total.toFixed(2) + (m ? " - 5% Gold = RM" + pay.toFixed(2) : ""), "ok"]]);
      logLine(log, "COMMIT - one order touched 6 of the 17 tables; constraints checked every row", "ok");
      run.disabled = false;
    });
    logLine(log, "toggle dishes, pick a customer type, place the order - watch the supertype/subtype schema light up", "info");
  }

  /* ============================================================
     19. ACADEMIC - Library Student Management (loans + overdue)
     ============================================================ */
  function demoLibraryLoans(container) {
    var day = 0, loans = [];
    var tb = toolbar();
    var stu = select("student:", [["Alice Tan (S001)", "Alice Tan (S001)"], ["Ben Lim (S002)", "Ben Lim (S002)"]]);
    var book = select("book:", [
      ["Clean Code", "Clean Code"],
      ["The C++ Programming Language", "The C++ Programming Language"],
      ["Structures & Algorithms", "Structures & Algorithms"]
    ]);
    var borrow = runBtn("Borrow (14 days)");
    var advance = runBtn("+7 days");
    var dayTag = el("span", "tag", "Day 0");
    [stu.wrap, book.wrap].forEach(function (w) { tb.appendChild(w); });
    tb.appendChild(borrow); tb.appendChild(advance); tb.appendChild(dayTag);
    container.appendChild(tb);
    var stage = el("div", "demo-stage");
    var list = el("div", "rbac-tiles");
    list.style.gridTemplateColumns = "1fr";
    stage.appendChild(list);
    container.appendChild(stage);
    var log = el("div", "demo-log");
    container.appendChild(log);

    function render() {
      list.innerHTML = "";
      loans.forEach(function (L, i) {
        var late = day - L.due;
        var t = el("div", "rbac-tile " + (late > 0 ? "denied" : "granted"));
        t.style.cssText = "text-align:left;opacity:1;filter:none;display:flex;justify-content:space-between;align-items:center;gap:.6rem;flex-wrap:wrap";
        if (late > 0) t.style.borderColor = "var(--bad)";
        var info = el("span", null, "'" + L.book + "' - " + L.who + " - due Day " + L.due +
          (late > 0 ? "  OVERDUE " + late + "d" : ""));
        if (late > 0) info.style.color = "var(--bad)";
        t.appendChild(info);
        var r = el("button", "demo-run", "Return");
        r.addEventListener("click", function () {
          loans.splice(i, 1);
          logLine(log, late > 0
            ? "'" + L.book + "' returned " + late + " days late - counted in the statistics report"
            : "'" + L.book + "' returned on time - thank you " + L.who.split(" ")[0], late > 0 ? "warn" : "ok");
          render();
        });
        t.appendChild(r);
        list.appendChild(t);
      });
    }
    borrow.addEventListener("click", function () {
      var L = { who: stu.select.value, book: book.select.value, due: day + 14 };
      if (loans.some(function (x) { return x.book === L.book; })) {
        logLine(log, "'" + L.book + "' is already out - the system also lists who has it", "warn");
        return;
      }
      loans.push(L);
      logLine(log, L.who + " borrowed '" + L.book + "' - due Day " + L.due + " (dates diffed with Julian-day math)", "ok");
      render();
    });
    advance.addEventListener("click", function () {
      day += 7;
      dayTag.textContent = "Day " + day;
      var flagged = {};
      loans.forEach(function (L) {
        var late = day - L.due;
        if (late > 0 && !flagged[L.who]) {
          flagged[L.who] = true;
          logLine(log, L.who + " has an overdue book (" + late + " days) -> appears in the WARNED STUDENTS list", "bad");
        }
      });
      if (!Object.keys(flagged).length) logLine(log, "a week passes... everything still on time", "info");
      render();
    });
    logLine(log, "borrow a book, then press +7 days a few times - overdue detection runs on hand-built structures", "info");
  }

  /* ============================================================
     20. ACADEMIC - Student Record BST (live tree visual)
     ============================================================ */
  function demoBstRecords(container) {
    var tb = toolbar();
    var add = runBtn("Insert student");
    var find = runBtn("Search");
    var trav = runBtn("In-order traversal");
    var reset = runBtn("Reset");
    [add, find, trav, reset].forEach(function (b) { tb.appendChild(b); });
    container.appendChild(tb);
    var stage = el("div", "demo-stage");
    container.appendChild(stage);
    var log = el("div", "demo-log");
    container.appendChild(log);

    var root = null, count = 0;
    function insert(node, id) {
      if (!node) return { id: id, l: null, r: null };
      if (id < node.id) node.l = insert(node.l, id);
      else node.r = insert(node.r, id);
      return node;
    }
    function collect(node, depth, list) {
      if (!node) return;
      collect(node.l, depth + 1, list);
      node.depth = depth;
      node.idx = list.length;
      list.push(node);
      collect(node.r, depth + 1, list);
    }
    function render() {
      var list = [];
      collect(root, 0, list);
      var w = 480, h = 235;
      var svg = '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" style="display:block">';
      var xOf = function (n) { return list.length === 1 ? w / 2 : 26 + n.idx * ((w - 52) / (list.length - 1)); };
      var yOf = function (n) { return 26 + n.depth * 48; };
      function edges(node) {
        if (!node) return "";
        var s = "";
        [node.l, node.r].forEach(function (c) {
          if (c) s += '<line x1="' + xOf(node) + '" y1="' + yOf(node) + '" x2="' + xOf(c) + '" y2="' + yOf(c) + '" stroke="var(--line)" stroke-width="1.5"/>';
        });
        return s + edges(node.l) + edges(node.r);
      }
      svg += edges(root);
      list.forEach(function (n) {
        svg += '<g id="bst-' + n.id + '"><circle cx="' + xOf(n) + '" cy="' + yOf(n) + '" r="15" fill="var(--bg-panel)" stroke="var(--ink-3)" stroke-width="1.5"/>' +
          '<text x="' + xOf(n) + '" y="' + (yOf(n) + 4) + '" text-anchor="middle" font-size="11" font-family="var(--mono)" fill="var(--ink)">' + n.id + "</text></g>";
      });
      stage.innerHTML = svg + "</svg>";
    }
    function depthOf(node) { return node ? 1 + Math.max(depthOf(node.l), depthOf(node.r)) : 0; }

    add.addEventListener("click", function () {
      if (count >= 12) { logLine(log, "12 records is plenty for a demo - try Search or Traversal", "warn"); return; }
      var id;
      do { id = 10 + Math.floor(Math.random() * 90); } while (search(root, id).found);
      root = insert(root, id);
      count++;
      render();
      logLine(log, "INSERT student #" + id + " - placed by comparisons, depth now " + depthOf(root), "ok");
    });

    function search(node, id) {
      var path = [];
      while (node) {
        path.push(node.id);
        if (id === node.id) return { found: true, path: path };
        node = id < node.id ? node.l : node.r;
      }
      return { found: false, path: path };
    }
    find.addEventListener("click", async function () {
      var list = [];
      collect(root, 0, list);
      if (!list.length) { logLine(log, "tree is empty - insert some students first", "warn"); return; }
      find.disabled = true;
      var target = list[Math.floor(Math.random() * list.length)].id;
      var res = search(root, target);
      logLine(log, "SEARCH #" + target + "...", "info");
      for (var i = 0; i < res.path.length; i++) {
        var g = stage.querySelector("#bst-" + res.path[i] + " circle");
        if (g) { g.setAttribute("stroke", "var(--accent)"); g.setAttribute("stroke-width", "3"); }
        await sleep(360);
      }
      logLine(log, "found #" + target + " in " + res.path.length + " comparisons (vs scanning all " + count + " records)", "ok");
      await sleep(700);
      render();
      find.disabled = false;
    });

    trav.addEventListener("click", function () {
      var list = [];
      collect(root, 0, list);
      if (!list.length) { logLine(log, "tree is empty - insert some students first", "warn"); return; }
      logLine(log, "in-order traversal: " + list.map(function (n) { return n.id; }).join(", "), "ok");
      logLine(log, "sorted for free - that is the whole point of a BST", "info");
    });
    reset.addEventListener("click", function () {
      root = null; count = 0;
      render();
      logLine(log, "tree cleared", "info");
    });

    [42, 23, 67, 15, 50].forEach(function (id) { root = insert(root, id); count++; });
    render();
    logLine(log, "a real BST, drawn live - insert, search and traverse it (custom queue did level-order in the C++ original)", "info");
  }

  /* ============================================================
     registry + mounting
     ============================================================ */
  var REGISTRY = {
    "kellie-fyp": demoKellieFyp,
    "kellie-escape": demoKellie,
    "kellie-vr360": demoKellieVR,
    "do-pipeline": demoDoPipeline,
    "forex-sync": demoForexSync,
    "notify-hub": demoNotifyHub,
    "ssrs-monitor": demoSsrsMonitor,
    "ops-portal": demoOpsPortal,
    "work-record": demoWorkRecord,
    "routine-habits": demoRoutineHabits,
    "mindharmony": demoMindHarmony,
    "eco-sort": demoEcoSort,
    "ar-extinguisher": demoArExtinguisher,
    "ar-video": demoArVideo,
    "ar-fire-tabs": demoArFireTabs,
    "vr-extinguisher": demoVrExtinguisher,
    "math-adventure": demoMathAdventure,
    "stockfx": demoStockFx,
    "fruit-stall": demoFruitStall,
    "food-ordering": demoFoodOrdering,
    "library-loans": demoLibraryLoans,
    "bst-records": demoBstRecords
  };

  window.PORTFOLIO_DEMOS = {
    ids: Object.keys(REGISTRY),
    mountAll: function () {
      App = window.PORTFOLIO_APP;
      document.querySelectorAll("[data-demo]").forEach(function (box) {
        var id = box.getAttribute("data-demo");
        box.innerHTML = "";
        if (!id || !REGISTRY[id]) {
          var ph = el("div", "demo-log", "No interactive demo attached to this project.");
          box.appendChild(ph);
          return;
        }
        try {
          REGISTRY[id](box);
        } catch (e) {
          console.error("demo mount failed:", id, e);
          box.appendChild(el("div", "demo-log bad", "Demo failed to load."));
        }
      });
    },
    mountInto: function (box, id) {
      box.setAttribute("data-demo", id);
      box.innerHTML = "";
      if (REGISTRY[id]) REGISTRY[id](box);
    }
  };
})();
