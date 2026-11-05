/* Preserve existing controls; native details owns the desktop popup. */
(function () {
  'use strict';
  function init() {
    var details = document.getElementById('nav-atmosphere');
    var overlay = document.getElementById('nav-overlay');
    var toggle = document.getElementById('nav-toggle');
    if (!details || !overlay || !toggle) return;
    var summary = details.querySelector('summary');
    var owner = document.getElementById('nav-owner');
    var edit = document.getElementById('btn-edit');
    var mobileOwner = document.getElementById('ov-owner');
    function syncOwner() {
      var admin = document.getElementById('nav-admin');
      owner.hidden = !admin && edit.hidden;
      if (owner.hidden) owner.open = false;
      mobileOwner.replaceChildren();
      mobileOwner.hidden = owner.hidden;
      if (owner.hidden) return;
      var label = document.createElement('p');
      label.className = 'nav-tools-label'; label.textContent = 'Owner tools';
      mobileOwner.appendChild(label);
      if (!edit.hidden) {
        var pencil = document.createElement('button');
        pencil.textContent = 'Edit site';
        pencil.addEventListener('click', function () { window.PORTFOLIO_APP.navOverlay.close(); edit.click(); });
        mobileOwner.appendChild(pencil);
      }
      if (admin) {
        var link = admin.cloneNode(true); link.removeAttribute('id');
        mobileOwner.appendChild(link);
      }
    }
    syncOwner();
    new MutationObserver(syncOwner).observe(edit, { attributes:true, attributeFilter:['hidden'] });
    var lantern = document.getElementById('btn-lantern');
    var mobileLantern = document.getElementById('ov-lantern');
    function syncLantern() { mobileLantern.setAttribute('aria-pressed', lantern.getAttribute('aria-pressed')); }
    syncLantern();
    mobileLantern.addEventListener('click', function () { lantern.click(); syncLantern(); });
    new MutationObserver(syncLantern).observe(lantern, { attributes:true, attributeFilter:['aria-pressed'] });
    function focusables() {
      return Array.from(overlay.querySelectorAll('a,button')).filter(function (n) { return !n.hidden && n.getClientRects().length && !n.disabled; });
    }
    document.addEventListener('click', function (event) {
      if (!details.contains(event.target)) details.open = false;
      if (!owner.contains(event.target)) owner.open = false;
    });
    details.addEventListener('click', function (event) {
      if (event.target.closest('#btn-present,#btn-edit')) details.open = false;
    }, true);
    owner.addEventListener('click', function (event) { if (event.target.closest('#btn-edit')) owner.open = false; }, true);
    [details, owner].forEach(function (menu) {
      menu.addEventListener('toggle', function () { if (menu.open) (menu === owner ? details : owner).open = false; });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && details.open) {
        details.open = false; summary.focus(); event.preventDefault();
      }
      if (event.key === 'Escape' && owner.open) {
        owner.open = false; owner.querySelector('summary').focus(); event.preventDefault();
      }
      if (event.key === 'Escape' && overlay.contains(event.target)) toggle.focus();
      if (event.key !== 'Tab' || overlay.hidden) return;
      var nodes = focusables(), first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    toggle.addEventListener('click', function () {
      if (!overlay.hidden) { var nodes = focusables(); if (nodes.length) nodes[0].focus(); }
    });
    document.getElementById('nav-overlay-close').addEventListener('click', function () { toggle.focus(); });
    window.addEventListener('resize', function () {
      if (window.innerWidth <= 1200) { details.open = false; owner.open = false; }
      if (window.innerWidth > 1200 && !overlay.hidden && window.PORTFOLIO_APP) window.PORTFOLIO_APP.navOverlay.close();
    });
    function syncCurrent() {
      document.querySelectorAll('.nav-links a,.nav-overlay-links a').forEach(function (link) {
        if (link.getAttribute('href') === location.hash) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    window.addEventListener('hashchange', syncCurrent);
    syncCurrent();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
