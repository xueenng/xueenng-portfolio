/* ============================================================
   resume.js - renders the ATS résumé from content.resume.
   Same load rule as app.js: localStorage override -> content.js
   default, so the admin portal's saved edits show here too.
   "Download PDF" = window.print() (print CSS emits only the sheet)
   - real selectable text, ATS-parseable, zero dependencies.
   ============================================================ */
(function () {
  "use strict";

  var LS_KEY = "portfolio.content";

  function loadContent() {
    var base = window.PORTFOLIO_CONTENT;
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        if (saved && saved.identity) {
          // résumé block was added after some saved edits - backfill from file
          if (!saved.resume && base.resume) saved.resume = base.resume;
          return saved;
        }
      }
    } catch (e) {}
    return base;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function section(root, title) {
    root.appendChild(el("h2", null, title));
  }
  function projectTitle(content, p) {
    if (p.title) return p.title;
    var hit = (content.projects || []).filter(function (x) { return x.id === p.id; })[0];
    return hit ? hit.title : p.id;
  }
  function bulletList(root, bullets) {
    if (!bullets || !bullets.length) return;
    var ul = el("ul");
    bullets.forEach(function (b) { if (b) ul.appendChild(el("li", null, b)); });
    if (ul.childNodes.length) root.appendChild(ul);
  }
  function entryRow(root, left, right) {
    var row = el("div", "r-row");
    row.appendChild(el("span", "r-role", left));
    if (right) row.appendChild(el("span", "r-period", right));
    root.appendChild(row);
  }

  function render() {
    var content = loadContent();
    var r = content.resume;
    var id = content.identity || {};
    var root = document.getElementById("resume-root");
    root.innerHTML = "";
    document.title = (id.name || "Résumé") + " — Résumé";

    if (!r) {
      root.appendChild(el("p", "r-empty", "No résumé has been set up yet. Open the admin portal to build one."));
      return;
    }

    var sheet = el("div", "sheet");

    // header
    sheet.appendChild(el("div", "r-name", id.name || ""));
    var contactBits = [];
    if (id.location) contactBits.push(id.location);
    if (r.phone) contactBits.push(r.phone);
    if (id.email) contactBits.push(id.email);
    sheet.appendChild(el("div", "r-contact", contactBits.join("  •  ")));
    if (r.headline || r.graduation) {
      var tag = el("div", "r-tag");
      tag.appendChild(document.createTextNode(r.headline || ""));
      if (r.headline && r.graduation) tag.appendChild(document.createTextNode("  •  "));
      if (r.graduation) { var g = el("span", null, r.graduation); tag.appendChild(g); }
      sheet.appendChild(tag);
    }

    // objective
    if (r.objective) {
      section(sheet, "Career Objective");
      sheet.appendChild(el("p", "r-objective", r.objective));
    }

    // working experience
    if (r.experience && r.experience.length) {
      section(sheet, "Working Experience");
      r.experience.forEach(function (e) {
        var entry = el("div", "r-entry");
        entryRow(entry, e.role || "", e.period || "");
        if (e.org) entry.appendChild(el("div", "r-org", e.org));
        bulletList(entry, e.bullets);
        sheet.appendChild(entry);
      });
    }

    // projects or assignments (only the selected ones, in order)
    if (r.projects && r.projects.length) {
      section(sheet, "Projects or Assignments");
      r.projects.forEach(function (p) {
        var entry = el("div", "r-entry");
        entryRow(entry, projectTitle(content, p), p.period || "");
        bulletList(entry, p.bullets);
        sheet.appendChild(entry);
      });
    }

    // education
    if (r.education && r.education.length) {
      section(sheet, "Education");
      r.education.forEach(function (e) {
        var entry = el("div", "r-entry");
        entryRow(entry, e.degree || "", e.period || "");
        if (e.org) entry.appendChild(el("div", "r-org", e.org));
        if (e.note) entry.appendChild(el("div", "r-note", e.note));
        sheet.appendChild(entry);
      });
    }

    // additional information
    if (r.additional && r.additional.length) {
      section(sheet, "Additional Information");
      r.additional.forEach(function (a) {
        if (!a || (!a.label && !a.value)) return;
        var line = el("div", "r-add");
        line.appendChild(el("b", null, (a.label || "") + ":"));
        line.appendChild(document.createTextNode(" " + (a.value || "")));
        sheet.appendChild(line);
      });
    }

    root.appendChild(sheet);
  }

  /* ---------- one-click PDF (self-contained generator, no print dialog) ----- */
  var INK = [0.11, 0.10, 0.08], INK2 = [0.29, 0.27, 0.23],
      ACCENT = [0.72, 0.47, 0.10], LINE = [0.81, 0.78, 0.70];

  function downloadPdf() {
    if (!window.PORTFOLIO_PDF) { window.print(); return; }
    var content = loadContent(), r = content.resume, id = content.identity || {};
    if (!r) { window.print(); return; }

    var doc = window.PORTFOLIO_PDF.create();
    var L = 44, R = doc.W - 44, TOP = 46, BOT = 46, CW = R - L;
    var y = TOP;
    function room(need) { if (y + need > doc.H - BOT) { doc.addPage(); y = TOP; } }
    function line(str, opt, lh) { doc.text(str, L, y, opt); y += (lh || 13); }
    function para(str, opt, lh, maxW, x) {
      var lines = doc.wrap(str, opt && opt.font, (opt && opt.size) || 9.5, maxW || CW);
      lines.forEach(function (ln) { room(lh || 12.5); doc.text(ln, x != null ? x : L, y, opt); y += (lh || 12.5); });
    }
    function section(title) {
      y += 7; room(20);
      doc.text(title.toUpperCase(), L, y, { font: "bold", size: 9, color: ACCENT, tracking: 1.1 });
      y += 4; doc.rule(L, y, R, LINE); y += 11;
    }
    function headRow(left, right) {
      room(13);
      doc.text(left, L, y, { font: "bold", size: 10.5, color: INK });
      if (right) doc.text(right, R, y, { size: 8.5, color: INK2, align: "right" });
      y += 12.5;
    }
    function bullets(arr) {
      (arr || []).forEach(function (b) {
        if (!b) return;
        var lines = doc.wrap(b, null, 9.5, CW - 14);
        room(lines.length * 12.5);
        doc.text("•", L + 2, y, { size: 9.5, color: ACCENT });
        lines.forEach(function (ln) { doc.text(ln, L + 14, y, { size: 9.5, color: INK }); y += 12.5; });
        y += 1.5;
      });
    }

    // header
    doc.text(id.name || "", L, y, { font: "bold", size: 19, color: INK }); y += 23;
    var contactBits = [];
    if (id.location) contactBits.push(id.location);
    if (r.phone) contactBits.push(r.phone);
    if (id.email) contactBits.push(id.email);
    line(contactBits.join("  •  "), { size: 9, color: INK2 }, 13);
    if (r.headline || r.graduation) {
      room(14);
      var hx = L;
      if (r.headline) hx += doc.text(r.headline, hx, y, { font: "bold", size: 9.6, color: INK });
      if (r.headline && r.graduation) hx += doc.text("  •  ", hx, y, { size: 9.6, color: INK2 });
      if (r.graduation) doc.text(r.graduation, hx, y, { size: 9.6, color: ACCENT });
      y += 14;
    }

    if (r.objective) { section("Career Objective"); para(r.objective, { size: 9.5, color: INK }, 12.8); }

    if (r.experience && r.experience.length) {
      section("Working Experience");
      r.experience.forEach(function (e) {
        headRow(e.role || "", e.period || "");
        if (e.org) para(e.org, { font: "ital", size: 9, color: INK2 }, 11.5);
        bullets(e.bullets); y += 3;
      });
    }
    if (r.projects && r.projects.length) {
      section("Projects or Assignments");
      r.projects.forEach(function (p) {
        headRow(projectTitle(content, p), p.period || "");
        bullets(p.bullets); y += 3;
      });
    }
    if (r.education && r.education.length) {
      section("Education");
      r.education.forEach(function (e) {
        headRow(e.degree || "", e.period || "");
        if (e.org) para(e.org, { font: "ital", size: 9, color: INK2 }, 11.5);
        if (e.note) para(e.note, { size: 9, color: INK }, 12);
        y += 3;
      });
    }
    if (r.additional && r.additional.length) {
      section("Additional Information");
      var labelW = 118;
      r.additional.forEach(function (a) {
        if (!a || (!a.label && !a.value)) return;
        room(12.5);
        doc.text((a.label || "") + ":", L, y, { font: "bold", size: 9, color: INK });
        var vlines = doc.wrap(a.value || "", null, 9, CW - labelW);
        vlines.forEach(function (ln, i) {
          if (i > 0) { room(11.5); }
          doc.text(ln, L + labelW, y, { size: 9, color: INK2 });
          y += 11.5;
        });
        y += 1.5;
      });
    }

    var fname = (id.name || "Resume").replace(/[^A-Za-z0-9]+/g, "_") + "_Resume.pdf";
    doc.save(fname);
  }

  document.addEventListener("DOMContentLoaded", function () {
    render();
    var dl = document.getElementById("r-download");
    if (dl) dl.addEventListener("click", downloadPdf);
    var pr = document.getElementById("r-print");
    if (pr) pr.addEventListener("click", function () { window.print(); });
  });

  window.PORTFOLIO_RESUME = { render: render, downloadPdf: downloadPdf };
})();
