/* Story railway: generated shelter/ticket art, live chapter copy, no saved state. */
(function () {
  'use strict';
  var memory = null, active = null;
  function node(tag, cls, text) {
    var e=document.createElement(tag); if(cls)e.className=cls;
    if(text!==undefined)e.textContent=text; return e;
  }
  function mount(content, host, openChapter, suu) {
    if(active)active();
    var chapters=content.timeline.slice().reverse(), count=chapters.length;
    host.replaceChildren(); if(!count)return;
    if(!memory || memory.count!==count) memory={count:count,at:count-1,seen:{}};
    var reduced=matchMedia('(prefers-reduced-motion: reduce)'), timer=null, running=false, resume=false, disposed=false;
    var controls=node('div','ja-controls js-controls');
    var start=node('button','ja-btn ja-btn-go','Start my journey →');start.type='button';start.setAttribute('aria-pressed','false');
    var reset=node('button','ja-btn ja-btn-off','Reset');reset.type='button';reset.title='Return to Today and clear arrival stamps';
    var progress=node('span','ja-progress');progress.setAttribute('role','status');progress.setAttribute('aria-live','polite');
    controls.append(start,reset,progress);host.append(controls);
    var scroller=node('div','js-scroll');scroller.tabIndex=0;scroller.setAttribute('role','region');scroller.setAttribute('aria-label','Journey stations. Scroll to explore all chapters.');
    var stage=node('div','js-railway');stage.style.setProperty('--stops',count);
    stage.style.setProperty('--station-columns',chapters.map(function(t){return /\b(present|current)\b/i.test(t.period||'')?'1.6fr':'1fr';}).join(' '));
    var stations=[],tickets=[],buttons=[];
    function label(t,i) {
      if(/\b(present|current)\b/i.test(t.period||''))return 'Today';
      if(/\bSPM\b/.test(t.role||''))return 'School';
      if(/Foundation/.test(t.role||''))return 'Foundation';
      if(/\bUTAR\b/.test(t.org||''))return 'UTAR';
      if(/\bIntern\b/i.test(t.role||''))return 'Internship';
      return t.role || 'Chapter '+(i+1);
    }
    // A short takeaway uses the authored first point. The full story remains
    // in the existing chapter reader, including every responsibility point.
    chapters.forEach(function(t,i){
      var today=/\b(present|current)\b/i.test(t.period||'');
      var station=node('div','js-station'+(today?' js-station--today':''));
      var shelter=node('div','js-shelter');
      var sign=node('button','js-stop');sign.type='button';sign.setAttribute('aria-label',(i+1)+'. '+(t.role||'Chapter')+' · '+(t.period||''));
      sign.append(node('b',null,today?(t.role||'Today'):label(t,i)),node('span',null,t.period||''));
      var building=node('img','js-station-art');building.src='assets/journey-story/'+(today?'current-station-v1.webp':'shelter-v1.webp');building.alt='';building.draggable=false;
      var original=(window.PORTFOLIO_CONTENT.timeline||[]).find(function(base){return base.role===t.role && base.org===t.org && base.period===t.period;});
      var unchanged=original && JSON.stringify(original.points)===JSON.stringify(t.points);
      var authored=t.highlight && (!original || t.highlight!==original.highlight || unchanged);
      var point=(authored && t.highlight) || (unchanged && original.highlight) || (t.points||[])[0] || '';
      var ticket=node('div','js-ticket');ticket.hidden=true;
      ticket.append(node('b','js-ticket-org',t.org||t.role||''));
      if(point)ticket.append(node('span','js-takeaway',point));
      var read=node('button','js-read','Read chapter →');read.type='button';
      read.setAttribute('aria-label','Read chapter '+(i+1)+': '+(t.role||''));
      read.addEventListener('click',function(){pause();openChapter(t,i);});
      ticket.append(read);sign.addEventListener('click',function(){pause();resume=false;start.textContent='Start my journey →';select(i,true);});
      shelter.append(building,sign,ticket);station.append(shelter);stage.append(station);
      stations.push(station);tickets.push(ticket);buttons.push(sign);
    });
    var train=node('div','js-train');train.setAttribute('aria-hidden','true');
    ['tender','engine'].forEach(function(part){var image=node('img','js-'+part);image.src='assets/journey/'+part+'.webp';image.alt='';image.draggable=false;train.append(image);});
    var rider=node('span','js-suu');rider.innerHTML=suu;train.append(rider);
    stage.append(train);scroller.append(stage);host.append(scroller);
    function position(animate) {
      var target=stations[memory.at];
      // Distinct anchors preserve the first hop without a hard left clamp.
      var first=stations[0],last=stations[count-1];
      var begin=first.offsetLeft+first.offsetWidth/2,end=last.offsetLeft+last.offsetWidth/2;
      var center=target.offsetLeft+target.offsetWidth/2;
      var ratio=end===begin?0:(center-begin)/(end-begin);
      var firstX=train.offsetWidth*.7,lastX=last.offsetLeft+last.offsetWidth*.13;
      var x=firstX+(lastX-firstX)*ratio;
      train.classList.toggle('js-moving',!!animate&&!reduced.matches);
      train.style.left=x+'px';
      // Scroll only this region; scrollIntoView would move the whole page.
      var left=Math.max(0,Math.min(stage.scrollWidth-scroller.clientWidth,center-scroller.clientWidth/2));
      scroller.scrollTo({left:left,behavior:'instant'});
    }
    function select(i,arrive) {
      if(disposed)return;
      memory.at=i;if(arrive)memory.seen[i]=true;
      stations.forEach(function(s,k){
        s.classList.toggle('js-current',k===i);s.classList.toggle('js-arrived',!!memory.seen[k]);
        buttons[k].setAttribute('aria-pressed',String(k===i));tickets[k].hidden=k!==i;
      });
      progress.textContent='Chapter '+(i+1)+' of '+count+' · '+label(chapters[i],i);
      position(arrive);
    }
    function pause(){if(running)resume=memory.at<count-1;running=false;clearTimeout(timer);timer=null;start.textContent=resume?'Resume journey →':'Start my journey →';start.setAttribute('aria-pressed','false');train.classList.remove('js-moving');}
    function next(){if(!running||disposed)return;if(memory.at===count-1){pause();return;}select(memory.at+1,true);timer=setTimeout(next,4200);}
    start.addEventListener('click',function(){
      if(running){pause();return;}
      running=true;start.textContent='Pause journey';start.setAttribute('aria-pressed','true');
      if(!resume)select(0,true);resume=false;timer=setTimeout(next,4200);
    });
    reset.addEventListener('click',function(){pause();memory.seen={};resume=false;start.textContent='Start my journey →';select(count-1,false);});
    function onResize(){position(false);}
    function onVisibility(){if(document.hidden)pause();}
    function onMode(){if(document.body.classList.contains('presenting')||document.body.classList.contains('editing'))pause();}
    function onHash(){pause();}
    var observer=new MutationObserver(onMode);observer.observe(document.body,{attributes:true,attributeFilter:['class']});
    window.addEventListener('resize',onResize);window.addEventListener('hashchange',onHash);document.addEventListener('visibilitychange',onVisibility);
    function cleanup(){disposed=true;pause();observer.disconnect();window.removeEventListener('resize',onResize);window.removeEventListener('hashchange',onHash);document.removeEventListener('visibilitychange',onVisibility);if(active===cleanup)active=null;}
    active=cleanup;select(memory.at,false);
  }
  window.PORTFOLIO_JOURNEY={mount:mount,stop:function(){if(active)active();}};
})();
