/* ============================================================
   pdf.js - a tiny, self-contained PDF writer (no dependencies).
   Enough for a text résumé: the three standard Helvetica faces
   (no font embedding needed), accurate line wrapping via the
   built-in AFM width tables, horizontal rules, right-alignment,
   colour, and multi-page output -> a real downloadable A4 file
   with SELECTABLE text (ATS-parseable), built entirely in the
   browser. Layout lives in the caller (resume.js); this module
   is a low-level drawing surface only.

   API:  var doc = PORTFOLIO_PDF.create();
         doc.text(str, x, yTop, {font,size,color,align,tracking});
         doc.rule(x1, yTop, x2, color);
         doc.wrap(str, font, size, maxW) -> [lines];
         doc.width(str, font, size);
         doc.addPage(); doc.save("name.pdf");
         doc.W / doc.H  (A4 points)
   Coordinates are TOP-DOWN in points (y=0 at the page top).
   ============================================================ */
(function () {
  "use strict";

  var PW = 595.28, PH = 841.89;   // A4 in PDF points

  // unicode -> WinAnsi byte for the few non-ASCII glyphs a résumé uses
  var WIN = { 0x2022: 0x95, 0x00B7: 0xB7, 0x2013: 0x96, 0x2014: 0x97,
    0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94,
    0x00E9: 0xE9, 0x00E8: 0xE8, 0x00A0: 0x20 };

  function parseW(str) { return str.trim().split(/\s+/).map(Number); }
  // Helvetica + Helvetica-Bold advance widths (per 1000 em), bytes 32..126
  var REG = parseW("278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 333 556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584");
  var BOLD = parseW("278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 333 333 584 584 584 611 975 722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556 333 556 611 556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 500 389 280 389 584");
  var SPEC_R = { 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x95: 350, 0x96: 556, 0x97: 1000, 0xB7: 278, 0xE9: 556, 0xE8: 556 };
  var SPEC_B = { 0x91: 238, 0x92: 238, 0x93: 500, 0x94: 500, 0x95: 350, 0x96: 556, 0x97: 1000, 0xB7: 278, 0xE9: 611, 0xE8: 611 };

  function byteOf(ch) {
    var c = ch.charCodeAt(0);
    if (WIN[c] !== undefined) return WIN[c];
    return c < 256 ? c : 63;   // '?'
  }
  function glyphW(b, bold) {
    if (b >= 32 && b <= 126) return (bold ? BOLD : REG)[b - 32];
    var s = bold ? SPEC_B : SPEC_R;
    return s[b] != null ? s[b] : 556;
  }
  function widthOf(str, font, size) {
    var bold = font === "bold", w = 0;
    for (var i = 0; i < str.length; i++) w += glyphW(byteOf(str[i]), bold);
    return w / 1000 * size;
  }
  function wrap(str, font, size, maxW) {
    var words = String(str).split(/\s+/).filter(Boolean), lines = [], cur = "";
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + " " + words[i] : words[i];
      if (!cur || widthOf(test, font, size) <= maxW) cur = test;
      else { lines.push(cur); cur = words[i]; }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  }
  function pdfStr(str) {
    var out = "";
    for (var i = 0; i < str.length; i++) {
      var b = byteOf(str[i]);
      if (b === 40 || b === 41 || b === 92) out += "\\" + String.fromCharCode(b);
      else if (b < 32 || b > 126) out += "\\" + ("00" + b.toString(8)).slice(-3);
      else out += String.fromCharCode(b);
    }
    return out;
  }
  function n2(x) { return (Math.round(x * 100) / 100).toString(); }

  function create() {
    var pages = [""], cur = 0;
    function emit(s) { pages[cur] += s; }
    function fontRef(f) { return f === "bold" ? "/F2" : f === "ital" ? "/F3" : "/F1"; }

    function text(str, x, yTop, opt) {
      opt = opt || {};
      var size = opt.size || 9.5, col = opt.color || [0.11, 0.10, 0.08];
      var w = widthOf(str, opt.font, size);
      var xx = opt.align === "right" ? x - w : (opt.align === "center" ? x - w / 2 : x);
      var y = PH - yTop;
      emit("q BT " + fontRef(opt.font) + " " + size + " Tf " +
        n2(col[0]) + " " + n2(col[1]) + " " + n2(col[2]) + " rg " +
        (opt.tracking ? n2(opt.tracking) + " Tc " : "") +
        "1 0 0 1 " + n2(xx) + " " + n2(y) + " Tm (" + pdfStr(str) + ") Tj ET Q\n");
      return w;
    }
    function rule(x1, yTop, x2, col) {
      col = col || [0.81, 0.78, 0.70];
      var y = PH - yTop;
      emit("q " + n2(col[0]) + " " + n2(col[1]) + " " + n2(col[2]) + " RG 0.6 w " +
        n2(x1) + " " + n2(y) + " m " + n2(x2) + " " + n2(y) + " l S Q\n");
    }
    function addPage() { pages.push(""); cur = pages.length - 1; }

    function save(filename) {
      var objs = {}, maxObj = 5 + pages.length * 2;
      var pageNums = [], contentNums = [];
      pages.forEach(function (c, i) { contentNums.push(6 + i * 2); pageNums.push(7 + i * 2); });
      objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
      objs[2] = "<< /Type /Pages /Kids [" + pageNums.map(function (p) { return p + " 0 R"; }).join(" ") +
        "] /Count " + pages.length + " >>";
      objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
      objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
      objs[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>";
      pages.forEach(function (c, i) {
        objs[contentNums[i]] = "<< /Length " + c.length + " >>\nstream\n" + c + "\nendstream";
        objs[pageNums[i]] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + n2(PW) + " " + n2(PH) +
          "] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents " + contentNums[i] + " 0 R >>";
      });
      var out = "%PDF-1.4\n", offsets = [];
      for (var num = 1; num <= maxObj; num++) {
        offsets[num] = out.length;
        out += num + " 0 obj\n" + objs[num] + "\nendobj\n";
      }
      var xref = out.length;
      out += "xref\n0 " + (maxObj + 1) + "\n0000000000 65535 f \n";
      for (num = 1; num <= maxObj; num++) out += ("0000000000" + offsets[num]).slice(-10) + " 00000 n \n";
      out += "trailer\n<< /Size " + (maxObj + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";

      var bytes = new Uint8Array(out.length);
      for (var k = 0; k < out.length; k++) bytes[k] = out.charCodeAt(k) & 0xff;
      var blob = new Blob([bytes], { type: "application/pdf" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = filename || "document.pdf";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    }

    return {
      W: PW, H: PH,
      text: text, rule: rule, addPage: addPage, save: save,
      width: widthOf, wrap: wrap,
      pageCount: function () { return pages.length; }
    };
  }

  window.PORTFOLIO_PDF = { create: create };
})();
