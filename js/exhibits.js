/* ============================================================
   exhibits.js - turns a project's `exhibit` data into a live
   display. Types:
     demo    -> one of the six runnable simulations (demos.js)
     video   -> local mp4/webm file or an embed URL
     gallery -> image grid with a lightbox
     none    -> nothing
   ============================================================ */
(function () {
  "use strict";

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  var doLifecycle = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  function doMode(width, coarse) {
    if (coarse === undefined) coarse = window.matchMedia("(pointer: coarse)").matches;
    if (width === undefined) width = window.innerWidth;
    if (coarse) return "coarse";
    if (width <= 760) return "phone";
    if (width <= 1099) return "compact-fine";
    return "supported";
  }
  function doPolicy(width, coarse) {
    var mode = doMode(width, coarse);
    return { mode: mode, standDown: mode !== "supported",
      heading: mode === "compact-fine" ? "Playable on a larger screen" : "Playable on a desktop" };
  }
  function shouldStandDown(project, ex) {
    if (!ex || ex.type !== "demo" || !ex.demo) return false;
    if (project && project.id === "do-pipeline") return doPolicy().standDown;
    return window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 760;
  }
  function syncDoSceneOrder(container, project, stoodDown) {
    if (!project || project.id !== "do-pipeline") return;
    var stage = container && container.parentNode;
    var scene = stage && stage.parentNode;
    var brief = scene && scene.querySelector(".ft-brief");
    if (!scene || !brief || !stage) return;
    // The approved workshop keeps the description first at every breakpoint.
    scene.insertBefore(brief, stage);
  }
  function watchDoLifecycle(container, project) {
    if (!doLifecycle || !project || project.id !== "do-pipeline" || doLifecycle.has(container)) return;
    var queries = [window.matchMedia("(max-width: 1099px)"), window.matchMedia("(max-width: 760px)"),
      window.matchMedia("(pointer: coarse)")];
    var onChange = function () { window.PORTFOLIO_EXHIBITS.render(container, project); };
    queries.forEach(function (q) {
      if (q.addEventListener) q.addEventListener("change", onChange);
      else if (q.addListener) q.addListener(onChange);
    });
    doLifecycle.set(container, { queries: queries, onChange: onChange });
  }
  function isEmbedUrl(u) {
    return /youtube\.com|youtu\.be|vimeo\.com/i.test(u || "");
  }
  /* The FYP shots are 1600px but render as small thumbnails; 800px copies live
     in assets/fyp/sm/. Only that folder has them, so everything else is left
     alone. The lightbox always opens the full-res original. */
  /* Mobile connections drop requests. A gallery fires a dozen image loads at
     once, so a few failing leaves permanent blank tiles with no way back -
     the browser does not retry a failed <img> on its own. One delayed retry
     recovers them without hammering a genuinely dead URL. */
  function retryOnce(img) {
    var tried = false;
    img.addEventListener("error", function () {
      if (tried) return;
      tried = true;
      var url = img.src;
      setTimeout(function () {
        img.removeAttribute("srcset");   // retry the plain src, not the set
        img.src = url + (url.indexOf("?") === -1 ? "?r=1" : "&r=1");
      }, 700);
    });
  }

  function thumb(img, src, sizes) {
    retryOnce(img);
    img.src = src;
    if (src.indexOf("assets/fyp/") === 0 && src.indexOf("/sm/") === -1) {
      var small = src.replace("assets/fyp/", "assets/fyp/sm/");
      img.src = small;
      img.srcset = small + " 800w, " + src + " 1600w";
      /* Declared below the rendered width on purpose: srcset picks by DEVICE
         pixels, so an honest vw on a DPR-3 phone tips past 800 and pulls the
         1600w original for every shot. The lightbox opens full-res anyway. */
      img.sizes = sizes || "(max-width: 700px) 260px, 420px";
    }
  }

  /* ---------- video ---------- */
  function renderVideo(frame, ex) {
    if (isEmbedUrl(ex.video)) {
      var url = ex.video
        .replace("watch?v=", "embed/")
        .replace("youtu.be/", "www.youtube.com/embed/");
      var ifr = document.createElement("iframe");
      ifr.src = url;
      ifr.allow = "fullscreen";
      ifr.title = "gameplay video";
      frame.appendChild(ifr);
    } else {
      var v = document.createElement("video");
      v.src = ex.video;
      v.controls = true;
      v.preload = "none";        // 7.1MB AR clip - only fetch on play
      v.playsInline = true;      // iOS Safari otherwise forces fullscreen
      if (ex.poster) v.poster = ex.poster;
      frame.appendChild(v);
    }
  }

  /* ---------- gallery ---------- */
  /* the enlarged shot sits ABOVE everything (including the filmstrip) and
     always carries its own close cross */
  function openLightbox(src, i, total, options) {
    options = options || {};
    var opener = options.trigger || document.activeElement;
    var lb = el("dialog", "lightbox");
    var caption = options.alt || (total ? "Screenshot " + (i + 1) + " of " + total : "Project image");
    var header = el("header", "lightbox-header");
    var title = el("h2", null, caption);
    title.id = "image-viewer-title";
    lb.setAttribute("aria-labelledby", title.id);
    header.appendChild(title);
    var big = document.createElement("img");
    big.src = src;
    big.alt = caption;
    var media = el("div", "lightbox-media");
    media.appendChild(big);
    var x = el("button", "lightbox-close", "Close");
    x.type = "button";
    header.appendChild(x);
    lb.appendChild(header);
    lb.appendChild(media);
    var cleaned = false;
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      window.removeEventListener("keydown", onKey, true);
      lb.remove();
      if (opener && opener.isConnected && opener.focus) opener.focus({ preventScroll: true });
    }
    function shut(ev) {
      if (ev) ev.stopPropagation();
      if (lb.open) lb.close();
      cleanup();
    }
    function onKey(ev) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        shut();
      }
    }
    x.addEventListener("click", shut);
    lb.addEventListener("cancel", function (ev) { ev.preventDefault(); shut(ev); });
    lb.addEventListener("close", cleanup);
    lb.addEventListener("click", function (ev) {
      if (ev.target !== lb) return;
      var bounds = lb.getBoundingClientRect();
      if (ev.clientX < bounds.left || ev.clientX > bounds.right ||
          ev.clientY < bounds.top || ev.clientY > bounds.bottom) shut(ev);
    });
    window.addEventListener("keydown", onKey, true);         // capture: beats the reel
    document.body.appendChild(lb);
    lb.showModal();
    x.focus();
    return lb;
  }
  function renderGallery(container, ex) {
    var g = el("div", "gallery");
    (ex.images || []).forEach(function (src, i) {
      var img = document.createElement("img");
      thumb(img, src);
      img.alt = "screenshot " + (i + 1);
      img.loading = "lazy";
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", "Enlarge " + img.alt);
      img.setAttribute("aria-haspopup", "dialog");
      img.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          openLightbox(src, i, (ex.images || []).length, { trigger: img });
        }
      });
      img.addEventListener("click", function () { openLightbox(src, i, (ex.images || []).length); });
      g.appendChild(img);
    });
    container.appendChild(g);
  }

  /* ---------- filmstrip: the gallery as a reel you scroll through ----------
     Opened from a button on the project card, so the shots cost the card no
     height at all - the card stays inside one screen. */
  function openFilmstrip(images, title) {
    var back = el("div", "film-back");
    var wrap = el("div", "film-wrap");

    var head = el("div", "film-head");
    head.appendChild(el("b", null, title || "Screenshots"));
    head.appendChild(el("span", "film-meta", images.length + " shots · scroll, drag or use ← →"));
    var close = el("button", "film-close", "×");
    close.title = "Close the reel (Esc)";
    head.appendChild(close);
    wrap.appendChild(head);

    var body = el("div", "film-body");
    var prev = el("button", "film-arrow", "◄"); prev.title = "back";
    var next = el("button", "film-arrow", "►"); next.title = "forward";
    var strip = el("div", "film-strip");
    var reel = el("div", "film-reel");
    var moved = false;
    images.forEach(function (src, i) {
      var frame = el("div", "film-frame");
      var img = document.createElement("img");
      thumb(img, src);
      img.alt = "screenshot " + (i + 1);
      img.loading = i < 4 ? "eager" : "lazy";
      frame.appendChild(img);
      frame.appendChild(el("span", "film-no", (i + 1) + " / " + images.length));
      frame.addEventListener("click", function () {
        if (!moved) openLightbox(src, i, images.length);   // a drag must not enlarge
      });
      reel.appendChild(frame);
    });
    strip.appendChild(reel);
    body.appendChild(prev); body.appendChild(strip); body.appendChild(next);
    wrap.appendChild(body);
    wrap.appendChild(el("div", "film-hint", "that was the last shot — close the reel to go back"));
    back.appendChild(wrap);
    document.body.appendChild(back);

    function page(dir) {
      strip.scrollBy({ left: dir * strip.clientWidth * 0.82, behavior: "smooth" });
    }
    prev.addEventListener("click", function () { page(-1); });
    next.addEventListener("click", function () { page(1); });
    strip.addEventListener("wheel", function (ev) {   // wheel scrolls sideways
      if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) {
        strip.scrollLeft += ev.deltaY;
        ev.preventDefault();
      }
    }, { passive: false });

    var down = false, startX = 0, startL = 0;
    strip.addEventListener("pointerdown", function (ev) {
      down = true; moved = false;
      startX = ev.clientX; startL = strip.scrollLeft;
      strip.classList.add("dragging");
    });
    function onMove(ev) {
      if (!down) return;
      var dx = ev.clientX - startX;
      if (Math.abs(dx) > 6) moved = true;
      strip.scrollLeft = startL - dx;
    }
    function onUp() {
      down = false;
      strip.classList.remove("dragging");
      setTimeout(function () { moved = false; }, 30);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    function syncEdges() {
      var atEnd = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 8;
      wrap.classList.toggle("at-end", atEnd);
      prev.disabled = strip.scrollLeft <= 2;
      next.disabled = atEnd;
    }
    strip.addEventListener("scroll", syncEdges);
    setTimeout(syncEdges, 60);

    function shut() {
      back.remove();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    function onKey(ev) {
      // while a shot is enlarged the keys belong to the lightbox
      if (document.querySelector(".lightbox")) return;
      if (ev.key === "Escape") shut();
      else if (ev.key === "ArrowRight") page(1);
      else if (ev.key === "ArrowLeft") page(-1);
    }
    close.addEventListener("click", shut);
    back.addEventListener("click", function (ev) { if (ev.target === back) shut(); });
    window.addEventListener("keydown", onKey);
    close.focus();
  }

  /* ---------- phones: the runnable demo, stood down ----------
     Only kellie-fyp carries screenshots, so the rest are note-only. The
     project's own problem/action/result copy still renders above this, so the
     card never looks empty. */
  function renderDesktopOnly(container, ex, heading) {
    // Some cards bundle a video alongside the game (the AR card is a
    // "Mini game"/"Video" switcher). Phones still get to watch the video -
    // only the interactive part is stood down.
    if (ex.video) {
      var frame = el("div", "exhibit-frame" + (ex.portrait ? " portrait" : ""));
      container.appendChild(frame);
      renderVideo(frame, ex);   // sets preload=none + playsInline
    }

    var note = el("div", "demo-desktop-only");
    note.appendChild(el("span", "ddo-mark", "▶"));
    var body = el("div", "ddo-body");
    body.appendChild(el("b", null,
      heading || (ex.video ? "The interactive version is on desktop" : "Playable on a desktop")));
    body.appendChild(el("p", null, ex.video
      ? "The demo video above plays fine here. The hands-on version needs a cursor " +
        "and a full-size window, so open this page on a computer to try it."
      : "This one runs as a live simulation you can click through. Its controls " +
        "need a cursor and a full-size window, so it sits out on phones - open " +
        "this page on a computer to run it."));
    note.appendChild(body);
    container.appendChild(note);
    // NO inline gallery here: when a card has screenshots the project card
    // already carries a "N screenshots" button (app.js) that opens the
    // filmstrip, so an inline grid would just duplicate it.
  }

  /* ---------- dispatcher ---------- */
  window.PORTFOLIO_EXHIBITS = {
    filmstrip: openFilmstrip,
    /* kellie.js reuses this for the FYP poster - 720px of poster text is
       unreadable at phone width without an enlarge path */
    lightbox: function (src, options) { return openLightbox(src, undefined, undefined, options); },
    // Generic explanations retain original evidence, never a playable mini-game.
    renderDetails: function (container, project) {
      container.innerHTML = "";
      var ex = project.exhibit || {};
      if (ex.video) {
        var frame = el("div", "exhibit-frame" + (ex.portrait ? " portrait" : ""));
        container.appendChild(frame);
        renderVideo(frame, ex);
      }
      if (ex.images && ex.images.length) renderGallery(container, ex);
    },
    /* kellie.js builds its own gallery images but needs the same recovery */
    retryOnce: retryOnce,
    // Pure responsive classifier is exported for the probe at exact edges.
    doModeAt: doMode,
    doPolicyAt: doPolicy,
    render: function (container, project) {
      watchDoLifecycle(container, project);
      container.innerHTML = "";
      var ex = project.exhibit || { type: "none" };
      try {
        var policy = project && project.id === "do-pipeline" ? doPolicy() : null;
        var stoodDown = shouldStandDown(project, ex);
        syncDoSceneOrder(container, project, stoodDown);
        if (stoodDown) {
          // the mini games are built for a cursor and a full-size window; at
          // phone scale their controls are too small to actually play
          renderDesktopOnly(container, ex,
            policy ? policy.heading : undefined);
        } else if (ex.type === "demo" && ex.demo) {
          var box = el("div", "demo");
          container.appendChild(box);
          // screenshots do NOT stack under the demo any more - they live in
          // the filmstrip, opened from the button on the project card
          if (window.PORTFOLIO_DEMOS) {
            window.PORTFOLIO_DEMOS.mountInto(box, ex.demo);
          } else if (window.DEMOS_READY) {
            // demos.js is loaded async on desktop; mount once it lands
            window.DEMOS_READY.then(function () {
              if (box.isConnected && !shouldStandDown(project, ex) && window.PORTFOLIO_DEMOS) {
                window.PORTFOLIO_DEMOS.mountInto(box, ex.demo);
              }
            });
          }
        } else if (ex.type === "video" && ex.video) {
          var frame = el("div", "exhibit-frame");
          container.appendChild(frame);
          renderVideo(frame, ex);
        } else if (ex.type === "gallery" && ex.images && ex.images.length) {
          renderGallery(container, ex);
        }
      } catch (e) {
        console.error("exhibit render failed:", project.id, e);
        container.appendChild(el("div", "demo-log bad", "Exhibit failed to load."));
      }
    }
  };
})();
