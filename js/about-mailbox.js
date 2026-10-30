(function () {
  'use strict';
  var section=document.getElementById('about');
  var trigger=document.getElementById('about-mailbox-toggle');
  var reveal=document.getElementById('about-reveal');
  var fold=document.getElementById('about-mailbox-fold');
  if(!section||!trigger||!reveal||!fold) return;
  var label=trigger.querySelector('.mailbox-label');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  var timer;
  function open(animate) {
    var wasClosed=reveal.hidden;
    reveal.hidden=false;
    trigger.setAttribute('aria-expanded','true');
    label.textContent='My letter is open below ↓';
    section.classList.add('mailbox-is-open');
    if(wasClosed&&animate&&!reduce.matches) {
      trigger.classList.add('is-opening');reveal.classList.add('is-opening');
      clearTimeout(timer);timer=setTimeout(function(){trigger.classList.remove('is-opening');reveal.classList.remove('is-opening');},1000);
    }
  }
  function close() {
    clearTimeout(timer);trigger.classList.remove('is-opening');reveal.classList.remove('is-opening');
    reveal.hidden=true;trigger.setAttribute('aria-expanded','false');
    label.textContent='Open my letter →';section.classList.remove('mailbox-is-open');
    trigger.focus({preventScroll:true});
    var castle=trigger.closest('#castle');
    (castle||trigger).scrollIntoView({behavior:reduce.matches?'auto':'smooth',block:castle?'start':'center'});
  }
  trigger.addEventListener('click',function(){
    open(true);
    document.getElementById('about-heading').focus({preventScroll:true});
    reveal.scrollIntoView({behavior:reduce.matches?'auto':'smooth',block:'start'});
  });
  fold.addEventListener('click',close);
  // Run before the site's existing delegated anchor scrolling.
  document.addEventListener('click',function(event){
    var a=event.target.closest('a[href]');if(!a)return;
    var url=new URL(a.href,location.href);
    if(url.origin===location.origin&&url.pathname===location.pathname&&(url.hash==='#about'||url.hash==='#contact'))open(false);
  },true);
  window.addEventListener('hashchange',function(){if(location.hash==='#about'||location.hash==='#contact')open(false);});
  new MutationObserver(function(){if(document.body.classList.contains('editing')||document.body.classList.contains('presenting'))open(false);}).observe(document.body,{attributes:true,attributeFilter:['class']});
  section.classList.add('mailbox-ready');
  document.body.classList.add('castle-mailbox-ready');
  reveal.hidden=true;
  if(location.hash==='#about'||location.hash==='#contact') {
    open(false);
    requestAnimationFrame(function(){document.querySelector(location.hash).scrollIntoView({block:'start'});});
  }
})();
