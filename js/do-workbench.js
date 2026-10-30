/* ============================================================
   do-workbench.js - the Delivery Order Intelligence Pipeline
   exhibit, as a single workbench: the queue, the document, the
   checks and the four pipeline stages all visible at once.

   Three parts with a hard boundary between them:
     RULES - pure. file + run set -> checks, verdict, field count.
             No DOM, no timers. This is the part that must not
             drift, and keeping it DOM-free is what makes that
             checkable.
     DOCS  - the mock paperwork and its renderer.
     mount - builds the six zones, wires events, runs the run.

   Every document here is invented. No real customer, address,
   project or delivery order appears in this file.

   Registered through demos.js so PORTFOLIO_DEMOS keeps its API
   and exhibits.js stays the only thing that mounts a demo.
   ============================================================ */
(function () {
  "use strict";

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function reduced() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function sleep(ms) {
    if (reduced()) return Promise.resolve();
    return new Promise(function (res) { setTimeout(res, ms); });
  }

  /* ============================================================
     FILES - one scan per rule of the real pipeline.
     marks: "both" = chop + signature in the customer box.
     mo:    a handwritten Master Override on the page.
     ============================================================ */
  var FILES = [
    { id: "scan_101", num: "DO-88101", marks: "both", term: "DELIVERY", mo: "", kind: "normal" },
    { id: "scan_102", num: "DO-88102", marks: "none", term: "DELIVERY", mo: "", kind: "missing" },
    { id: "scan_103", num: "DO-88103", marks: "none", term: "OWN TRANSPORT", mo: "", kind: "own" },
    { id: "scan_104", num: "DO-88101", marks: "both", term: "DELIVERY", mo: "", kind: "dup-true" },
    { id: "scan_105", num: "DO-88103", marks: "both", term: "OWN TRANSPORT", mo: "", kind: "dup-false" },
    { id: "scan_106", num: "DO-88106", marks: "none", term: "-", mo: "OWN TRANSPORT", kind: "mo-own" },
    { id: "scan_107", num: "DO-88107", marks: "faint", term: "DELIVERY", mo: "PASS", kind: "mo-pass" }
  ];

  /* Extra scans the Add Documents button drops into the crate. */
  var WALK_IN = [
    { num: "DO-88110", marks: "both", term: "DELIVERY", mo: "", kind: "normal" },
    { num: "DO-88111", marks: "none", term: "OWN TRANSPORT", mo: "", kind: "own" },
    { num: "DO-88112", marks: "both", term: "DELIVERY", mo: "", kind: "normal" }
  ];

  /* ============================================================
     DOCS - the paperwork on the clipboard.
     ============================================================ */
  var OCR_TOTAL = 29;   // fields the vision pass tries to read

  var DOCS = {
    "DO-88101": {
      customer: "Southern Mock Construction Sdn Bhd",
      date: "12/05/2024", project: "Mockfield Mega Project",
      to: "Lot 15, Jalan Contoh, 68000 Sampleview, Selangor",
      items: [["1", "10MM STEEL BAR", "1,200", "PCS"],
              ["2", "20MM STEEL BAR", "800", "PCS"],
              ["3", "CEMENT OPC 50KG", "300", "BAG"],
              ["4", "SAND", "10", "TON"]],
      received: "13 MAY 2024"
    },
    "DO-88102": {
      customer: "Northgate Mock Builders Sdn Bhd",
      date: "12/05/2024", project: "Example Ridge Phase 2",
      to: "Lot 4, Jalan Percubaan, 47100 Sampletown, Selangor",
      items: [["1", "PLYWOOD 18MM", "240", "PCS"],
              ["2", "TIMBER BATTEN", "600", "PCS"],
              ["3", "NAILS 3IN", "40", "BOX"]],
      received: "13 MAY 2024"
    },
    "DO-88103": {
      customer: "Mock Valley Trading Sdn Bhd",
      date: "13/05/2024", project: "Sample Depot Restock",
      to: "Lot 88, Jalan Rekaan, 43300 Mocktown, Selangor",
      items: [["1", "PVC PIPE 4IN", "150", "PCS"],
              ["2", "PIPE FITTING SET", "60", "SET"]],
      received: "14 MAY 2024"
    },
    "DO-88106": {
      customer: "Eastwind Mock Supplies Sdn Bhd",
      date: "14/05/2024", project: "Placeholder Yard Delivery",
      to: "Lot 22, Jalan Rujukan, 40150 Sampleview, Selangor",
      items: [["1", "WIRE MESH A7", "90", "PCS"],
              ["2", "BINDING WIRE", "25", "KG"]],
      received: "15 MAY 2024"
    },
    "DO-88107": {
      customer: "Mock Harbour Logistics Sdn Bhd",
      date: "14/05/2024", project: "Test Wharf Extension",
      to: "Lot 3, Jalan Misalan, 42000 Mockport, Selangor",
      items: [["1", "MARINE PLY 12MM", "120", "PCS"],
              ["2", "GALV BOLT M12", "500", "PCS"],
              ["3", "PAINT PRIMER", "18", "TIN"]],
      received: "15 MAY 2024"
    }
  };

  var FALLBACK_DOC = {
    customer: "Mock Trading Sdn Bhd",
    date: "16/05/2024", project: "Sample Site Delivery",
    to: "Lot 1, Jalan Contoh, 40000 Mocktown, Selangor",
    items: [["1", "GENERAL GOODS", "100", "PCS"]],
    received: "17 MAY 2024"
  };

  function docFor(file) { return DOCS[file.num] || FALLBACK_DOC; }

  /* The scan id is an internal rule-engine key. Keep it out of the visitor
     UI: filenames are the stable, human-readable document identity. */
  function displayFilename(file) {
    return file.num.replace('-', '_') + '.pdf';
  }

  /* Renders the scan onto the clipboard paper. Fields carry
     data-f so the reading pass can light them one at a time. */
  function renderDoc(file) {
    var d = docFor(file);
    var paper = el("div", "dw-paper");

    var head = el("div", "dw-doc-head");
    head.appendChild(el("h4", null, "DELIVERY ORDER"));
    head.appendChild(el("span", "dw-doc-ref", displayFilename(file)));
    paper.appendChild(head);

    var meta = el("dl", "dw-doc-meta");
    [["Customer Name", d.customer], ["DO Number", file.num],
     ["Order Date", d.date], ["Project", d.project],
     ["Delivery To", d.to]].forEach(function (row, i) {
      var dt = el("dt", null, row[0]);
      var dd = el("dd", null, row[1]);
      dd.setAttribute("data-f", String(i));
      meta.appendChild(dt);
      meta.appendChild(dd);
    });
    paper.appendChild(meta);

    var table = el("table", "dw-doc-items");
    var hr = el("tr");
    ["Item No.", "Description", "Qty", "UOM"].forEach(function (h) {
      hr.appendChild(el("th", null, h));
    });
    table.appendChild(hr);
    d.items.forEach(function (it, i) {
      var tr = el("tr");
      tr.setAttribute("data-f", String(5 + i));
      it.forEach(function (c) { tr.appendChild(el("td", null, c)); });
      table.appendChild(tr);
    });
    paper.appendChild(table);

    var foot = el("div", "dw-doc-foot");
    var stamp = el("span", "dw-doc-stamp");
    stamp.appendChild(el("b", null, "RECEIVED"));
    stamp.appendChild(el("span", null, d.received));
    foot.appendChild(stamp);

    /* The chop box. The rule is POSITIONAL - what matters is
       whether the mark sits inside this box - so the box is
       always drawn, empty or not. */
    var box = el("div", "dw-chop" + (file.marks === "none" ? " is-empty" : ""));
    if (file.marks === "both" || file.marks === "faint") {
      var ring = el("span", "dw-chop-ring" + (file.marks === "faint" ? " is-faint" : ""), "MOCK CO.");
      box.appendChild(ring);
      box.appendChild(el("span", "dw-chop-sign" + (file.marks === "faint" ? " is-faint" : "")));
    }
    box.appendChild(el("small", null, "Customer's Chop & Signature"));
    foot.appendChild(box);
    paper.appendChild(foot);

    if (file.mo) {
      paper.appendChild(el("div", "dw-mo", "MASTER OVERRIDE: " + file.mo));
    }
    return paper;
  }

  /* ============================================================
     RULES - pure. No DOM, no timers, no randomness.

     inspect(file, run) -> {
       checks:  four rows, in console order
       verdict: what happens to the file
       fields:  {read, total} for the console meter
     }
     `run` is the array of files in this run, earliest first, so
     the duplicate check can see what was filed before it.
     ============================================================ */
  var RULES = {
    /* How much of the page the vision pass could read. Faint or
       absent marks cost fields - 16 of 29 is the documented
       partial read the real pipeline reports. */
    fieldsRead: function (file) {
      if (file.marks === "faint") return 16;
      if (file.marks === "none") return file.term === "-" ? 26 : 27;
      return OCR_TOTAL;
    },

    /* Has this DO number already been filed earlier in the run? */
    priorCopy: function (file, run) {
      var idx = run.indexOf(file);
      for (var i = 0; i < idx; i++) {
        if (run[i].num === file.num) return run[i];
      }
      return null;
    },

    /* Same number AND same content is a true duplicate. Different
       content is a later revision, never a delete. */
    isTrueDuplicate: function (file, prior) {
      return !!prior && prior.marks === file.marks && prior.term === file.term;
    },

    capture: function (file) {
      var read = RULES.fieldsRead(file);
      return {
        fields: { read: read, total: OCR_TOTAL },
        readCheck: {
        id: "read", label: "Reading the scan",
        state: read === OCR_TOTAL ? "pass" : "warn",
        note: read === OCR_TOTAL
          ? "all " + OCR_TOTAL + " fields read"
          : read + " of " + OCR_TOTAL + " fields read"
        }
      };
    },

    understand: function (file) {
      var exempt = file.term === "OWN TRANSPORT" || file.mo === "OWN TRANSPORT";
      var chopCheck;

      if (file.mo) {
        chopCheck = {
          id: "chop", label: "Chop & signature", state: "info",
          note: file.marks === "faint"
            ? "marks too faint to verify - see override"
            : "no chop found - see override"
        };
      } else if (exempt) {
        chopCheck = {
          id: "chop", label: "Chop & signature", state: "info",
          note: "Own Transport - chop & sign optional"
        };
      } else if (file.marks === "both") {
        chopCheck = {
          id: "chop", label: "Chop & signature", state: "pass",
          note: "both found in the customer box"
        };
      } else {
        chopCheck = {
          id: "chop", label: "Chop & signature", state: "fail",
          note: "customer box is empty - chop & sign are mandatory"
        };
      }

      return {
        exempt: exempt,
        chopCheck: chopCheck,
        overrideCheck: {
          id: "override", label: "Master Override",
          state: file.mo ? "pass" : "skip",
          note: file.mo ? "handwritten override honoured: " + file.mo
                        : "none on this page"
        }
      };
    },

    enrich: function (file, run, understanding) {
      var prior = RULES.priorCopy(file, run);
      var dup = RULES.isTrueDuplicate(file, prior);
      var verdict;
      var duplicateCheck = {
        id: "duplicate", label: "Duplicate compare",
        state: prior ? (dup ? "warn" : "pass") : "pass",
        note: !prior ? "no earlier copy of " + file.num + " on file"
          : dup ? "full compare: 100% identical to the filed copy"
                : "same number, content differs - not a duplicate"
      };

      /* Order matters: a confirmed duplicate is deleted whatever
         else the page says, and an override outranks the vision
         pass but never outranks a true duplicate. */
      if (dup) {
        verdict = { status: "Deleted", cls: "bad", stamp: "DELETED",
                    remark: "true duplicate of filed " + file.num + " (verified by full compare)" };
      } else if (prior) {
        verdict = { status: "Success", cls: "", stamp: "LATEST",
                    remark: "not a duplicate - overwrote the earlier " + file.num + " copy, kept latest" };
      } else if (file.mo) {
        verdict = { status: "Success", cls: "", stamp: "FILED",
                    remark: "master override: " + file.mo.toLowerCase() };
      } else if (understanding.exempt) {
        verdict = { status: "Success", cls: "", stamp: "FILED",
                    remark: "own transport - chop optional" };
      } else if (file.marks === "both") {
        verdict = { status: "Success", cls: "", stamp: "FILED",
                    remark: "chop & sign verified" };
      } else {
        verdict = { status: "Needs Review", cls: "warn", stamp: "REVIEW",
                    remark: "missing chop & sign - rescan to recover" };
      }

      return { duplicateCheck: duplicateCheck, verdict: verdict };
    },

    inspect: function (file, run) {
      var capture = RULES.capture(file);
      var understanding = RULES.understand(file);
      var enrichment = RULES.enrich(file, run, understanding);
      return {
        checks: [capture.readCheck, understanding.chopCheck,
          enrichment.duplicateCheck, understanding.overrideCheck],
        verdict: enrichment.verdict,
        fields: capture.fields
      };
    }
  };

  /* ============================================================
     STAGES - the Intelligence Pipeline panel.
     ============================================================ */
  // Counts have explicit units: unique affected orders and missing required marks.
  RULES.reviewSummary = function (review) {
    var orders = Object.create(null), missing = Object.create(null);
    review.forEach(function (file) {
      var key = file.num || file.id;
      orders[key] = true;
      if (file.marks === "none") {
        missing[key + ":chop"] = true;
        missing[key + ":signature"] = true;
      }
      // Faint/uncertain marks need verification; do not label them missing.
    });
    return { orders: Object.keys(orders).length, missingMarks: Object.keys(missing).length };
  };
  RULES.reviewLabel = function (summary) {
    if (!summary.orders) return "No exceptions";
    var orders = summary.orders + (summary.orders === 1 ? " order" : " orders");
    return summary.missingMarks ? orders + " / " + summary.missingMarks +
      (summary.missingMarks === 1 ? " missing mark" : " missing marks") :
      orders + (summary.orders === 1 ? " needs review" : " need review");
  };

  var STAGES = [
    ["Capture", "Scan & Ingest"],
    ["Understand", "AI Extract & Validate"],
    ["Enrich", "Business Rules"],
    ["Deliver", "Insights & Reports"]
  ];

  var STAGE_HELP = [
    "Collect the selected scans and read the delivery-order fields with OCR. Nothing is filed yet.",
    "Check the customer chop and signature, delivery terms, and any handwritten Master Override.",
    "Apply the business rules and compare matching order numbers. Identical copies are duplicates; different content is a revision.",
    "File the accepted orders, record every outcome in the run ledger, and send exceptions for a person to review."
  ];

  var RULE_TEXT = [
    "Chop & signature are mandatory on a normal copy, and the check is positional - the mark must sit inside the customer box at the foot of the page.",
    "Own Transport exempts a copy from the chop requirement. No alert is raised with or without a chop.",
    "A duplicate is deleted only after a second full-content compare returns 100% identical. Same number with different content is a later revision, not a duplicate.",
    "A handwritten Master Override wins over whatever the vision pass read."
  ];

  /* ============================================================
     mount
     ============================================================ */
  function mount(box) {
    /* Every panel uses the same header and Close control. The content region
       scrolls independently, so dismissal never moves out of reach. */
    function modalClose(className) {
      var button = el("button", "dw-modal-close " + className, "Close");
      button.type = "button";
      return button;
    }
    function frameModal(panel, heading, closeButton) {
      panel.classList.add("dw-modal");
      var header = el("div", "dw-modal-header");
      header.appendChild(heading);
      header.appendChild(closeButton);
      var body = el("div", "dw-modal-body");
      while (panel.firstChild) body.appendChild(panel.firstChild);
      panel.appendChild(header);
      panel.appendChild(body);
      if (!panel._dwModalBound) {
        panel._dwModalBound = true;
        panel.addEventListener("cancel", function (event) {
          event.preventDefault();
          if (panel === rulesPanel) rulesTab.setAttribute("aria-expanded", "false");
          closeOverlay(panel);
        });
        panel.addEventListener("click", function (event) {
          if (event.target !== panel) return;
          var bounds = panel.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right ||
              event.clientY < bounds.top || event.clientY > bounds.bottom) {
            if (panel === rulesPanel) rulesTab.setAttribute("aria-expanded", "false");
            closeOverlay(panel);
          }
        });
      }
    }
    var files = FILES.map(function (f) { return Object.assign({}, f); });
    var walkIn = 0;
    var picked = {};        // id -> included in the next run
    var tabs = {};          // id -> crate tab element
    var results = {};       // id -> {checks, verdict, fields}
    var focusId = files[0].id;
    var running = false;

    files.forEach(function (f) { picked[f.id] = true; });

    box.innerHTML = "";
    var desk = el("div", "dw");
    desk.classList.toggle("is-reduced-motion", reduced());
    box.appendChild(desk);
    var feedback = el("p", "dw-sample-feedback");
    feedback.setAttribute("aria-hidden", "true");
    (box.closest(".ft-scene--mill") || box).appendChild(feedback);
    var feedbackTimer = null;
    function announceSample(message) {
      clearTimeout(feedbackTimer);
      feedback.textContent = message;
      feedback.classList.add("is-visible");
      // Keep announcements in the persistent live region when the banner hides.
      say(message);
      feedbackTimer = setTimeout(function () {
        feedback.textContent = "";
        feedback.classList.remove("is-visible");
        feedbackTimer = null;
      }, 5000);
    }

    desk.appendChild(el("h4", "dw-board-title", "Document Mill"));
    var helpButton = el("button", "dw-help", "How to play");
    helpButton.type = "button";
    helpButton.setAttribute("aria-haspopup", "dialog");
    helpButton.setAttribute("aria-controls", "dw-help-dialog");
    desk.appendChild(helpButton);
    var helpPanel = el("dialog", "dw-help-panel");
    helpPanel.id = "dw-help-dialog";
    helpPanel.hidden = true;
    helpPanel.setAttribute("role", "dialog");
    helpPanel.setAttribute("aria-modal", "true");
    helpPanel.setAttribute("aria-labelledby", "dw-help-title");
    var helpTitle = el("h4", "dw-zone-title", "How to play the Document Mill");
    helpTitle.id = "dw-help-title";
    helpPanel.appendChild(helpTitle);
    var helpSteps = el("ol", "dw-help-steps");
    [
      ["Choose your orders", "Tick the orders to include in the next run. Click a filename to view it. Scroll the folder rack to reach more orders; the selected count stays beside Run Inspection."],
      ["Run the inspection", "Press Run Inspection and watch the four stages. Hover over a stage or focus it with Tab to learn what it does."],
      ["Read the results", "Open View run ledger for every outcome. The exceptions button opens the report for orders needing attention."],
      ["Try a recovery", "In the exception report, choose the rescan action to see how a corrected chop and signature can recover an order. Add sample order introduces another invented document."]
    ].forEach(function (step) {
      var item = el("li");
      item.appendChild(el("strong", null, step[0]));
      item.appendChild(el("p", null, step[1]));
      helpSteps.appendChild(item);
    });
    helpPanel.appendChild(helpSteps);
    helpPanel.appendChild(el("p", "dw-help-note", "This is a simulation using invented documents. No upload or real business data is needed."));
    var helpClose = modalClose("dw-help-close");
    helpClose.type = "button";
    helpPanel.appendChild(helpClose);
    frameModal(helpPanel, helpTitle, helpClose);
    desk.appendChild(helpPanel);
    helpButton.addEventListener("click", function () { openOverlay(helpPanel, helpButton, helpClose); });
    helpClose.addEventListener("click", function () { closeOverlay(helpPanel); });


    /* screen-reader narration for a run that is otherwise purely visual */
    var live = el("div", "dw-live");
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    desk.appendChild(live);
    function say(t) { live.textContent = t; }
    /* ---------- the run ledger: the visible twin of the narration ---------- */
    var ledger = el("dialog", "dw-ledger");
    ledger.setAttribute("aria-label", "Run ledger");
    var ledgerTitle = el("h4", "dw-zone-title", "Run Ledger");
    ledger.appendChild(ledgerTitle);
    var progressLog = el("ol", "dw-progress-log");
    progressLog.setAttribute("role", "log");
    progressLog.setAttribute("aria-live", "polite");
    progressLog.setAttribute("aria-relevant", "additions");
    progressLog.setAttribute("aria-label", "Inspection progress");
    progressLog.classList.add("dw-live-progress");
    desk.appendChild(progressLog);
    var ledgerRows = el("ul", "dw-ledger-rows");
    ledger.appendChild(ledgerRows);
    desk.appendChild(ledger);
    ledger.hidden = true;
    ledger.setAttribute("role", "dialog");
    ledger.setAttribute("aria-modal", "true");
    ledger.id = "dw-ledger-dialog";
    var ledgerClose = modalClose("dw-ledger-close");
    ledgerClose.type = "button";
    ledger.appendChild(ledgerClose);
    frameModal(ledger, ledgerTitle, ledgerClose);
    var ledgerToggle = el("button", "dw-ledger-toggle", "View run ledger");
    ledgerToggle.type = "button";
    ledgerToggle.setAttribute("aria-controls", ledger.id);
    ledgerToggle.setAttribute("aria-haspopup", "dialog");
    ledgerToggle.addEventListener("click", function () { openOverlay(ledger, ledgerToggle, ledgerClose); });
    ledgerClose.addEventListener("click", function () { closeOverlay(ledger); });

    var loggedStage = -1;
    function showLedgerEmpty() {
      ledgerRows.innerHTML = "";
      ledgerRows.appendChild(el("li", "dw-ledger-empty", "No run yet"));
    }
    function resetProgress() {
      progressLog.innerHTML = "";
      ledgerRows.innerHTML = "";
      loggedStage = -1;
    }
    function logProgress(text) { progressLog.appendChild(el("li", null, text)); }
    /* One row per order, written the moment its verdict is decided. */
    var STAMP_CLASS = { FILED: "is-filed", REVIEW: "is-review", DELETED: "is-deleted", LATEST: "is-filed" };
    function logVerdict(file) {
      var v = results[file.id].verdict;
      var row = el("li", "dw-ledger-row " + (STAMP_CLASS[v.stamp] || ""));
      row.appendChild(el("b", "dw-ledger-doc", displayFilename(file)));
      row.appendChild(el("span", "dw-ledger-stamp", v.stamp));
      row.appendChild(el("small", "dw-ledger-remark", v.remark));
      ledgerRows.appendChild(row);
    }
    showLedgerEmpty();

    /* ---------- zone 1: incoming orders ---------- */
    var crate = el("div", "dw-crate");
    crate.appendChild(el("h4", "dw-zone-title", "Incoming Orders"));
    var batchSummary = el("p", "dw-batch-summary dw-batch-note", "7 of 7 selected");
    batchSummary.id = "dw-batch-summary";
    var inbox = el("div", "dw-inbox");
    var crateList = el("ul", "dw-files");
    inbox.appendChild(crateList);
    crate.appendChild(inbox);
    var addBtn = el("button", "dw-add", "Add sample order");
    addBtn.type = "button";
    crate.appendChild(addBtn);
    desk.appendChild(crate);

    function tabFor(f) {
      var li = el("li", "dw-file");
      var pick = el("input", "dw-file-pick");
      pick.type = "checkbox";
      pick.checked = picked[f.id];
      pick.setAttribute("aria-label", "Include " + displayFilename(f) + " in next inspection");
      pick.setAttribute("aria-describedby", batchSummary.id);
      pick.disabled = running;
      pick.addEventListener("click", function (event) { event.stopPropagation(); });
      pick.addEventListener("change", function () {
        if (running) { pick.checked = picked[f.id]; return; }
        picked[f.id] = pick.checked;
        li.classList.toggle("is-out", !pick.checked);
        updateBatchSummary();
        prepareReady(batchSummary.textContent + ". " + displayFilename(f) +
          (pick.checked ? " included. Ready to inspect." : " excluded. Ready to inspect."));
      });
      var pickHit = el("label", "dw-pick-hit");
      pickHit.appendChild(pick);
      var open = el("button", "dw-file-open", displayFilename(f));
      open.type = "button";
      open.setAttribute("aria-label", "Focus " + displayFilename(f));
      open.disabled = running;
      open.addEventListener("click", function () { focus(f.id); });
      li.appendChild(pickHit);
      li.appendChild(open);
      li.appendChild(el("span", "dw-badge"));
      li.appendChild(el("span", "dw-stamp"));
      tabs[f.id] = li;
      return li;
    }
    function drawCrate() {
      crateList.innerHTML = "";
      files.forEach(function (f) {
        var li = tabFor(f);
        li.classList.toggle("is-out", !picked[f.id]);
        li.classList.toggle("is-focus", f.id === focusId);
        li.querySelector(".dw-file-open").setAttribute("aria-current", f.id === focusId ? "true" : "false");
        var r = results[f.id];
        if (r) {
          li.querySelector(".dw-stamp").textContent = r.verdict.stamp;
          li.querySelector(".dw-stamp").className = "dw-stamp is-on " + (r.verdict.cls || "good");
          var issues = r.checks.filter(function (c) {
            return c.state === "fail" || c.state === "warn";
          }).length;
          var badge = li.querySelector(".dw-badge");
          badge.textContent = issues ? String(issues) : "";
          badge.setAttribute("aria-label", issues ? issues + " issues found" : "No issues found");
        } else {
          li.querySelector(".dw-badge").textContent = "";
          li.querySelector(".dw-badge").removeAttribute("aria-label");
        }
        crateList.appendChild(li);
      });
      updateBatchSummary();
    }

    function updateBatchSummary() {
      var included = includedCount();
      batchSummary.textContent = included + " of " + files.length + " selected";
      batchSummary.setAttribute("aria-label", included + " of " + files.length + " orders selected for the next inspection");
    }
    function includedCount() {
      return files.filter(function (f) { return picked[f.id]; }).length;
    }

    addBtn.addEventListener("click", function () {
      if (running) return;
      var hadResults = Object.keys(results).length > 0;
      var t = WALK_IN[walkIn % WALK_IN.length];
      walkIn++;
      var f = Object.assign({}, t, { id: "scan_" + (200 + walkIn) });
      files.push(f);
      picked[f.id] = true;
      focus(f.id, true);
      var message = "Added sample " + displayFilename(f) + ". " + batchSummary.textContent +
        ". " + (hadResults ? "Previous results cleared for the new batch. " : "") +
        "Run inspection to process the selected samples.";
      prepareReady(message);
      announceSample(message);
      if (window.SCENE_EDITOR_API && window.SCENE_EDITOR_API.refresh) {
        window.SCENE_EDITOR_API.refresh();
      }
    });

    /* ---------- zone 2: the viewer ---------- */
    var viewer = el("div", "dw-viewer");
    viewer.appendChild(el("h4", "dw-zone-title dw-sr", "Document viewer"));
    var glass = el("div", "dw-glass");
    var viewerBackground = el("div", "dw-viewer-bg");
    viewerBackground.setAttribute("aria-hidden", "true");
    glass.appendChild(viewerBackground);
    viewer.appendChild(glass);
    desk.appendChild(viewer);

    /* the magnifier is the clipboard's tool: it opens the current order at
       readable size in a lightbox (decision M1, 2026-09-22) */
    var magnify = el("button", "dw-magnify");
    magnify.type = "button";
    magnify.setAttribute("aria-label", "Enlarge the delivery order");
    magnify.title = "Enlarge the delivery order";
    viewer.appendChild(magnify);

    function current() {
      return files.filter(function (f) { return f.id === focusId; })[0] || files[0];
    }
    function showDoc(silent) {
      glass.innerHTML = "";
      glass.appendChild(viewerBackground);
      var paperSpace = el("div", "dw-paper-space");
      paperSpace.appendChild(renderDoc(current()));
      glass.appendChild(paperSpace);
      if (window.SCENE_EDITOR_API && window.SCENE_EDITOR_API.refresh) {
        window.SCENE_EDITOR_API.refresh();
      }
    }
    function focus(id, silent) {
      var restoreQueueFocus = !silent && document.activeElement &&
        document.activeElement.classList.contains("dw-file-open");
      focusId = id;
      drawCrate();
      showDoc(silent);
      /* Keep the active order in view inside the three-pocket rack without
         scrolling the surrounding page. */
      if (tabs[id]) {
        var rowTop = tabs[id].offsetTop;
        var rowBottom = rowTop + tabs[id].offsetHeight;
        if (rowTop < crateList.scrollTop) crateList.scrollTop = rowTop;
        else if (rowBottom > crateList.scrollTop + crateList.clientHeight)
          crateList.scrollTop = rowBottom - crateList.clientHeight;
      }
      if (restoreQueueFocus && tabs[id]) tabs[id].querySelector(".dw-file-open").focus();
      if (!silent) say("Focused " + displayFilename(current()) + ". Inclusion unchanged.");
    }

    /* ---------- zone 3: the inspection console ---------- */
    var console_ = el("div", "dw-console");
    console_.setAttribute("aria-label", "AI Inspection Station");
    var screen = el("div", "dw-screen");
    console_.appendChild(screen);
    /* "AI Inspection Station" collides with the field meter that shares this
   header bar - MEASURED 120px of title against 90px of meter in a 180px
   screen. The zone is named in full by the aria-label below. */
    var scrHead = el("div", "dw-screen-head", "AI Inspection");
    var lamps = el("span", "dw-lamps");
    lamps.appendChild(el("i", "dw-lamp dw-lamp--busy"));
    lamps.appendChild(el("i", "dw-lamp dw-lamp--ok"));
    scrHead.appendChild(lamps);
    screen.appendChild(scrHead);

    /* The status line is the last row INSIDE the screen (2026-09-17). The
       screen has grown since the 85px measurement above this once carried:
       at 1280 it is ~127px and four check rows leave ~25px of empty green,
       which is exactly one status line. Gate: screen.scrollHeight must not
       exceed clientHeight after a run - see the probe. */
    var boot = el("div", "dw-boot");

    var rows = el("ul", "dw-checks");
    screen.appendChild(rows);

    var meter = el("div", "dw-meter");
    meter.title = "OCR fields read";
    /* short on screen, spelled out in the tooltip: the meter sits in the
       console's header bar, where "OCR fields read" does not fit */
    var meterLabel = el("span", "dw-meter-label", "OCR");
    var meterVal = el("b", "dw-meter-val", "–");
    var meterBar = el("span", "dw-meter-bar");
    meterBar.appendChild(el("i"));
    meter.appendChild(meterLabel);
    meter.appendChild(meterBar);
    meter.appendChild(meterVal);
    screen.appendChild(meter);
    screen.appendChild(boot);

    var runBtn = el("button", "dw-run", "Run Inspection");
    runBtn.type = "button";
    console_.appendChild(runBtn);
    console_.appendChild(batchSummary);
    var runHint = el("p", "dw-run-hint", "Select at least one order");
    runHint.id = "dw-run-hint";
    runHint.hidden = true;
    console_.appendChild(runHint);

    var rulesTab = el("button", "dw-rules-tab", "Rules & Checks");
    rulesTab.type = "button";
    rulesTab.setAttribute("aria-expanded", "false");
    rulesTab.setAttribute("aria-controls", "dw-rules-dialog");
    console_.appendChild(rulesTab);
    desk.appendChild(console_);

    /* Only the row being evaluated carries its note. Four rows with a note
       each need ~100px and the console screen is 49% of the console's height
       - MEASURED at 128px, which showed two rows and clipped the rest. One
       line per settled row plus the live row's note fits, and it reads
       better: the eye lands on what is happening now. */
    function drawChecks(checks, upto) {
      rows.innerHTML = "";
      var n = upto === undefined ? checks.length : upto;
      checks.slice(0, n).forEach(function (c, i) {
        var li = el("li", "dw-check is-" + c.state + (i === n - 1 ? " is-current" : ""));
        li.appendChild(el("span", "dw-check-icon dw-check-icon--" + c.id));
        var t = el("span", "dw-check-text");
        t.appendChild(el("b", null, c.label));
        t.appendChild(el("small", null, c.note));
        li.appendChild(t);
        li.appendChild(el("span", "dw-check-mark"));
        rows.appendChild(li);
      });
    }
    var NEUTRAL_CHECKS = [
      { id: "read", label: "Reading the scan", state: "neutral", note: "Waiting for inspection" },
      { id: "chop", label: "Chop & signature", state: "neutral", note: "Waiting for inspection" },
      { id: "duplicate", label: "Duplicate compare", state: "neutral", note: "Waiting for inspection" },
      { id: "override", label: "Master Override", state: "neutral", note: "Waiting for inspection" }
    ];
    function checksForStage(checks, stageIndex) {
      var visible = stageIndex === 0 ? { read: true } :
        stageIndex === 1 ? { read: true, chop: true, override: true } :
        stageIndex >= 2 ? { read: true, chop: true, duplicate: true, override: true } : {};
      return NEUTRAL_CHECKS.map(function (neutral) {
        var actual = checks.filter(function (check) { return check.id === neutral.id; })[0];
        return visible[neutral.id] && actual ? actual : neutral;
      });
    }
    function phaseChecks(pending, stageIndex) {
      var checks = [pending.capture.readCheck];
      if (stageIndex >= 1) {
        checks.push(pending.understanding.chopCheck, pending.understanding.overrideCheck);
      }
      if (stageIndex >= 2) checks.push(pending.enrichment.duplicateCheck);
      return checks;
    }
    function deliveredResult(pending) {
      return {
        checks: [pending.capture.readCheck, pending.understanding.chopCheck,
          pending.enrichment.duplicateCheck, pending.understanding.overrideCheck],
        verdict: pending.enrichment.verdict,
        fields: pending.capture.fields
      };
    }
    function drawMeter(fields) {
      if (!fields) {
        meterVal.textContent = "–";
        meterBar.firstChild.style.width = "0%";
        meter.classList.remove("is-partial");
        return;
      }
      meterVal.textContent = fields.read + " of " + fields.total;
      meterBar.firstChild.style.width = (fields.read / fields.total * 100) + "%";
      meter.classList.toggle("is-partial", fields.read < fields.total);
    }

    /* ---------- zone 4: rules panel ---------- */
    var rulesPanel = el("dialog", "dw-rules");
    rulesPanel.id = "dw-rules-dialog";
    rulesPanel.hidden = true;
    rulesPanel.setAttribute("role", "dialog");
    rulesPanel.setAttribute("aria-modal", "true");
    rulesPanel.setAttribute("aria-labelledby", "dw-rules-title");
    var rulesTitle = el("h4", null, "Rules & Checks");
    rulesTitle.id = "dw-rules-title";
    rulesPanel.appendChild(rulesTitle);
    var rl = el("ol");
    RULE_TEXT.forEach(function (t) { rl.appendChild(el("li", null, t)); });
    rulesPanel.appendChild(rl);
    var rulesClose = modalClose("dw-rules-close");
    rulesClose.type = "button";
    rulesPanel.appendChild(rulesClose);
    frameModal(rulesPanel, rulesTitle, rulesClose);
    desk.appendChild(rulesPanel);

    function toggleRules(open) {
      rulesTab.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) openOverlay(rulesPanel, rulesTab, rulesClose);
      else closeOverlay(rulesPanel);
    }
    rulesTab.addEventListener("click", function () { toggleRules(rulesPanel.hidden); });
    rulesClose.addEventListener("click", function () { toggleRules(false); });

    /* ---------- zone 5: the pipeline panel ---------- */
    var pipe = el("div", "dw-pipe");
    pipe.setAttribute("aria-label", "Intelligence Pipeline");
    /* The brass plate is ~82px wide at the width this site is read at, and
       "Intelligence Pipeline" overflowed it by 11px at any legible size. The
       full name is the panel's aria-label, as with the console's. */
    pipe.appendChild(el("h4", "dw-pipe-title", "Pipeline"));
    var pipeRows = [];
    STAGES.forEach(function (s, i) {
      var r = el("button", "dw-stage");
      r.type = "button";
      r.appendChild(el("span", "dw-stage-no", String(i + 1)));
      var t = el("span", "dw-stage-text");
      t.appendChild(el("b", null, s[0]));
      t.appendChild(el("small", null, s[1]));
      r.appendChild(t);
      r.appendChild(el("span", "dw-stage-state", "Waiting"));
      var explanation = el("span", "dw-stage-tooltip", STAGE_HELP[i]);
      explanation.id = "dw-stage-help-" + i;
      explanation.setAttribute("role", "tooltip");
      explanation.hidden = true;
      r.setAttribute("aria-describedby", explanation.id);
      r.appendChild(explanation);
      function showExplanation() { explanation.hidden = false; }
      function hideExplanation() { explanation.hidden = true; }
      r.addEventListener("mouseenter", showExplanation);
      r.addEventListener("focus", showExplanation);
      r.addEventListener("click", showExplanation);
      r.addEventListener("mouseleave", function () {
        if (document.activeElement !== r) hideExplanation();
      });
      r.addEventListener("blur", hideExplanation);
      r.addEventListener("keydown", function (event) {
        if (event.key === "Escape") { event.preventDefault(); hideExplanation(); }
      });
      pipe.appendChild(r);
      pipeRows.push(r);
    });
    desk.appendChild(pipe);

    function stage(n) {
      pipeRows.forEach(function (r, i) {
        r.classList.toggle("is-live", i === n);
        r.classList.toggle("is-done", i < n);
        var state = i === n ? "Active" : i < n ? "Done" : "Waiting";
        r.querySelector(".dw-stage-state").textContent = state;
        r.setAttribute("aria-label", STAGES[i][0] + ": " + state);
      });
    }

    /* ---------- zone 6: gauge and status ---------- */
    var gauge = el("div", "dw-gauge");
    /* The painting and every overlay live in one aspect-locked box so the
       overlays' measured percentages stay true when the cell is taller than
       the art (the cell now stretches to the pipeline's base, 2026-09-17). */
    var gaugeArt = el("div", "dw-gauge-art");
    var needle = el("span", "dw-needle");
    gaugeArt.appendChild(needle);
    var plate = el("div", "dw-plate");
    plate.appendChild(el("span", "dw-plate-label", "Pipeline Status"));
    var plateVal = el("b", "dw-plate-val", "Idle");
    plate.appendChild(plateVal);
    var leds = el("span", "dw-leds");
    for (var i = 0; i < 3; i++) leds.appendChild(el("i"));
    gaugeArt.appendChild(plate);
    gaugeArt.appendChild(leds);
    gauge.appendChild(gaugeArt);
    desk.appendChild(gauge);

    function setStatus(text, pct, cls) {
      plateVal.textContent = text;
      needle.style.transform = "rotate(" + (-120 + pct * 2.4) + "deg)";
      gauge.className = "dw-gauge" + (cls ? " is-" + cls : "");
    }

    /* The state setter is the single authority for every machine surface. */
    var MACHINE_STATES = ["idle", "ready", "running", "complete", "complete-with-exceptions"];
    function setMachineState(name, detail) {
      if (MACHINE_STATES.indexOf(name) < 0) throw new Error("Unknown machine state: " + name);
      var isComplete = name.indexOf("complete") === 0;
      var stageIndex = -1;
      if (name === "running") {
        STAGES.some(function (item, index) {
          if (detail.indexOf("Running: " + item[0]) !== 0) return false;
          stageIndex = index;
          return true;
        });
      } else if (isComplete) {
        stageIndex = pipeRows.length;
      }
      stage(stageIndex);
      if (name === "running" && stageIndex >= 0 && stageIndex !== loggedStage) {
        loggedStage = stageIndex;
        logProgress("Stage " + (stageIndex + 1) + " of " + STAGES.length + ": " + STAGES[stageIndex][0]);
      } else if (isComplete) {
        logProgress(detail);
      }
      var gaugeText = name === "running" ? "Running" :
        name === "complete-with-exceptions" ? "Review" :
        name === "complete" ? "Complete" : "Idle";
      var gaugeClass = name === "running" ? "busy" :
        name === "complete-with-exceptions" ? "warn" :
        name === "complete" ? "ok" : "";
      var pct = isComplete ? 100 : name === "running" ? 10 + Math.max(0, stageIndex) * 28 : 0;

      desk.dataset.state = name;
      running = name === "running";
      runBtn.textContent = running ? "Inspecting…" : isComplete ? "Run Again" : "Run Inspection";
      boot.className = "dw-boot";
      boot.textContent = detail;
      /* The progress log is the live owner for stages and outcomes. Keep the
         status region for user actions and non-running readiness changes. */
      if (name !== "running" && !isComplete) say(detail);
      console_.classList.toggle("is-busy", name === "running");
      console_.classList.toggle("is-done", name === "complete");
      console_.classList.toggle("is-review", name === "complete-with-exceptions");
      setStatus(gaugeText, pct, gaugeClass);
      syncMachineControls();
    }

    function prepareReady(detail) {
      if (running) return;
      results = {};
      drawChecks(NEUTRAL_CHECKS);
      drawMeter(null);
      [].forEach.call(crateList.querySelectorAll(".dw-stamp"), function (stamp) {
        stamp.textContent = "";
        stamp.className = "dw-stamp";
      });
      [].forEach.call(crateList.querySelectorAll(".dw-badge"), function (badge) {
        badge.textContent = "";
        badge.removeAttribute("aria-label");
      });
      resetSticky();
      setMachineState("ready", detail);
    }

    /* ---------- the sticky note ---------- */
    var sticky = el("button", "dw-sticky", "");
    sticky.type = "button";
    sticky.appendChild(el("span", "dw-sticky-text", "Exceptions after run"));
    var stickyCount = el("span", "dw-sticky-count", "0");
    stickyCount.hidden = true;
    sticky.appendChild(stickyCount);
    sticky.disabled = true;
    sticky.setAttribute("aria-label", "Exceptions are available after a run");
    desk.appendChild(ledgerToggle);
    desk.appendChild(sticky);

    /* ---------- the run report ---------- */
    var report = el("dialog", "dw-report");
    report.id = "dw-run-report";
    report.hidden = true;
    report.setAttribute("role", "dialog");
    report.setAttribute("aria-modal", "true");
    desk.appendChild(report);

    /* ---------- the lightbox: the current order, enlarged ---------- */
    var lightbox = el("dialog", "dw-lightbox dw-modal--document");
    var lightboxTitle = el("h4", "dw-modal-title", "Delivery order, enlarged");
    lightbox.appendChild(lightboxTitle);
    lightbox.hidden = true;
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Delivery order, enlarged");
    var lightboxSheet = el("div", "dw-lightbox-sheet");
    lightbox.appendChild(lightboxSheet);
    var lightboxActions = el("div", "dw-lightbox-actions");
    var lightboxRescan = el("button", "dw-lightbox-rescan", "Rescan");
    lightboxRescan.type = "button";
    var lightboxClose = modalClose("dw-lightbox-close");
    lightboxClose.type = "button";
    lightboxActions.appendChild(lightboxRescan);
    lightboxActions.appendChild(lightboxClose);
    lightbox.appendChild(lightboxActions);
    frameModal(lightbox, lightboxTitle, lightboxClose);
    desk.appendChild(lightbox);

    function openLightbox() {
      if (running) return;
      var f = current();
      lightboxSheet.innerHTML = "";
      lightboxSheet.appendChild(renderDoc(f));
      var canRescan = !!results[f.id] && results[f.id].verdict.status === "Needs Review";
      lightboxRescan.disabled = !canRescan;
      lightboxRescan.title = canRescan ? "Rescan " + displayFilename(f) : "Nothing to recover";
      openOverlay(lightbox, magnify, lightboxClose);
    }
    magnify.addEventListener("click", openLightbox);
    lightboxClose.addEventListener("click", function () { closeOverlay(lightbox); });
    lightboxRescan.addEventListener("click", function () {
      var id = focusId;
      closeOverlay(lightbox);
      rescan(id);
    });
    /* Backdrop, Escape and Close handling is shared by frameModal. */

    var activeOverlay = null;
    var overlayBackground = [];
    function setOverlayBackground(panel, makeInert) {
      if (!makeInert) {
        overlayBackground.forEach(function (item) {
          item.node.inert = item.wasInert;
          if (item.hadAriaHidden) item.node.setAttribute("aria-hidden", item.ariaHidden);
          else item.node.removeAttribute("aria-hidden");
        });
        overlayBackground = [];
        return;
      }
      function isolate(node) {
        /* Status narration remains exposed alongside the modal. It is not
           interactive, so exempting only this node preserves focus isolation. */
        if (node === live || node === progressLog) return;
        if (overlayBackground.some(function (item) { return item.node === node; })) return;
        overlayBackground.push({
          node: node,
          wasInert: !!node.inert,
          hadAriaHidden: node.hasAttribute("aria-hidden"),
          ariaHidden: node.getAttribute("aria-hidden")
        });
        node.inert = true;
        node.setAttribute("aria-hidden", "true");
      }
      /* Isolate siblings at every ancestor level: direct desk zones, the
         mounted host's siblings, and the surrounding page branches through
         body. The dialog's own ancestry stays available. */
      var branch = panel;
      while (branch && branch !== document.body) {
        var parent = branch.parentElement;
        if (!parent) break;
        [].forEach.call(parent.children, function (sibling) {
          if (sibling !== branch) isolate(sibling);
        });
        branch = parent;
      }
    }
    function enforceOverlayFocus(event) {
      if (!document.contains(desk)) {
        activeOverlay = null;
        setOverlayBackground(null, false);
        document.removeEventListener("focusin", enforceOverlayFocus, true);
        return;
      }
      if (!activeOverlay || activeOverlay.contains(event.target)) return;
      (overlayStops(activeOverlay)[0] || activeOverlay).focus();
    }
    document.addEventListener("focusin", enforceOverlayFocus, true);
    var overlayCleanup = new MutationObserver(function () {
      if (document.contains(desk)) return;
      clearTimeout(feedbackTimer);
      feedback.remove();
      activeOverlay = null;
      setOverlayBackground(null, false);
      document.removeEventListener("focusin", enforceOverlayFocus, true);
      overlayCleanup.disconnect();
    });
    overlayCleanup.observe(document.body, { childList: true, subtree: true });

    function overlayStops(panel) {
      return [].slice.call(panel.querySelectorAll("button, [href], input, select, textarea, [tabindex]"))
        .filter(function (node) { return !node.disabled && node.tabIndex >= 0; });
    }
    function syncMachineControls() {
      var locked = running;
      var empty = includedCount() === 0;
      runBtn.disabled = locked || empty;
      runHint.hidden = !empty;
      if (empty) runBtn.setAttribute("aria-describedby", runHint.id);
      else runBtn.removeAttribute("aria-describedby");
      addBtn.disabled = locked;
      magnify.disabled = locked;
      [].forEach.call(crateList.querySelectorAll("button, input"), function (control) { control.disabled = locked; });
      sticky.disabled = locked || sticky.dataset.available !== "true";
    }
    function overlayName(panel) {
      if (panel === helpPanel) return "How to play";
      if (panel === ledger) return "run ledger";
      if (panel === rulesPanel) return "Rules & Checks";
      if (panel === lightbox) return "enlarged delivery order";
      return "run report";
    }
    function closeOverlay(panel) {
      if (panel.hidden) return;
      panel.hidden = true;
      panel.removeEventListener("keydown", trapOverlay);
      if (activeOverlay === panel) {
        activeOverlay = null;
        setOverlayBackground(panel, false);
      }
      if (panel.open && typeof panel.close === "function") panel.close();
      var trigger = panel._dwTrigger;
      panel._dwTrigger = null;
      if (trigger && document.contains(trigger)) trigger.focus({ preventScroll: true });
      say("Closed " + overlayName(panel));
    }
    function trapOverlay(event) {
      var panel = event.currentTarget;
      if (event.key === "Escape") {
        event.preventDefault();
        if (panel === rulesPanel) rulesTab.setAttribute("aria-expanded", "false");
        closeOverlay(panel);
        return;
      }
      if (event.key !== "Tab") return;
      var stops = overlayStops(panel);
      if (!stops.length) return;
      var first = stops[0];
      var last = stops[stops.length - 1];
      if ((event.shiftKey && document.activeElement === first) ||
          (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
    function openOverlay(panel, trigger, focusTarget) {
      if (activeOverlay && activeOverlay !== panel) closeOverlay(activeOverlay);
      panel._dwTrigger = trigger;
      panel.hidden = false;
      activeOverlay = panel;
      if (typeof panel.showModal === "function" && !panel.open) panel.showModal();
      setOverlayBackground(panel, true);
      panel.addEventListener("keydown", trapOverlay);
      (focusTarget || overlayStops(panel)[0] || panel).focus({ preventScroll: true });
      say("Opened " + overlayName(panel));
    }
    function resetSticky() {
      delete sticky.dataset.available;
      stickyCount.hidden = true;
      stickyCount.textContent = "0";
      sticky.classList.remove("is-clear");
      sticky.querySelector(".dw-sticky-text").textContent = "Exceptions after run";
      sticky.setAttribute("aria-label", "Exceptions are available after a run");
      closeOverlay(report);
      closeOverlay(lightbox);
      syncMachineControls();
    }
    function reviewFiles(run) {
      return run.filter(function (f) {
        return results[f.id] && results[f.id].verdict.status === "Needs Review";
      });
    }
    function showExceptionSummary(run) {
      var review = reviewFiles(run);
      var summary = RULES.reviewSummary(review);
      var count = summary.orders;
      var label = RULES.reviewLabel(summary);
      sticky.dataset.available = "true";
      stickyCount.hidden = false;
      stickyCount.textContent = String(count);
      sticky.classList.toggle("is-clear", count === 0);
      sticky.querySelector(".dw-sticky-text").textContent = label;
      sticky.setAttribute("aria-label", label + " - open the run report");
      syncMachineControls();
      return review;
    }
    sticky.addEventListener("click", function () {
      if (!sticky.disabled) openOverlay(report, sticky, report.querySelector(".dw-report-close"));
    });

    /* ============================================================
       the run
       ============================================================ */
    async function runAll() {
      if (running) return;
      var restoreRunFocus = document.activeElement === runBtn;
      var run = files.filter(function (f) { return picked[f.id]; });
      if (!run.length) {
        setMachineState("ready", "Select at least one order before inspection");
        return;
      }
      var runFocusMoved = false;
      function noteRunFocusMove(event) {
        if (event.target !== runBtn && event.target !== document.body &&
            event.target !== document.documentElement) runFocusMoved = true;
      }
      if (restoreRunFocus) document.addEventListener("focusin", noteRunFocusMove, true);
      report.hidden = true;
      closeOverlay(lightbox);
      results = {};
      resetProgress();
      drawCrate();
      setMachineState("running", "Running: Capture — preparing " + run.length + " selected orders");

      /* the trigger beat, moved here from the old Teams tab - it
         is what the green button is wired to. It stays within Capture so a
         running machine always has one visible active pipeline stage. */
      await sleep(45 * "start_dorename".length);
      await sleep(reduced() ? 0 : 320);

      var pending = {};
      setMachineState("running", "Running: Capture");
      for (var i = 0; i < run.length; i++) {
        var f = run[i];
        focus(f.id, true);
        pending[f.id] = { capture: RULES.capture(f) };
        drawChecks(checksForStage(phaseChecks(pending[f.id], 0), 0));
        drawMeter(pending[f.id].capture.fields);
        setMachineState("running", "Running: Capture — " + displayFilename(f));
        await sleep(120);
      }

      setMachineState("running", "Running: Understand");
      for (var u = 0; u < run.length; u++) {
        var understood = run[u];
        focus(understood.id, true);
        pending[understood.id].understanding = RULES.understand(understood);
        drawChecks(checksForStage(phaseChecks(pending[understood.id], 1), 1));
        drawMeter(pending[understood.id].capture.fields);
        setMachineState("running", "Running: Understand — " + displayFilename(understood));
        await sleep(120);
      }

      setMachineState("running", "Running: Enrich");
      for (var e = 0; e < run.length; e++) {
        var enriched = run[e];
        focus(enriched.id, true);
        pending[enriched.id].enrichment = RULES.enrich(enriched, run, pending[enriched.id].understanding);
        drawChecks(checksForStage(phaseChecks(pending[enriched.id], 2), 2));
        drawMeter(pending[enriched.id].capture.fields);
        setMachineState("running", "Running: Enrich — " + displayFilename(enriched));
        await sleep(120);
      }

      setMachineState("running", "Running: Deliver");
      for (var d = 0; d < run.length; d++) {
        var delivered = run[d];
        results[delivered.id] = deliveredResult(pending[delivered.id]);
        logVerdict(delivered);
        focus(delivered.id, true);
        drawChecks(checksForStage(results[delivered.id].checks, 3));
        drawMeter(results[delivered.id].fields);
        drawCrate();
        setMachineState("running", "Running: Deliver — " + displayFilename(delivered));
        await sleep(120);
      }

      buildReport(run);
      var bad = showExceptionSummary(run);
      setMachineState(bad.length ? "complete-with-exceptions" : "complete",
        bad.length ? "Review: " + RULES.reviewLabel(RULES.reviewSummary(bad)) :
          "Complete: all " + run.length + " orders processed");
      if (restoreRunFocus) document.removeEventListener("focusin", noteRunFocusMove, true);
      if (restoreRunFocus && !runFocusMoved && document.contains(runBtn) &&
          (document.activeElement === document.body || document.activeElement === document.documentElement)) {
        runBtn.focus();
      }
    }
    runBtn.addEventListener("click", function () { runAll(); });

    /* ---------- rescan: the recovery path ---------- */
    async function rescan(id) {
      if (running) return;
      var f = files.filter(function (x) { return x.id === id; })[0];
      if (!f) return;
      var was = results[f.id];
      if (!was || was.verdict.status !== "Needs Review") {
        setMachineState(desk.dataset.state || "ready",
          displayFilename(f) + " has nothing to recover");
        return;
      }
      resetProgress();
      setMachineState("running", "Running: Capture — preparing recovered " + displayFilename(f));
      /* The returned document is a new scan, not a silent mutation of the
         problematic original. Keep the original in the queue for the audit
         trail, exclude it from the next report, and move focus to its recovery. */
      var recovered = Object.assign({}, f, {
        id: f.id + "_rescanned_" + (files.length + 1), marks: "both"
      });
      files.push(recovered);
      picked[f.id] = false;
      picked[recovered.id] = true;
      focus(recovered.id, true);
      var run = files.filter(function (x) { return picked[x.id]; });
      /* Recovery follows the same phase boundary as a normal run. It must not
         call the composite helper, because the visible machine owns Capture,
         Understand, Enrich, and Deliver separately. */
      var recovery = { capture: RULES.capture(recovered) };
      drawChecks(checksForStage(phaseChecks(recovery, 0), 0));
      drawMeter(recovery.capture.fields);
      setMachineState("running", "Running: Capture — " + displayFilename(recovered));
      await sleep(120);

      recovery.understanding = RULES.understand(recovered);
      drawChecks(checksForStage(phaseChecks(recovery, 1), 1));
      drawMeter(recovery.capture.fields);
      setMachineState("running", "Running: Understand — " + displayFilename(recovered));
      await sleep(120);

      recovery.enrichment = RULES.enrich(recovered, run, recovery.understanding);
      drawChecks(checksForStage(phaseChecks(recovery, 2), 2));
      drawMeter(recovery.capture.fields);
      setMachineState("running", "Running: Enrich — " + displayFilename(recovered));
      await sleep(120);

      var r = deliveredResult(recovery);
      results[recovered.id] = r;
      logVerdict(recovered);
      drawChecks(checksForStage(r.checks, 3));
      drawMeter(r.fields);
      setMachineState("running", "Running: Deliver — " + displayFilename(recovered));
      await sleep(120);
      drawCrate();
      buildReport(run);
      var bad = showExceptionSummary(run);
      setMachineState(bad.length ? "complete-with-exceptions" : "complete",
        bad.length ? "Review: " + RULES.reviewLabel(RULES.reviewSummary(bad)) :
          "Complete: " + recovered.num + " recovered after rescan");
    }

    /* ---------- the report: the emailed sheet, on the desk ---------- */
    function buildReport(run) {
      report.innerHTML = "";
      report.setAttribute("aria-labelledby", "dw-report-title");

      var bad = reviewFiles(run);
      var summaryLabel = RULES.reviewLabel(RULES.reviewSummary(bad));
      var head = el("div", "dw-report-head");
      var reportTitle = el("h4", null, "Inspection report");
      var reportSubject = el("p", "dw-report-subject", bad.length
        ? "[DO Rename] " + summaryLabel + " - " + run.length + " scan(s) processed"
        : "[DO Rename] " + run.length + " scan(s) processed - no orders need review");
      reportTitle.id = "dw-report-title";
      head.appendChild(reportTitle);
      head.appendChild(reportSubject);
      head.appendChild(el("span", null, "to: operations@mock-co.example"));
      var close = modalClose("dw-report-close");
      close.type = "button";
      close.addEventListener("click", function () { closeOverlay(report); });
      head.appendChild(close);
      report.appendChild(head);

      report.appendChild(el("h5", null, "Scan result sheet"));
      var t = el("table", "dw-sheet");
      var hr = el("tr");
      ["DO No", "Status", "Remark"].forEach(function (h) { hr.appendChild(el("th", null, h)); });
      t.appendChild(hr);
      run.forEach(function (f) {
        var v = results[f.id].verdict;
        var tr = el("tr", v.cls);
        tr.appendChild(el("td", null, f.num));
        tr.appendChild(el("td", null, v.status));
        tr.appendChild(el("td", null, v.remark));
        t.appendChild(tr);
      });
      report.appendChild(t);

      if (bad.length) {
        report.appendChild(el("h5", null, "Problematic DO folder - tracking list"));
        var tt = el("table", "dw-sheet");
        var th = el("tr");
        ["DO No", "Issue", "Recovery"].forEach(function (h) { th.appendChild(el("th", null, h)); });
        tt.appendChild(th);
        bad.forEach(function (f) {
          var tr = el("tr", "warn");
          tr.appendChild(el("td", null, f.num));
          tr.appendChild(el("td", null, "missing chop & sign"));
          var td = el("td");
          var fix = el("button", "dw-fix", "Customer chopped it - rescan");
          fix.type = "button";
          fix.addEventListener("click", function () { closeOverlay(report); rescan(f.id); });
          td.appendChild(fix);
          tr.appendChild(td);
          tt.appendChild(tr);
        });
        report.appendChild(tt);
      }

      report.appendChild(el("p", "dw-verdict", (run.length - bad.length) +
        " scan(s) handled automatically. " + summaryLabel + ". Humans review the exceptions."));
      frameModal(report, reportTitle, close);
    }

    /* ---------- first paint ---------- */
    drawCrate();
    showDoc();
    drawChecks(NEUTRAL_CHECKS);
    drawMeter(null);
    setMachineState("idle", "Select orders, then run inspection");
  }

  window.PORTFOLIO_DO_WORKBENCH = {
    mount: mount, RULES: RULES, FILES: FILES, displayFilename: displayFilename
  };
})();
