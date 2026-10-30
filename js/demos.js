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
     1. DO PIPELINE - the Delivery Order Intelligence Pipeline.
     The exhibit itself lives in js/do-workbench.js: it outgrew
     this file, and its rule engine is kept DOM-free so the
     pipeline's real rules can be checked without driving a UI.
     ============================================================ */
  function mountDoWorkbench(container) {
    var wb = window.PORTFOLIO_DO_WORKBENCH;
    if (!wb) {
      container.appendChild(el("div", "demo-log bad", "Demo failed to load."));
      return;
    }
    wb.mount(container);
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
     7. KELLIE CASTLE - shared synthesized sound and registry
     adapters. The FYP-based story, panoramic tour and native
     puzzle panels live in the castle-experience modules.
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

  function demoKellie(container) {
    container.castleExperience = window.PORTFOLIO_CASTLE_EXPERIENCE.mount(container, {
      initialMode: "story", lockedMode: true, sounds: keSfx()
    });
  }
  function demoKellieVR(container) {
    container.castleExperience = window.PORTFOLIO_CASTLE_EXPERIENCE.mount(container, {
      initialMode: "tour", lockedMode: true, sounds: keSfx()
    });
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
    container.castleExperience = window.PORTFOLIO_CASTLE_EXPERIENCE.mount(container, {
      initialMode: "story", sounds: keSfx()
    });
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
    "do-pipeline": mountDoWorkbench,
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
