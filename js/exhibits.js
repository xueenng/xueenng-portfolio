/* ============================================================
   exhibits.js - turns a project's `exhibit` data into a live
   display. Types:
     demo    -> one of the six runnable simulations (demos.js)
     webgl   -> playable game embed (Unity WebGL build), click-
                to-load so the megabytes only download on demand;
                falls back to video -> gallery -> styled poster
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
  function isMobile() {
    return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 700;
  }
  function isEmbedUrl(u) {
    return /youtube\.com|youtu\.be|vimeo\.com/i.test(u || "");
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
      if (ex.poster) v.poster = ex.poster;
      frame.appendChild(v);
    }
  }

  /* ---------- gallery ---------- */
  /* the enlarged shot sits ABOVE everything (including the filmstrip) and
     always carries its own close cross */
  function openLightbox(src, i, total) {
    var lb = el("div", "lightbox");
    var big = document.createElement("img");
    big.src = src;
    big.alt = total ? "screenshot " + (i + 1) + " of " + total : "screenshot";
    big.addEventListener("click", function (ev) { ev.stopPropagation(); });
    lb.appendChild(big);
    if (total) lb.appendChild(el("span", "lightbox-no", (i + 1) + " / " + total));
    var x = el("button", "lightbox-close", "×");
    x.title = "Close (Esc)";
    lb.appendChild(x);
    function shut(ev) {
      if (ev) ev.stopPropagation();
      lb.remove();
      window.removeEventListener("keydown", onKey);
    }
    function onKey(ev) {
      if (ev.key === "Escape") { ev.stopPropagation(); shut(); }
    }
    x.addEventListener("click", shut);
    lb.addEventListener("click", function () { shut(); });   // backdrop closes
    window.addEventListener("keydown", onKey, true);         // capture: beats the reel
    document.body.appendChild(lb);
    x.focus();
  }
  function renderGallery(container, ex) {
    var g = el("div", "gallery");
    (ex.images || []).forEach(function (src, i) {
      var img = document.createElement("img");
      img.src = src;
      img.alt = "screenshot " + (i + 1);
      img.loading = "lazy";
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
      img.src = src;
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

  /* ---------- webgl game (with graceful fallback chain) ---------- */
  function renderWebgl(container, ex, title) {
    var frame = el("div", "exhibit-frame");
    container.appendChild(frame);

    var canPlay = ex.src && !isMobile();

    if (canPlay) {
      var poster = el("div", "exhibit-poster");
      if (ex.poster) {
        var pimg = document.createElement("img");
        pimg.src = ex.poster; pimg.alt = "";
        poster.appendChild(pimg);
      }
      var play = el("button", "play-btn", "▶");
      play.title = "Load and play in the browser";
      poster.appendChild(play);
      poster.appendChild(el("h4", null, title || "Play in the browser"));
      poster.appendChild(el("p", null, "The game loads only when you press play (it is a real game build - give it a moment)."));
      frame.appendChild(poster);
      play.addEventListener("click", function () {
        poster.innerHTML = "";
        poster.appendChild(el("p", null, "loading the world..."));
        var ifr = document.createElement("iframe");
        ifr.src = ex.src;
        ifr.allow = "fullscreen; autoplay; pointer-lock";
        ifr.title = title || "playable game";
        ifr.addEventListener("load", function () { poster.remove(); });
        frame.appendChild(ifr);
      });
      if (ex.note) {
        var ctl = el("div", "exhibit-controls");
        ex.note.split(",").forEach(function (part) {
          ctl.appendChild(el("span", "keycap", part.trim()));
        });
        container.appendChild(ctl);
      }
      return;
    }

    // fallbacks: video -> gallery -> placeholder poster
    if (ex.video) { renderVideo(frame, ex); return; }
    if (ex.images && ex.images.length) {
      frame.remove();
      renderGallery(container, ex);
      return;
    }
    var ph = el("div", "exhibit-poster");
    if (ex.poster) {
      var img = document.createElement("img");
      img.src = ex.poster; img.alt = "";
      ph.appendChild(img);
    }
    ph.appendChild(el("h4", null, title || "Playable exhibit"));
    ph.appendChild(el("p", null, isMobile() && ex.src
      ? "The playable build needs a keyboard - open this site on a computer to play. "
      : "The playable web build is being prepared. Gameplay video and screenshots land here via edit mode (Ctrl+E)."));
    frame.appendChild(ph);
  }

  /* ---------- dispatcher ---------- */
  window.PORTFOLIO_EXHIBITS = {
    filmstrip: openFilmstrip,
    render: function (container, project) {
      container.innerHTML = "";
      var ex = project.exhibit || { type: "none" };
      try {
        if (ex.type === "demo" && ex.demo && window.PORTFOLIO_DEMOS) {
          var box = el("div", "demo");
          container.appendChild(box);
          window.PORTFOLIO_DEMOS.mountInto(box, ex.demo);
          // screenshots do NOT stack under the demo any more - they live in
          // the filmstrip, opened from the button on the project card
        } else if (ex.type === "webgl") {
          renderWebgl(container, ex, project.title);
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
