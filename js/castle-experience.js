/* Shared illustrated FYP story and 360 tour. All interaction stays semantic DOM. */
(function (root) {
  'use strict';
  var count=0, BASE='assets/selected/kellie-fyp/', visibleExperiences=new Set();
  function syncMascot(){document.body.classList.toggle('castle-in-view',visibleExperiences.size>0);}
  var ROOMS={
    outdoor:{name:'The castle lawn',image:'outdoor',pitch:0,notes:[['The handmade castle','The FYP model has a tall square tower, a long arcaded block and a cylindrical corner tower. The Blender gallery shows how these forms were built.'],['Explore the rooms','The original VR-360 menu lets visitors jump to Outdoor, Balcony and each of the three levels.']]},
    balcony:{name:'The upper balcony',image:'balcony',pitch:0,notes:[['An open gallery','Arched openings, a low balustrade and the round tower follow the project’s Blender model.'],['Look back inside','The tour is free exploration. Story puzzles are kept in the other mode, so touring cannot change your puzzle progress.']]},
    bedroom:{name:'Level 1 · The bedroom',image:'bedroom',pitch:-.12,notes:[['The diary fragments','The first level asks players to discover diary pages, read the family story and answer a quiz before a key appears.'],['The bedroom props','The folding screen, grandfather clock, oval mirrors, wardrobe and armchair come from the FYP screenshots.']]},
    study:{name:'Level 2 · The study',image:'study',pitch:-.05,notes:[['Find, then arrange','Portraits, the black chalk slate and books provide the clues for the second level’s message sequence.'],['A second key','The film shows the sequence being restored, then another key appearing.']]},
    final:{name:'Level 3 · The final room',image:'final',pitch:-.05,notes:[['Light reveals the clues','The film’s candle reveals hidden messages around the room. Their numbers lead to the final 1926 lock.'],['The floor-plan puzzle','The original level includes a timed floor-plan jigsaw. The browser version uses a six-piece illustrated adaptation.']]}
  };
  function mount(container, options) {
    options=options||{};var api=root.PORTFOLIO_CASTLE_STORY, q=api.createStory(), id=++count;
    var mode=options.initialMode||'story', started=mode==='tour', tourRoom='outdoor', currentRoom='', dialog=null;
    var disposed=false, markers=[], views={}, sfx=options.sounds, soundOn=false;
    if(sfx&&sfx.setMuted)sfx.setMuted(true);
    function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
    function btn(text,action,fn,cls){var b=el('button',cls||'cx-button',text);b.type='button';b.dataset.cxAction=action;b.onclick=fn;return b;}
    function sound(name){if(soundOn&&sfx&&sfx[name])sfx[name]();}
    var shell=el('section','castle-experience');shell.setAttribute('aria-label','Echoes in Kellie’s Castle · illustrated FYP experience');
    shell.dataset.cxMode=mode;container.classList.add('cx-host');container.appendChild(shell);
    var header=el('header','cx-header'), brand=el('div','cx-brand');brand.appendChild(el('span',null,'ECHOES IN KELLIE’S CASTLE'));brand.appendChild(el('small',null,'An illustrated browser adaptation of the FYP'));header.appendChild(brand);
    var modes=el('nav','cx-modes');modes.setAttribute('aria-label','Castle experience modes');
    var storyButton=btn('Escape story','story',function(){setMode('story');},'cx-mode');
    var tourButton=btn('Explore 360°','tour',function(){setMode('tour');},'cx-mode');
    if(!options.lockedMode){modes.appendChild(storyButton);modes.appendChild(tourButton);header.appendChild(modes);}shell.appendChild(header);
    var context=el('div','cx-context');shell.appendChild(context);
    var scene=el('div','cx-scene');shell.appendChild(scene);
    var hotspotLayer=el('div','cx-hotspots');scene.appendChild(hotspotLayer);
    var title=el('div','cx-scene-title');scene.appendChild(title);
    var footer=el('footer','cx-footer'),objective=el('p','cx-objective'),progress=el('span','cx-count'),actions=el('div','cx-actions');
    objective.setAttribute('role','status');footer.appendChild(objective);footer.appendChild(progress);footer.appendChild(actions);shell.appendChild(footer);
    var viewer=root.PORTFOLIO_CASTLE_PANORAMA.mount(scene,{onViewChange:positionMarkers});
    function positionMarkers(){markers.forEach(function(m){var p=viewer.project(m.point);m.button.hidden=!p.visible;m.button.style.left=p.x+'px';m.button.style.top=p.y+'px';});}
    function uv(u,v){return{yaw:(u-.5)*Math.PI*2,pitch:(.5-v)*Math.PI};}
    function marker(text,action,u,v,handler){var point=uv(u,v),b=btn(text,action,handler,'cx-hotspot');b.setAttribute('aria-label',text);b.title=text;
      var label=el('span',null,text);b.textContent='';b.appendChild(el('i',null,'✦'));b.appendChild(label);hotspotLayer.appendChild(b);markers.push({button:b,point:point});}
    function saveView(){if(currentRoom)views[mode+':'+currentRoom]=viewer.getView();}
    function setMode(next){if(next===mode)return;closeDialog();saveView();mode=next;shell.dataset.cxMode=mode;render();}
    function returnFocus(d){var target=shell.querySelector('[data-cx-action="'+(d.returnAction||'inspect')+'"]');if(!target||target.hidden||target.disabled)target=actions.querySelector('.cx-primary:not([disabled])')||shell.querySelector('[data-cx-action="inspect"]')||storyButton;if(target&&target.isConnected)target.focus({preventScroll:true});}
    function cleanup(d){if(d.cxCleanup){d.cxCleanup();d.cxCleanup=null;}}
    function closeDialog(){if(dialog){var d=dialog;dialog=null;cleanup(d);d.close();removePanel(d);returnFocus(d);}}
    function removePanel(d){d.parentElement.remove();[header,context,scene,footer].forEach(function(n){n.inert=false;});}
    function panel(heading,copy){var focusAction=dialog?dialog.returnAction:(document.activeElement.dataset.cxAction||'inspect');closeDialog();var d=el('dialog','cx-dialog'),head=el('div','cx-dialog-head'),h=el('h3',null,heading);h.id='cx-dialog-title-'+id;d.returnAction=focusAction;
      d.setAttribute('aria-labelledby',h.id);head.appendChild(h);head.appendChild(btn('Close','close',closeDialog,'cx-close'));d.appendChild(head);
      if(copy)d.appendChild(el('p','cx-dialog-copy',copy));var layer=el('div','cx-message-layer');layer.appendChild(d);shell.appendChild(layer);[header,context,scene,footer].forEach(function(n){n.inert=true;});dialog=d;
      d.addEventListener('close',function(){cleanup(d);if(dialog===d){dialog=null;removePanel(d);returnFocus(d);}});
      layer.addEventListener('click',function(e){if(e.target===layer)closeDialog();});
      d.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();closeDialog();return;}if(e.key!=='Tab')return;var items=Array.from(d.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled])')).filter(function(n){return !n.hidden;});var first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
      d.show();d.querySelector('.cx-close').focus({preventScroll:true});return d;}
    function updateContext(){context.innerHTML='';context.appendChild(el('strong',null,mode==='tour'?ROOMS[tourRoom].name:'Level '+q.state().level+' · '+['The diary','The study','The final room'][q.state().level-1]));
      var nav=el('div',mode==='tour'?'cx-room-buttons':'cx-levels');
      if(mode==='tour')Object.keys(ROOMS).forEach(function(key){var b=btn({outdoor:'Outdoor',balcony:'Balcony',bedroom:'Level 1',study:'Level 2',final:'Level 3'}[key],'visit-'+key,function(){closeDialog();saveView();tourRoom=key;render();},'cx-room-button');b.setAttribute('aria-pressed',String(key===tourRoom));nav.appendChild(b);});
      else ['Diary','Sequence','Hidden ink'].forEach(function(t,i){var n=el('span',null,(i+1)+' '+t);if(i+1===q.state().level)n.setAttribute('aria-current','step');if(i+1<q.state().level)n.className='done';nav.appendChild(n);});context.appendChild(nav);
      storyButton.setAttribute('aria-pressed',String(mode==='story'));tourButton.setAttribute('aria-pressed',String(mode==='tour'));
    }
    function render(){if(disposed)return;updateContext();hotspotLayer.innerHTML='';markers=[];scene.querySelectorAll('.cx-intro,.cx-complete').forEach(function(e){e.remove();});
      var s=q.state(),room=mode==='tour'?tourRoom:!started?'outdoor':s.level===1?'bedroom':s.level===2?'study':'final';
      currentRoom=room;shell.dataset.cxLevel=String(s.level);shell.dataset.cxComplete=String(s.complete);title.textContent=ROOMS[room].name;viewer.setLookEnabled(mode==='tour');
      viewer.setImage(BASE+ROOMS[room].image+'-v2.webp',views[mode+':'+room]||{yaw:0,pitch:ROOMS[room].pitch});
      if(mode==='tour'){
        marker('About this place','tour-note',.5,.50,function(){var d=panel(ROOMS[room].name,ROOMS[room].notes[0][1]);d.appendChild(el('p',null,ROOMS[room].notes[1][1]));});
      }else if(!started){var intro=el('div','cx-intro');intro.appendChild(el('span','cx-eyebrow','THREE LEVELS · ONE WAY OUT'));intro.appendChild(el('h3',null,'A castle full of unfinished stories'));
        intro.appendChild(el('p',null,'Find the diary, restore the messages, and bring the last secrets to light.'));
        intro.appendChild(btn('Begin the escape','begin',beginStory,'cx-primary'));scene.appendChild(intro);
      }else if(s.complete){var ending=el('div','cx-complete');ending.appendChild(el('span','cx-eyebrow','THE LOCK OPENS'));ending.appendChild(el('h3',null,'You found the way out'));
        ending.appendChild(el('p',null,'The diary, sequence and final room are complete. See the original VR gameplay and the project behind these puzzles.'));
        var a=el('a','cx-primary','Continue the full FYP experience →');a.href='kellie.html?v=castle-fyp-v2.4#k-play';a.dataset.cxAction='continue';ending.appendChild(a);scene.appendChild(ending);a.focus({preventScroll:true});
      }else if(s.level===1){api.DIARY.forEach(function(d,i){marker('Diary page '+(i+1),'diary-'+d.id,.40+i*.09,.80,function(){readDiary(d);});});}
      else if(s.level===2){marker('Portrait','find-portrait',.24,.44,function(){findFragment(api.FRAGMENTS[0]);});marker('Chalk slate','find-slate',.87,.43,function(){findFragment(api.FRAGMENTS[1]);});marker('Bookshelf','find-books',.38,.43,function(){findFragment(api.FRAGMENTS[2]);});}
      else{marker('Hidden paper','clue-tower',.12,.72,function(){revealPaper(api.CLUES[0]);});marker('Table note','clue-chambers',.53,.52,function(){revealPaper(api.CLUES[1]);});marker('Mirror note','clue-year',.90,.48,function(){revealPaper(api.CLUES[2]);});marker('Floor plan','plan',.72,.40,openPlan);marker('Exit lock','lock',.85,.47,openLock);}
      renderFooter();positionMarkers();
    }
    function primary(text,action,handler,disabled){var b=btn(text,action,handler,'cx-primary');b.disabled=!!disabled;actions.appendChild(b);}
    function renderFooter(){scene.querySelectorAll('.cx-scene-action').forEach(function(n){n.remove();});var focused=actions.contains(document.activeElement)?document.activeElement.dataset.cxAction:null;var s=q.state();actions.innerHTML='';
      if(mode==='tour'){objective.textContent='Drag to look around · arrow keys also turn the view.';progress.textContent=Object.keys(ROOMS).indexOf(tourRoom)+1+' / 5 locations';
        primary('About this location','location-info',function(){var d=panel(ROOMS[tourRoom].name,ROOMS[tourRoom].notes[0][1]);d.appendChild(el('p',null,ROOMS[tourRoom].notes[1][1]));});
      }else if(!started){objective.textContent='A short painted adaptation of the real FYP puzzles.';progress.textContent='Diaries · sequence · candle · floor plan';}
      else if(s.complete){objective.textContent='The final code was 1926. All three levels are complete.';progress.textContent='3 / 3 levels completed';}
      else if(s.level===1){progress.textContent=s.diary.length+' / 3 diary pages · '+s.quiz+' / 3 quiz answers';
        objective.textContent=s.key==='collected'?'The key is yours. Open the study.':s.key==='revealed'?'You earned the first key. Continue to the study.':s.diary.length===3?'The diary is complete. Answer its three questions.':'Inspect the three diary slips on the desk.';
        if(s.key!=='missing')sceneAction('Continue to the study','next-level',nextLevel);
        else if(s.diary.length===3)sceneAction('Answer the diary quiz','quiz',quiz);
      }else if(s.level===2){progress.textContent=s.fragments.length+' / 3 message fragments';objective.textContent=s.key==='collected'?'The second key opens the last room.':s.key==='revealed'?'You earned the second key. Enter the final room.':'Portrait, slate and books each hold a piece. Find them, then restore their order.';
        if(s.key!=='missing')sceneAction('Enter the final room','next-level',nextLevel);else primary('Arrange the messages','sequence',sequence,s.fragments.length!==3);
      }else{progress.textContent=s.clues.length+' / 3 hidden messages · plan '+(s.plan?'restored':'unfinished');objective.textContent=!s.candle?'Light the candle, then hold it close to the hidden papers.':s.clues.length<3?'Explore the paper, table and mirror. Their hidden numbers tell a year.':!s.plan?'You have the hidden messages. Rebuild the floor plan.':'Use the year hidden in the messages at the door lock.';
        if(!s.candle)primary('Light the candle','light-candle',function(){q.lightCandle();sound('chime');renderFooter();});else if(s.clues.length<3)primary('Find the hidden messages','papers',inspectRoom);else if(!s.plan)primary('Rebuild the floor plan','plan',openPlan);else primary('Open the final lock','lock',openLock);
      }
      if(mode==='story'&&started&&!s.complete)actions.appendChild(btn('Inspect room','inspect',inspectRoom));
      actions.appendChild(btn('Hint','hint',hint));actions.appendChild(btn('Reset','reset',reset));
      actions.appendChild(btn(soundOn?'Sound on':'Sound off','sound',function(){soundOn=!soundOn;if(sfx&&sfx.setMuted)sfx.setMuted(!soundOn);if(soundOn)sound('chime');renderFooter();}));
      if(focused){var again=actions.querySelector('[data-cx-action="'+focused+'"]');if(again&&!again.disabled)again.focus({preventScroll:true});}
    }
    function sceneAction(text,action,handler){scene.appendChild(btn(text,action,handler,'cx-primary cx-scene-action'));}
    function nextLevel(){q.collectKey();advance();}
    function keyReady(){var first=q.state().level===1,d=panel(first?'The first key appears':'The second key appears',first?'You solved the diary quiz. Your key opens the study.':'The messages are restored. Your key opens the final room.');d.appendChild(btn(first?'Continue to the study':'Enter the final room','next-level',nextLevel,'cx-primary'));}
    function collectKey(){q.collectKey();sound('unlock');renderFooter();}
    function focusInspect(){var b=actions.querySelector('[data-cx-action="inspect"]');if(b)b.focus({preventScroll:true});}
    function beginStory(){started=true;render();focusInspect();}
    function advance(){closeDialog();saveView();if(q.advance()){sound('creak');render();focusInspect();}}
    function readDiary(d){q.discover(d.id);sound('page');var p=panel('Diary · '+d.title,d.text);p.appendChild(el('small','cx-source','Adapted from the FYP diary “From Scotland to the Jungle”.'));renderFooter();if(q.state().diary.length===3&&q.state().quiz<3)p.appendChild(btn('Answer the diary quiz','quiz',quiz,'cx-primary'));}
    function findFragment(d){q.discover(d.id);sound('page');panel('Message fragment · '+d.title,d.text);renderFooter();}
    function inspectRoom(){var s=q.state(),d=panel('Explore this room','Select a marked object in the scene, or use these controls.');var list=el('div','cx-object-list');d.appendChild(list);
      if(s.level===1)api.DIARY.forEach(function(a,i){list.appendChild(btn('Read diary page '+(i+1)+(s.diary.indexOf(a.id)>=0?' ✓':''),'inspect-'+a.id,function(){readDiary(a);}));});
      else if(s.level===2)api.FRAGMENTS.forEach(function(a){list.appendChild(btn('Inspect '+a.title+(s.fragments.indexOf(a.id)>=0?' ✓':''),'inspect-'+a.id,function(){findFragment(a);}));});
      else{api.CLUES.forEach(function(a,i){list.appendChild(btn(['Inspect the paper','Inspect the table note','Inspect the mirror note'][i]+(s.clues.indexOf(a.id)>=0?' ✓':''),'inspect-'+a.id,function(){revealPaper(a);}));});list.appendChild(btn('Inspect the floor plan','inspect-plan',openPlan));list.appendChild(btn('Inspect the door lock','inspect-lock',openLock));}
    }
    function quiz(){var s=q.state();if(s.diary.length<3||s.quiz>=api.QUESTIONS.length)return;var question=api.QUESTIONS[s.quiz],d=panel('Diary quiz · '+(s.quiz+1)+' / 3',question.prompt),feedback=el('p','cx-feedback');feedback.setAttribute('role','status');
      var choices=el('div','cx-object-list');question.choices.forEach(function(answer){choices.appendChild(btn(answer,'answer',function(){if(!q.answer(answer)){feedback.textContent='That does not match the diary. Read the fragments and try again.';sound('error');return;}sound('chime');closeDialog();renderFooter();if(q.state().quiz<3)quiz();else keyReady();}));});d.appendChild(choices);d.appendChild(feedback);}
    function sequence(){var s=q.state();if(s.fragments.length<3)return;var d=panel('Restore the message sequence','First preserve the past, then put thought in order, then turn to knowledge. Choose the three fragments in that order.');var chosen=[],slots=el('div','cx-sequence-slots'),choices=el('div','cx-object-list'),feedback=el('p','cx-feedback');feedback.setAttribute('role','status');d.appendChild(slots);d.appendChild(choices);
      function draw(focusAction){slots.innerHTML='';choices.innerHTML='';chosen.forEach(function(id,i){var f=api.FRAGMENTS.find(function(a){return a.id===id;});slots.appendChild(btn((i+1)+'. '+f.title+' ×','remove-'+id,function(){chosen.splice(i,1);draw('choose-'+id);}));});[api.FRAGMENTS[2],api.FRAGMENTS[0],api.FRAGMENTS[1]].forEach(function(f){if(chosen.indexOf(f.id)<0)choices.appendChild(btn(f.title+' · '+f.text,'choose-'+f.id,function(){chosen.push(f.id);draw('remove-'+f.id);}));});if(focusAction){var focus=d.querySelector('[data-cx-action="'+focusAction+'"]');if(focus)focus.focus({preventScroll:true});}}
      d.appendChild(btn('Check the sequence','check-sequence',function(){if(!q.submitSequence(chosen)){feedback.textContent='The sequence does not fit yet. Review the clues and change the order.';sound('error');return;}sound('chime');closeDialog();renderFooter();keyReady();},'cx-primary'));d.appendChild(feedback);draw();}
    function revealPaper(clue){var state=q.state();if(!state.candle){var dark=panel(clue.title,'There is no readable ink yet. Light the candle first.');dark.appendChild(btn('Light the candle','light-candle',function(){q.lightCandle();sound('chime');revealPaper(clue);},'cx-primary'));renderFooter();return;}
      if(state.clues.indexOf(clue.id)>=0){panel(clue.title,clue.text);return;}
      var d=panel(clue.title,'Bring the lit candle close to the paper. Drag it, use arrow keys, or select the button below.');
      var area=el('div','cx-reveal-area'),paper=el('div','cx-hidden-paper'),ink=el('p','cx-hidden-ink');ink.hidden=true;paper.appendChild(ink);area.appendChild(paper);
      var candle=btn('','moving-candle',function(){},'cx-moving-candle');candle.setAttribute('aria-label','Lit candle: drag or use arrow keys to bring it close to the paper');area.appendChild(candle);d.appendChild(area);
      var x=.13,y=.62,drag=false,revealed=false;
      function move(nx,ny){x=Math.max(.05,Math.min(.95,nx));y=Math.max(.1,Math.min(.9,ny));candle.style.left=x*100+'%';candle.style.top=y*100+'%';
        var r=area.getBoundingClientRect(),p=paper.getBoundingClientRect(),px=r.left+x*r.width,py=r.top+y*r.height;
        var distance=Math.hypot(Math.max(p.left-px,px-p.right,0)/r.width,Math.max(p.top-py,py-p.bottom,0)/r.height);
        if(!revealed&&q.illuminate(clue.id,distance)){revealed=true;ink.hidden=false;ink.textContent=clue.text;area.dataset.revealed='true';sound('chime');renderFooter();}}
      candle.addEventListener('pointerdown',function(e){drag=true;candle.setPointerCapture(e.pointerId);e.preventDefault();});candle.addEventListener('pointermove',function(e){if(!drag)return;var r=area.getBoundingClientRect();move((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);});candle.addEventListener('pointerup',function(){drag=false;});candle.addEventListener('pointercancel',function(){drag=false;});
      candle.addEventListener('keydown',function(e){var steps={ArrowLeft:[-.07,0],ArrowRight:[.07,0],ArrowUp:[0,-.07],ArrowDown:[0,.07]};if(!steps[e.key])return;e.preventDefault();move(x+steps[e.key][0],y+steps[e.key][1]);});move(x,y);
      d.appendChild(btn('Hold candle close to the paper','hold-candle',function(){var r=area.getBoundingClientRect(),p=paper.getBoundingClientRect();move((p.left-r.left)/r.width-.09,((p.top+p.bottom)/2-r.top)/r.height);},'cx-primary'));
    }
    function openPlan(){var s=q.state();if(s.clues.length<3){panel('The unfinished floor plan','Find all three candle-revealed messages before restoring the plan.');return;}
      if(s.plan){panel('The floor plan is restored','The plan is complete. The door lock is waiting for the year hidden in your messages.');return;}
      var d=panel('Rebuild the floor plan','Select two pieces to swap them. Mouse dragging also works. Restore the long galleries and round towers.'),pieces=[2,5,1,4,0,3],selected=-1,remaining=120,timed=false;
      var option=el('label','cx-timer-option'),toggle=el('input');toggle.type='checkbox';option.appendChild(toggle);option.appendChild(document.createTextNode(' 120-second challenge (optional)'));d.appendChild(option);
      var timer=el('p','cx-timer','Relaxed mode · no time limit'),board=el('div','cx-plan-board'),feedback=el('p','cx-feedback');feedback.setAttribute('role','status');d.appendChild(timer);d.appendChild(board);
      function swap(a,b){if(a<0||b<0||a>5||b>5)return;var t=pieces[a];pieces[a]=pieces[b];pieces[b]=t;selected=-1;draw();}
      function draw(){pieces.forEach(function(piece,index){var tile=board.children[index];if(!tile){tile=btn('','tile-'+index,function(){if(selected<0){selected=index;draw();}else swap(selected,index);},'cx-plan-piece');tile.draggable=true;tile.ondragstart=function(e){e.dataTransfer.setData('text/plain',String(index));};tile.ondragover=function(e){e.preventDefault();};tile.ondrop=function(e){e.preventDefault();var from=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(from))swap(from,index);};board.appendChild(tile);}tile.setAttribute('aria-label','Floor plan piece '+(piece+1)+' in position '+(index+1));tile.setAttribute('aria-pressed',String(selected===index));tile.style.backgroundPosition=(piece%3)*50+'% '+Math.floor(piece/3)*100+'%';});}
      toggle.onchange=function(){timed=toggle.checked;remaining=120;timer.textContent=timed?'Time left: 120s':'Relaxed mode · no time limit';};
      var interval=setInterval(function(){if(!timed||!d.open||document.hidden)return;remaining--;timer.textContent='Time left: '+remaining+'s';if(remaining<=0){timed=false;toggle.checked=false;pieces=[2,5,1,4,0,3];selected=-1;draw();timer.textContent='Time ran out · try again, or continue in relaxed mode.';}},1000);d.cxCleanup=function(){clearInterval(interval);};
      d.appendChild(btn('Check the floor plan','check-plan',function(){if(!q.submitPlan(pieces)){feedback.textContent='The walls do not join yet. Swap the pieces and try again.';sound('error');return;}sound('chime');closeDialog();renderFooter();panel('The floor plan is restored','Now use the year hidden in the messages at the final lock.');},'cx-primary'));d.appendChild(feedback);draw();
    }
    function openLock(){var s=q.state();if(s.clues.length<3||!s.plan){panel('The final lock','The three hidden messages and completed floor plan are needed first.');return;}
      var d=panel('The final combination lock','One tower. Nine chambers. Two and six. Enter the year the messages reveal.'),form=el('form','cx-code-form'),label=el('label',null,'Final door code'),input=el('input'),feedback=el('p','cx-feedback');label.htmlFor='cx-code-'+id;input.id=label.htmlFor;input.inputMode='numeric';input.type='text';input.maxLength=4;input.pattern='[0-9]{4}';input.required=true;input.autocomplete='off';feedback.setAttribute('role','status');
      form.appendChild(label);form.appendChild(input);var submit=el('button','cx-primary','Unlock the door');submit.type='submit';form.appendChild(submit);form.appendChild(feedback);
      form.onsubmit=function(e){e.preventDefault();if(!q.unlock(input.value.trim())){feedback.textContent='The lock stays shut. Review the hidden messages.';input.setAttribute('aria-invalid','true');sound('error');return;}sound('unlock');closeDialog();render();};d.appendChild(form);input.focus();
    }
    function hint(){var s=q.state();var text=mode==='tour'?'Drag the scene or focus it and use arrow keys. The location buttons jump to the five viewpoints shown by the FYP menu.':!started?'Begin the escape. The three rooms follow the structure of the recorded FYP.':s.level===1?'Read all three diary pages. The quiz asks about Mother’s home, the jungle, and who financed the dream.':s.level===2?'The order is past, thought, knowledge: portrait, slate, books. Find every fragment first.':'Light the candle and reveal all three papers. The words ONE, NINE, TWO and SIX form a year. Restore the six plan pieces before trying the door.';panel('A little help',text);}
    function reset(){closeDialog();if(mode==='tour'){saveView();tourRoom='outdoor';Object.keys(views).filter(function(k){return k.indexOf('tour:')===0;}).forEach(function(k){delete views[k];});}else{q.reset();started=false;Object.keys(views).filter(function(k){return k.indexOf('story:')===0;}).forEach(function(k){delete views[k];});}render();}
    function dispose(){if(disposed)return;disposed=true;closeDialog();viewer.destroy();observer.disconnect();visibility.disconnect();visibleExperiences.delete(shell);syncMascot();}
    var onceConnected=false,observer=new MutationObserver(function(){if(shell.isConnected)onceConnected=true;else if(onceConnected)dispose();});observer.observe(document.body,{childList:true,subtree:true});onceConnected=shell.isConnected;
    var visibility=new IntersectionObserver(function(entries){if(disposed)return;if(entries[0].isIntersecting)visibleExperiences.add(shell);else visibleExperiences.delete(shell);syncMascot();});visibility.observe(shell);
    render();return{destroy:dispose,start:function(){if(mode!=='story'){saveView();mode='story';shell.dataset.cxMode=mode;}beginStory();},reset:reset};
  }
  root.PORTFOLIO_CASTLE_EXPERIENCE={mount:mount,rooms:ROOMS};
})(window);
