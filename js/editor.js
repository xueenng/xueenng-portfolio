/* ============================================================
   editor.js - the front-end CMS (schema 2).
   Ctrl+E (or the pencil button, or opening the site with #edit)
   turns every piece of content into an editable field:
   - click any outlined text and type
   - click the avatar to upload a photo (stored inside content)
   - add / remove projects, skills, timeline, stats, now, links
   - per-project: category, status, featured star, exhibit
     settings (demo / playable game / video / gallery)
   Saving: instant to this browser (localStorage).
   Export content.js  -> download the data file for the repo.
   Publish to GitHub  -> update the live site, no backend needed.
   ============================================================ */
(function () {
  "use strict";

  var App, editing = false;

  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function status(msg) {
    var s = $("#edit-status");
    if (s) s.textContent = msg;
  }
  function saveNow() {
    if (App.save()) status("Saved in this browser " + new Date().toLocaleTimeString());
  }

  /* ---------- text editing ---------- */
  function cleanText(node) {
    var clone = node.cloneNode(true);
    $all(".edit-mini, .edit-list-controls, select, button", clone).forEach(function (n) { n.remove(); });
    return clone.textContent;
  }
  function wireTextNodes() {
    $all("[data-edit]").forEach(function (node) {
      if (node.getAttribute("contenteditable")) return;
      try { node.setAttribute("contenteditable", "plaintext-only"); }
      catch (e) { node.setAttribute("contenteditable", "true"); }
      node.addEventListener("paste", onPastePlain);
      node.addEventListener("blur", onTextBlur);
      if (node.tagName === "A") {
        node.addEventListener("click", function (ev) { if (editing) ev.preventDefault(); });
      }
    });
  }
  function onPastePlain(ev) {
    ev.preventDefault();
    var text = (ev.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text);
  }
  function onTextBlur(ev) {
    var node = ev.currentTarget;
    var path = node.getAttribute("data-edit");
    var val = cleanText(node);
    App.setPath(App.content, path, val);
    $all('[data-edit="' + path + '"]').forEach(function (n) {
      if (n !== node) n.textContent = val;
    });
    saveNow();
  }

  /* ---------- image helpers ---------- */
  function pickImage(cb, maxSide) {
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    inp.onchange = function () {
      var f = inp.files[0];
      if (!f) return;
      if (f.size > 350 * 1024) {
        downscale(f, maxSide || 1000, cb);
      } else {
        var r = new FileReader();
        r.onload = function () { cb(r.result); };
        r.readAsDataURL(f);
      }
    };
    inp.click();
  }
  function downscale(file, size, cb) {
    var img = new Image();
    img.onload = function () {
      var c = document.createElement("canvas");
      var scale = Math.min(1, size / Math.max(img.width, img.height));
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      cb(c.toDataURL("image/jpeg", 0.82));
    };
    img.src = URL.createObjectURL(file);
  }
  function wireImages() {
    $all("[data-edit-image]").forEach(function (node) {
      node.title = "Click to upload a photo (stored inside your content, no server)";
      node.onclick = function () {
        if (!editing) return;
        pickImage(function (dataUri) {
          App.setPath(App.content, node.getAttribute("data-edit-image"), dataUri);
          saveNow();
          App.renderAll();
          App.toast("Photo updated - it lives inside your content, not on a server.");
        }, 480);
      };
    });
  }

  /* ---------- list controls ---------- */
  function miniBtn(label, title, fn) {
    var b = document.createElement("button");
    b.className = "edit-mini"; b.textContent = label; b.title = title;
    b.addEventListener("click", function (ev) { ev.stopPropagation(); ev.preventDefault(); fn(); });
    return b;
  }
  function controlsSpan() {
    var s = document.createElement("span");
    s.className = "edit-list-controls";
    return s;
  }
  function addRowButton(container, label, fn) {
    if (!container) return;
    var b = miniBtn(label, label, fn);
    b.style.alignSelf = "center";
    container.appendChild(b);
  }
  function refresh() {
    saveNow();
    App.renderAll();
  }

  // wiring is called after every partial re-render; sections whose DOM
  // survived keep their controls - never wire the same container twice.
  // Wiring always leaves .edit-mini buttons behind, and a re-render wipes
  // them with the container's children, so their presence is the test.
  function wired(container) {
    if (!container) return true;
    return !!container.querySelector(".edit-mini");
  }

  function wireLists() {
    var c = App.content;

    // hero stats
    if (!wired($("#hero-stats"))) {
    $all("#hero-stats .stat").forEach(function (node, i) {
      var ctl = controlsSpan();
      ctl.appendChild(miniBtn("x", "Remove this stat", function () {
        c.hero.stats.splice(i, 1); refresh();
      }));
      node.appendChild(ctl);
    });
    addRowButton($("#hero-stats"), "+ stat", function () {
      c.hero.stats.push({ value: "0", label: "new stat" }); refresh();
    });
    }

    // now list
    if (!wired($("#now-list"))) {
    $all("#now-list li").forEach(function (li, i) {
      li.appendChild(miniBtn("x", "Remove", function () {
        c.now.splice(i, 1); refresh();
      }));
    });
    addRowButton($("#now-list"), "+ now item", function () {
      c.now.push("something I am building"); refresh();
    });
    }

    // projects: controls live on the grid cards (the grid shows every project)
    if (!wired($("#grid"))) {
    $all("#grid .grid-card").forEach(function (card) {
      var id = card.getAttribute("data-project");
      var i = c.projects.findIndex(function (p) { return p.id === id; });
      if (i === -1) return;
      var p = c.projects[i];
      var ctl = controlsSpan();
      ctl.style.display = "flex";
      ctl.style.flexWrap = "wrap";
      ctl.style.marginTop = ".6rem";

      ctl.appendChild(miniBtn(p.featured ? "★ featured" : "☆ feature", "Toggle Selected-work spotlight", function () {
        p.featured = !p.featured; refresh();
      }));
      ctl.appendChild(miniBtn("^", "Move up", function () {
        if (i === 0) return;
        c.projects.splice(i - 1, 0, c.projects.splice(i, 1)[0]); refresh();
      }));
      ctl.appendChild(miniBtn("x", "Remove this project", function () {
        if (confirm("Remove project '" + p.title + "' from the portfolio?")) {
          c.projects.splice(i, 1); refresh();
        }
      }));
      var catSel = document.createElement("select");
      Object.keys(App.CATEGORY_LABELS).forEach(function (cat) {
        var o = document.createElement("option");
        o.value = cat; o.textContent = App.CATEGORY_LABELS[cat];
        if (p.category === cat) o.selected = true;
        catSel.appendChild(o);
      });
      catSel.className = "edit-mini"; catSel.title = "Category";
      catSel.addEventListener("click", function (ev) { ev.stopPropagation(); });
      catSel.addEventListener("change", function () { p.category = catSel.value; refresh(); });
      ctl.appendChild(catSel);
      var stSel = document.createElement("select");
      ["LIVE", "ROLLOUT", "DONE"].forEach(function (s) {
        var o = document.createElement("option"); o.value = s; o.textContent = s;
        if (p.status === s) o.selected = true;
        stSel.appendChild(o);
      });
      stSel.className = "edit-mini"; stSel.title = "Status badge";
      stSel.addEventListener("click", function (ev) { ev.stopPropagation(); });
      stSel.addEventListener("change", function () { p.status = stSel.value; refresh(); });
      ctl.appendChild(stSel);
      ctl.appendChild(miniBtn("exhibit...", "What this project shows: demo / game / video / gallery", function () {
        exhibitModal(p);
      }));
      card.appendChild(ctl);
    });
    addRowButton($("#grid"), "+ add project", function () {
      c.projects.push({
        id: "proj-" + Date.now(), title: "New project", subtitle: "One line about it",
        period: "2026", year: "2026", status: "DONE", category: "academic", featured: false,
        problem: "What hurt before.", action: "What I built.",
        outcome: "What changed.", impact: "Why it mattered.",
        stack: ["tech"], exhibit: { type: "none" }, links: []
      });
      refresh();
    });
    }

    // stack tags (feature blocks + open grid detail): infer project from data-pi
    $all(".feature-stack").forEach(function (stack) {
      if (wired(stack)) return;
      var i = parseInt(stack.getAttribute("data-pi"), 10);
      if (isNaN(i) || !c.projects[i]) return;
      $all(".tag", stack).forEach(function (tagNode, ti) {
        tagNode.appendChild(miniBtn("x", "Remove tag", function () {
          c.projects[i].stack.splice(ti, 1); refresh();
        }));
      });
      addRowButton(stack, "+ tag", function () {
        c.projects[i].stack.push("new tech"); refresh();
      });
    });

    // skills
    if (!wired($("#skills-grid"))) {
    $all("#skills-grid .skill-group").forEach(function (box, gi) {
      var ctl = controlsSpan();
      ctl.appendChild(miniBtn("x", "Remove this group", function () {
        c.skills.splice(gi, 1); refresh();
      }));
      box.querySelector("h3").appendChild(ctl);
      $all("li", box).forEach(function (li, ii) {
        li.appendChild(miniBtn("x", "Remove", function () {
          c.skills[gi].items.splice(ii, 1); refresh();
        }));
      });
      addRowButton(box.querySelector("ul"), "+", function () {
        c.skills[gi].items.push("new skill"); refresh();
      });
    });
    addRowButton($("#skills-grid"), "+ add group", function () {
      c.skills.push({ group: "New group", items: ["skill"] }); refresh();
    });
    }

    // timeline
    if (!wired($("#timeline"))) {
    $all("#timeline .tl-item").forEach(function (item, ti) {
      var ctl = controlsSpan();
      ctl.appendChild(miniBtn("x", "Remove this entry", function () {
        c.timeline.splice(ti, 1); refresh();
      }));
      ctl.appendChild(miniBtn("+ point", "Add a bullet point", function () {
        (c.timeline[ti].points = c.timeline[ti].points || []).push("new point"); refresh();
      }));
      item.querySelector(".tl-role").appendChild(ctl);
      $all(".tl-points li", item).forEach(function (li, pi) {
        li.appendChild(miniBtn("x", "Remove point", function () {
          c.timeline[ti].points.splice(pi, 1); refresh();
        }));
      });
    });
    addRowButton($("#timeline"), "+ add entry", function () {
      c.timeline.push({ period: "2026", role: "Role", org: "Organisation", place: "Somewhere", points: [] }); refresh();
    });
    }

    // achievements: per-card controls + a "+ add" per era on the rail
    if (!wired($("#ach-rail"))) {
    $all("#ach-rail .ach-card").forEach(function (card) {
      var i = parseInt(card.getAttribute("data-ai"), 10);
      var a = (c.achievements || [])[i];
      if (!a) return;
      var ctl = controlsSpan();
      ctl.style.display = "flex";
      ctl.style.flexWrap = "wrap";
      ctl.style.marginTop = ".5rem";
      ctl.appendChild(miniBtn("x", "Remove this achievement", function () {
        if (confirm("Remove achievement '" + a.title + "'?")) {
          c.achievements.splice(i, 1); refresh();
        }
      }));
      var eraSel = document.createElement("select");
      App.ACH_ERA_ORDER.forEach(function (k) {
        var o = document.createElement("option");
        o.value = k;
        o.textContent = (c.achievementEras && c.achievementEras[k] && c.achievementEras[k].label) || k;
        if (a.era === k) o.selected = true;
        eraSel.appendChild(o);
      });
      eraSel.className = "edit-mini"; eraSel.title = "Era / school";
      eraSel.addEventListener("click", function (ev) { ev.stopPropagation(); });
      eraSel.addEventListener("change", function () { a.era = eraSel.value; refresh(); });
      ctl.appendChild(eraSel);
      var catSel = document.createElement("select");
      Object.keys(App.ACH_CATEGORIES).forEach(function (k) {
        var o = document.createElement("option");
        o.value = k; o.textContent = App.ACH_CATEGORIES[k].label;
        if (a.category === k) o.selected = true;
        catSel.appendChild(o);
      });
      catSel.className = "edit-mini"; catSel.title = "Category";
      catSel.addEventListener("click", function (ev) { ev.stopPropagation(); });
      catSel.addEventListener("change", function () { a.category = catSel.value; refresh(); });
      ctl.appendChild(catSel);
      if (a.image) {
        ctl.appendChild(miniBtn("x photo", "Remove the photo", function () {
          a.image = ""; refresh();
        }));
      }
      card.appendChild(ctl);
    });
    $all("#ach-rail .ach-era").forEach(function (eraDiv) {
      var k = eraDiv.getAttribute("data-era");
      addRowButton(eraDiv.querySelector(".ach-cards"), "+ add", function () {
        (c.achievements = c.achievements || []).push({
          id: "ach-" + Date.now(), title: "New achievement", org: "", year: "2026",
          era: k, category: "academic", description: "", image: ""
        });
        refresh();
      });
    });
    }

    // identity links
    var row = $("#contact-row");
    if (wired(row)) return;
    c.identity.links.forEach(function (l, li) {
      var b = miniBtn("edit link: " + l.label, "Edit this link", function () {
        var label = prompt("Link label:", l.label);
        if (label === null) return;
        var url = prompt("URL (leave empty to hide):", l.url);
        if (url === null) return;
        c.identity.links[li] = { label: label, url: url };
        refresh();
      });
      row.appendChild(b);
    });
    addRowButton(row, "+ link", function () {
      c.identity.links.push({ label: "Website", url: "https://" }); refresh();
    });
  }

  /* ---------- exhibit settings modal ---------- */
  function exhibitModal(p) {
    var ex = p.exhibit = p.exhibit || { type: "none" };
    var demoIds = (window.PORTFOLIO_DEMOS && window.PORTFOLIO_DEMOS.ids) || [];
    var back = document.createElement("div");
    back.className = "modal-backdrop";
    var demoOpts = demoIds.map(function (id) {
      return '<option value="' + id + '"' + (ex.demo === id ? " selected" : "") + '>' + id + "</option>";
    }).join("");
    back.innerHTML =
      '<div class="modal"><h3>Exhibit - ' + p.title.replace(/</g, "&lt;") + '</h3>' +
      '<label>type</label><select id="ex-type">' +
      ["none", "demo", "webgl", "video", "gallery"].map(function (t) {
        return '<option value="' + t + '"' + (ex.type === t ? " selected" : "") + '>' +
          ({ none: "none", demo: "runnable simulation", webgl: "playable game (WebGL build)", video: "video", gallery: "screenshot gallery" })[t] + "</option>";
      }).join("") + "</select>" +
      '<div id="ex-demo-row"><label>which simulation</label><select id="ex-demo">' + demoOpts + "</select></div>" +
      '<div id="ex-webgl-row"><label>game build URL (index.html of the WebGL export, e.g. game/index.html)</label>' +
      '<input id="ex-src" value="' + (ex.src || "") + '">' +
      '<label>keyboard controls note (comma-separated)</label><input id="ex-note" value="' + (ex.note || "") + '"></div>' +
      '<div id="ex-video-row"><label>video (mp4 path or YouTube link) - also the webgl fallback</label>' +
      '<input id="ex-video" value="' + (ex.video || "") + '"></div>' +
      '<div id="ex-media-row"><label>poster image</label><button class="btn btn-small" id="ex-poster">' +
      (ex.poster ? "replace poster" : "upload poster") + '</button>' +
      '<label>gallery images (' + ((ex.images || []).length) + ') - also the webgl/video fallback</label>' +
      '<div style="display:flex;gap:.4rem;flex-wrap:wrap"><button class="btn btn-small" id="ex-img-add">+ add image</button>' +
      '<button class="btn btn-small btn-danger" id="ex-img-clear">clear images</button></div></div>' +
      '<p class="hint">Uploaded images are embedded into your content as data URIs - keep them few and small. For the game build, export from Unity (WebGL) into the site folder and enter its index.html path.</p>' +
      '<div class="modal-actions"><button class="btn btn-small btn-primary" id="ex-done">Done</button></div></div>';
    document.body.appendChild(back);

    function syncRows() {
      var t = $("#ex-type", back).value;
      $("#ex-demo-row", back).style.display = t === "demo" ? "" : "none";
      $("#ex-webgl-row", back).style.display = t === "webgl" ? "" : "none";
      $("#ex-video-row", back).style.display = (t === "video" || t === "webgl") ? "" : "none";
      $("#ex-media-row", back).style.display = (t === "webgl" || t === "video" || t === "gallery") ? "" : "none";
    }
    syncRows();
    $("#ex-type", back).addEventListener("change", syncRows);
    $("#ex-poster", back).addEventListener("click", function () {
      pickImage(function (uri) { ex.poster = uri; App.toast("Poster set."); }, 1000);
    });
    $("#ex-img-add", back).addEventListener("click", function () {
      pickImage(function (uri) {
        (ex.images = ex.images || []).push(uri);
        App.toast("Image added (" + ex.images.length + ").");
      }, 1000);
    });
    $("#ex-img-clear", back).addEventListener("click", function () { ex.images = []; App.toast("Images cleared."); });
    back.addEventListener("click", function (e) { if (e.target === back) close(); });
    $("#ex-done", back).addEventListener("click", close);
    function close() {
      ex.type = $("#ex-type", back).value;
      ex.demo = $("#ex-demo", back).value;
      ex.src = $("#ex-src", back).value.trim();
      ex.note = $("#ex-note", back).value.trim();
      ex.video = $("#ex-video", back).value.trim();
      back.remove();
      refresh();
    }
  }

  /* ---------- export / import ---------- */
  function contentAsFile() {
    return "/* content.js - generated from the site's edit mode on " +
      new Date().toISOString() + ".\n   Replace Portfolio/js/content.js with this file. */\n" +
      "window.PORTFOLIO_CONTENT = " + JSON.stringify(App.content, null, 2) + ";\n";
  }
  function doExport() {
    var blob = new Blob([contentAsFile()], { type: "text/javascript" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "content.js";
    a.click();
    URL.revokeObjectURL(a.href);
    App.toast("content.js downloaded - drop it into Portfolio/js/ to make edits permanent.");
  }
  function doImport(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var text = r.result.trim();
        var m = text.match(/window\.PORTFOLIO_CONTENT\s*=\s*([\s\S]*?);?\s*$/);
        var json = m ? m[1] : text;
        var obj = JSON.parse(json);
        if (!obj || !obj.identity || !obj.projects) throw new Error("not a portfolio content file");
        App.content = obj;
        saveNow();
        App.renderAll();
        App.toast("Content imported.");
      } catch (e) {
        alert("Could not import: " + e.message);
      }
    };
    r.readAsText(file);
  }

  /* ---------- publish to GitHub ---------- */
  var GH_KEY = "portfolio.github";
  function publishModal() {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(GH_KEY) || "{}"); } catch (e) {}
    var back = document.createElement("div");
    back.className = "modal-backdrop";
    back.innerHTML =
      '<div class="modal"><h3>Publish to GitHub Pages</h3>' +
      '<label>repository (owner/name)</label><input id="gh-repo" placeholder="yourname/portfolio" value="' + (saved.repo || "") + '">' +
      '<label>branch</label><input id="gh-branch" value="' + (saved.branch || "main") + '">' +
      '<label>path to content.js</label><input id="gh-path" value="' + (saved.path || "js/content.js") + '">' +
      '<label>personal access token (repo scope)</label><input id="gh-token" type="password" value="' + (saved.token || "") + '">' +
      '<p class="hint">The token stays in this browser only. Create a fine-grained token that can write to just this repository.</p>' +
      '<div class="modal-actions"><button class="btn btn-small" id="gh-cancel">Cancel</button>' +
      '<button class="btn btn-small btn-primary" id="gh-go">Publish</button></div></div>';
    document.body.appendChild(back);
    back.addEventListener("click", function (e) { if (e.target === back) back.remove(); });
    $("#gh-cancel", back).addEventListener("click", function () { back.remove(); });
    $("#gh-go", back).addEventListener("click", function () {
      var cfg = {
        repo: $("#gh-repo", back).value.trim(),
        branch: $("#gh-branch", back).value.trim() || "main",
        path: $("#gh-path", back).value.trim() || "js/content.js",
        token: $("#gh-token", back).value.trim()
      };
      if (!cfg.repo || cfg.repo.indexOf("/") === -1 || !cfg.token) {
        alert("Repository (owner/name) and token are required."); return;
      }
      try { localStorage.setItem(GH_KEY, JSON.stringify(cfg)); } catch (e) {}
      back.remove();
      publish(cfg);
    });
  }
  async function publish(cfg) {
    status("Publishing to GitHub...");
    var api = "https://api.github.com/repos/" + cfg.repo + "/contents/" + cfg.path;
    var headers = {
      "Authorization": "Bearer " + cfg.token,
      "Accept": "application/vnd.github+json"
    };
    try {
      var sha;
      var get = await fetch(api + "?ref=" + cfg.branch, { headers: headers });
      if (get.ok) sha = (await get.json()).sha;
      else if (get.status !== 404) throw new Error("GitHub said " + get.status + " when reading the file. Check repo/branch/path/token.");
      var body = {
        message: "Update portfolio content from the site's edit mode",
        content: btoa(unescape(encodeURIComponent(contentAsFile()))),
        branch: cfg.branch
      };
      if (sha) body.sha = sha;
      var put = await fetch(api, { method: "PUT", headers: headers, body: JSON.stringify(body) });
      if (!put.ok) {
        var err = await put.json().catch(function () { return {}; });
        throw new Error("GitHub said " + put.status + ": " + (err.message || "unknown error"));
      }
      status("Published.");
      App.toast("Published! The live site updates in about a minute (GitHub Pages rebuild).");
    } catch (e) {
      status("Publish failed.");
      alert("Publish failed: " + e.message + "\n\nYour edits are still saved in this browser - you can also Export content.js and commit it manually.");
    }
  }

  /* ---------- admin gate ----------
     Editing is only available once the admin portal (admin.html) has set the
     unlock flag - a public visitor can't trigger edit mode. Not real security
     (publishing needs the GitHub token for that); it keeps casual visitors out
     of the editor and off the pencil button. */
  var UNLOCK_KEY = "xe-admin-unlock", UNLOCK_MS = 8 * 3600 * 1000;
  function adminUnlocked() {
    try {
      var v = JSON.parse(localStorage.getItem(UNLOCK_KEY) || "null");
      return !!(v && (Date.now() - v.t) < UNLOCK_MS);
    } catch (e) { return false; }
  }

  /* ---------- enter / exit ---------- */
  function enter() {
    if (editing) return;
    if (!adminUnlocked()) {
      if (App && App.toast) App.toast("Editing is admin-only - open admin.html to unlock.");
      return;
    }
    editing = true;
    document.body.classList.add("editing");
    $("#editbar").hidden = false;
    App.renderAll(); // re-render so the All filter's grid + now strip show everything
    var firstChip = $("#filters .chip");
    if (firstChip && !firstChip.classList.contains("on")) firstChip.click();
    rewire();
    App.toast("Edit mode - click any outlined text. Everything saves to this browser instantly.");
  }
  function exit() {
    editing = false;
    document.body.classList.remove("editing");
    $("#editbar").hidden = true;
    $all("[data-edit]").forEach(function (n) { n.removeAttribute("contenteditable"); });
    App.renderAll();
  }
  function rewire() {
    if (!editing) return;
    wireTextNodes();
    wireImages();
    wireLists();
  }

  window.PORTFOLIO_EDITOR = {
    enter: enter, exit: exit, rewire: rewire,
    isEditing: function () { return editing; },
    adminUnlocked: adminUnlocked,
    lock: function () { try { localStorage.removeItem(UNLOCK_KEY); } catch (e) {} if (editing) exit(); $("#btn-edit").hidden = true; }
  };

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    App = window.PORTFOLIO_APP;

    // the pencil is hidden for ordinary visitors; admin.html unlocking reveals it
    $("#btn-edit").hidden = !adminUnlocked();

    $("#btn-edit").addEventListener("click", function () { editing ? exit() : enter(); });
    $("#edit-done").addEventListener("click", exit);
    $("#edit-export").addEventListener("click", doExport);
    $("#edit-publish").addEventListener("click", publishModal);
    $("#edit-import").addEventListener("click", function () { $("#edit-import-file").click(); });
    $("#edit-import-file").addEventListener("change", function (e) {
      if (e.target.files[0]) doImport(e.target.files[0]);
      e.target.value = "";
    });
    $("#edit-reset").addEventListener("click", function () {
      if (!confirm("Discard ALL edits saved in this browser and go back to the content.js file?")) return;
      try { localStorage.removeItem(App.LS_KEY); } catch (e) {}
      location.hash = "";
      location.reload();
    });
    $("#edit-accent").addEventListener("click", function () {
      var inp = $("#edit-accent-input");
      inp.value = App.content.meta.accent || "#E8A200";
      inp.onchange = function () {
        App.content.meta.accent = inp.value;
        App.applyAccent(inp.value);
        saveNow();
      };
      inp.click();
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.ctrlKey && (ev.key === "e" || ev.key === "E")) {
        if (!adminUnlocked() && !editing) return;   // stay silent for visitors
        ev.preventDefault();
        editing ? exit() : enter();
      }
    });
    if (location.hash === "#edit" && adminUnlocked()) {
      $("#btn-edit").hidden = false;
      enter();
    }
  });
})();
