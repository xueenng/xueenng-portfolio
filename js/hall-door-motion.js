/* Painted Hall doorway. Reuses the station image; no stored state or new artwork. */
(function(){
  'use strict';
  function cancel(hall,restoreFocus){
    var state=hall&&hall._doorOpening;
    if(state)state.cleanup();
    if(!hall)return;
    hall.classList.remove('opening','hall-opening-reduced');
    if(restoreFocus&&state&&state.opener&&state.opener.isConnected)state.opener.focus({preventScroll:true});
  }
  function mount(hall){
    cancel(hall,false);
    hall.querySelectorAll('.hall-door-visual,.hall-motion-spill').forEach(function(node){node.remove();});
    hall.classList.add('has-door-motion');
    var visual=document.createElement('span');visual.className='hall-door-visual';visual.setAttribute('aria-hidden','true');
    visual.innerHTML='<span class="hall-motion-aperture"><span class="hall-motion-interior"></span><span class="hall-motion-leaf hall-motion-left"></span><span class="hall-motion-leaf hall-motion-right"></span><span class="hall-motion-seam"></span></span>';
    var spill=document.createElement('span');spill.className='hall-motion-spill';spill.setAttribute('aria-hidden','true');spill.innerHTML='<span class="hall-motion-floor"></span>';
    hall.appendChild(spill);hall.appendChild(visual);
  }
  function start(hall,onReady,opener){
    if(!hall||hall._doorOpening||hall._busy||document.body.classList.contains('editing')||document.body.classList.contains('presenting'))return false;
    if(!hall.classList.contains('has-door-motion'))mount(hall);
    var buttons=Array.from(hall.querySelectorAll('.hall-hit,.hall-enter,.hall-suu'));
    var disabled=buttons.map(function(button){return button.disabled;});
    var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var state={opener:opener||document.activeElement,timer:null,cleanup:null,hash:location.hash};
    function onEscape(event){if(event.key==='Escape'){event.preventDefault();cancel(hall,true);}}
    function onNavigate(){cancel(hall,false);}
    var modeObserver=new MutationObserver(function(){if(document.body.classList.contains('editing')||document.body.classList.contains('presenting'))cancel(hall,false);});
    state.cleanup=function(){
      clearTimeout(state.timer);modeObserver.disconnect();document.removeEventListener('keydown',onEscape);window.removeEventListener('hashchange',onNavigate);
      if(hall._doorOpening===state){hall._doorOpening=null;hall._busy=false;hall.removeAttribute('aria-busy');}
      buttons.forEach(function(button,i){button.disabled=disabled[i];});
    };
    hall._doorOpening=state;hall._busy=true;hall.setAttribute('aria-busy','true');buttons.forEach(function(button){button.disabled=true;});
    hall.classList.toggle('hall-opening-reduced',reduced);hall.classList.add('opening');
    document.addEventListener('keydown',onEscape);window.addEventListener('hashchange',onNavigate);
    modeObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
    state.timer=setTimeout(function(){
      if(hall._doorOpening!==state)return;
      if(!hall.isConnected||location.hash!==state.hash||document.body.classList.contains('editing')||document.body.classList.contains('presenting')){cancel(hall,false);return;}
      state.cleanup();if(onReady)onReady();
    },reduced?120:700);
    return true;
  }
  window.PORTFOLIO_HALL_DOOR={mount:mount,start:start,cancel:cancel};
})();
