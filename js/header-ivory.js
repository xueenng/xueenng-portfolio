/* Preserve existing controls; native details owns the desktop popup. */
(function () {
  'use strict';
  function init() {
    var details = document.getElementById('nav-atmosphere');
    var overlay = document.getElementById('nav-overlay');
    var toggle = document.getElementById('nav-toggle');
    if (!details || !overlay || !toggle) return;
    var summary = details.querySelector('summary');
    function focusables() {
      return Array.from(overlay.querySelectorAll('a,button')).filter(function (n) { return !n.hidden && n.getClientRects().length && !n.disabled; });
    }
    document.addEventListener('click', function (event) {
      if (!details.contains(event.target)) details.open = false;
    });
    details.addEventListener('click', function (event) {
      if (event.target.closest('#btn-present,#btn-edit')) details.open = false;
    }, true);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && details.open) {
        details.open = false; summary.focus(); event.preventDefault();
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
      if (window.innerWidth <= 1100) details.open = false;
      if (window.innerWidth > 1100 && !overlay.hidden && window.PORTFOLIO_APP) window.PORTFOLIO_APP.navOverlay.close();
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
