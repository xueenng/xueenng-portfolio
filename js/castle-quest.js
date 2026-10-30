/* Three-room portfolio teaser. Artwork is scenery; clues and controls are DOM. */
(function (root) {
  'use strict';
  var CODE = '4276';
  function createQuest() {
    var s;
    function reset() {
      s = { phase: 'bedroom', diaryRead: false, key: 'missing', lanternLit: false,
        lantern: { x: .24, y: .7 }, messageRevealed: false, escaped: false };
    }
    function reveal() {
      if (s.phase === 'study' && s.lanternLit &&
          Math.hypot(s.lantern.x - .64, s.lantern.y - .67) < .16) s.messageRevealed = true;
    }
    reset();
    return {
      state: function () { return Object.assign({}, s, { lantern: Object.assign({}, s.lantern) }); },
      reset: reset,
      readDiary: function () { if (s.phase === 'bedroom') s.diaryRead = true; },
      answerDiary: function (answer) {
        if (s.phase !== 'bedroom' || !s.diaryRead || answer !== '1915') return false;
        if (s.key === 'missing') s.key = 'revealed'; return true;
      },
      collectKey: function () { if (s.phase === 'bedroom' && s.key === 'revealed') s.key = 'collected'; },
      enterStudy: function () {
        if (s.phase !== 'bedroom' || s.key !== 'collected') return false;
        s.phase = 'study'; return true;
      },
      lightLantern: function () { if (s.phase === 'study') { s.lanternLit = true; reveal(); } },
      moveLantern: function (x, y) {
        if (s.phase !== 'study' || !Number.isFinite(x) || !Number.isFinite(y)) return;
        s.lantern = { x: Math.max(.08, Math.min(.92, x)), y: Math.max(.2, Math.min(.88, y)) };
        reveal();
      },
      enterDoor: function () {
        if (s.phase !== 'study' || !s.messageRevealed) return false;
        s.phase = 'door'; return true;
      },
      unlockDoor: function (code) {
        if (s.phase !== 'door' || !s.messageRevealed || code !== CODE) return false;
        s.phase = 'complete'; s.escaped = true; return true;
      }
    };
  }
  function mount(stage, sounds) {
    var q = createQuest(), room = document.createElement('section'), dialog;
    room.className = 'ke-prologue'; room.hidden = true;
    room.setAttribute('aria-label', "Kellie's Castle three-room escape");
    stage.appendChild(room);
    function el(tag, cls, text) {
      var node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text !== undefined) node.textContent = text;
      return node;
    }
    function sound(name) { if (sounds && sounds[name]) sounds[name](); }
    function button(cls, text, action, handler) {
      var node = el('button', cls, text); node.type = 'button';
      node.dataset.keAction = action; node.onclick = handler; return node;
    }
    function closeDialog() { if (dialog) { dialog.close(); dialog.remove(); dialog = null; } }
    function panel(title, text) {
      closeDialog();
      dialog = el('dialog', 'kep-dialog');
      var head = el('div', 'kep-dialog-head'), heading = el('h4', null, title);
      heading.id = 'kep-dialog-title'; dialog.setAttribute('aria-labelledby', heading.id);
      head.appendChild(heading);
      head.appendChild(button('kep-close', 'Close', 'close', closeDialog));
      dialog.appendChild(head); dialog.appendChild(el('p', null, text));
      document.body.appendChild(dialog); dialog.showModal();
      dialog.addEventListener('click', function (e) { if (e.target === dialog) {
        var r = dialog.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog();
      }});
      return dialog;
    }
    function render(focusAction) {
      var s = q.state(); room.innerHTML = ''; room.dataset.kePhase = s.phase;
      var copy = el('div', 'kep-copy');
      var names = { bedroom: '1 · THE BEDROOM', study: '2 · THE HIDDEN MESSAGE', door: '3 · THE LOCKED DOOR', complete: 'THREE ROOMS · COMPLETE' };
      var instructions = { bedroom: s.key === 'collected' ? 'Use the key to enter the study.' : 'Read the diary. Find the year that releases the key.',
        study: 'Light the lantern, then bring its warmth close to the blank paper.',
        door: 'The message holds the four-digit code. Use it to open the door.', complete: 'The lock has opened. Your adventure has only just begun.' };
      copy.appendChild(el('span', 'kep-kicker', names[s.phase]));
      copy.appendChild(el('p', null, instructions[s.phase])); room.appendChild(copy);
      var progress = el('ol', 'kep-progress'); progress.setAttribute('aria-label', 'Escape progress');
      ['Diary', 'Lantern', 'Door'].forEach(function (name, i) {
        var item = el('li', null, (i + 1) + ' ' + name);
        var active = s.phase === 'bedroom' ? 0 : s.phase === 'study' ? 1 : 2;
        if (i === active) item.setAttribute('aria-current', 'step');
        if (i < active || s.escaped) item.className = 'done'; progress.appendChild(item);
      }); room.appendChild(progress);
      var footer = el('div', 'kep-footer'), status = el('p', 'kep-status');
      status.setAttribute('role', 'status'); footer.appendChild(status);
      room.appendChild(footer);
      if (s.phase === 'bedroom') {
        room.appendChild(button('kep-hotspot kep-diary', 'Read the diary', 'diary', function () {
          q.readDiary();
          var d = panel('A page from the diary', 'A pencilled note reads: “The lock remembers 1915.” Which year will release the key?');
          var answers = el('div', 'kep-answers');
          ['1905', '1915', '1926'].forEach(function (year) {
            answers.appendChild(button('ke-woodbtn', year, 'quiz', function () {
              if (!q.answerDiary(year)) { d.querySelector('p').textContent = 'That year does not match the note. Look at the diary again: 1915.'; return; }
              closeDialog(); sound('chime'); render('key');
            }));
          }); d.appendChild(answers);
        }));
        if (s.key === 'revealed') {
          var key = button('kep-key', '', 'key', function () { q.collectKey(); sound('unlock'); render('study'); });
          key.dataset.keState = 'key-revealed'; key.setAttribute('aria-label', 'Collect the key revealed by the diary');
          room.appendChild(key); status.textContent = 'A key has appeared. Collect it from the desk.';
        } else if (s.key === 'collected') {
          room.appendChild(button('kep-hotspot kep-exit', 'Unlock the study', 'study', function () {
            if (q.enterStudy()) { sound('creak'); render('lantern'); }
          })); status.textContent = 'Key collected · the study is waiting.';
        } else status.textContent = 'Select the diary on the desk to begin.';
      } else if (s.phase === 'study') {
        var paper = button('kep-paper', '', 'paper', function () {
          if (!q.state().lanternLit) { status.textContent = 'The paper looks blank. Light the lantern first.'; return; }
          q.moveLantern(.51, .67); syncLantern();
        }); paper.setAttribute('aria-label', 'Inspect the blank paper'); room.appendChild(paper);
        var message = el('div', 'kep-message'); message.hidden = true; room.appendChild(message);
        var lantern = button('kep-lantern', '', 'lantern', function () {
          if (!q.state().lanternLit) { q.lightLantern(); sound('chime'); }
          syncLantern();
        });
        lantern.setAttribute('aria-label', 'Light the lantern');
        lantern.setAttribute('aria-describedby', 'kep-lantern-help'); room.appendChild(lantern);
        var help = el('span', 'sr-only', 'Once lit, drag the lantern over the paper, use arrow keys to move it, or select the paper to hold the lantern over it.');
        help.id = 'kep-lantern-help'; room.appendChild(help);
        var next = button('ke-woodbtn', 'Go to the locked door →', 'door', function () {
          if (q.enterDoor()) render('lock');
        }); next.hidden = true; footer.appendChild(next);
        var dragging = false, wasRevealed = false;
        lantern.addEventListener('pointerdown', function (e) {
          if (!q.state().lanternLit) return;
          dragging = true; lantern.setPointerCapture(e.pointerId); e.preventDefault();
        });
        lantern.addEventListener('pointermove', function (e) {
          if (!dragging) return;
          var r = room.getBoundingClientRect(); q.moveLantern((e.clientX-r.left)/r.width, (e.clientY-r.top)/r.height); syncLantern();
        });
        lantern.addEventListener('pointerup', function () { dragging = false; });
        lantern.addEventListener('pointercancel', function () { dragging = false; });
        lantern.addEventListener('keydown', function (e) {
          var offsets = { ArrowLeft: [-.05, 0], ArrowRight: [.05, 0], ArrowUp: [0, -.05], ArrowDown: [0, .05] };
          if (!offsets[e.key] || !q.state().lanternLit) return;
          e.preventDefault(); var pos = q.state().lantern; q.moveLantern(pos.x+offsets[e.key][0], pos.y+offsets[e.key][1]); syncLantern();
        });
        function syncLantern() {
          var state = q.state(); lantern.style.left = state.lantern.x*100+'%'; lantern.style.top = state.lantern.y*100+'%';
          lantern.classList.toggle('is-lit', state.lanternLit);
          lantern.setAttribute('aria-label', state.lanternLit ? 'Lit lantern — drag or use arrow keys to move' : 'Light the lantern');
          paper.setAttribute('aria-label', state.lanternLit ? 'Hold the lit lantern over the paper' : 'Inspect the blank paper');
          if (state.messageRevealed) {
            message.hidden = false; message.innerHTML = '<span>The hidden ink awakens</span><strong>4 · 2 · 7 · 6</strong><small>The door code.</small>';
            room.dataset.keMessage = 'revealed'; next.hidden = false;
            status.textContent = 'Message revealed · remember the code, then approach the door.';
            if (!wasRevealed) sound('chime'); wasRevealed = true;
          } else status.textContent = state.lanternLit ? 'Drag the lit lantern towards the paper · or select the paper.' : 'Select the lantern on the brass tray to light it.';
        }
        syncLantern();
      } else if (s.phase === 'door') {
        room.appendChild(button('kep-hotspot kep-lock', 'Examine the lock', 'lock', function () {
          var d = panel('The brass combination lock', 'Enter the four digits revealed by the lantern.');
          var form = el('form', 'kep-code-form'), label = el('label', null, 'Door code'); label.htmlFor = 'kep-door-code';
          var input = el('input'); input.id = 'kep-door-code'; input.name = 'code'; input.type = 'text';
          input.inputMode = 'numeric'; input.autocomplete = 'off'; input.maxLength = 4; input.pattern = '[0-9]{4}'; input.required = true;
          var feedback = el('p', 'kep-code-feedback'); feedback.setAttribute('role', 'status');
          form.appendChild(label); form.appendChild(input);
          var unlock = el('button', 'ke-woodbtn', 'Unlock the door'); unlock.type = 'submit'; form.appendChild(unlock); form.appendChild(feedback);
          form.onsubmit = function (e) {
            e.preventDefault();
            if (!q.unlockDoor(input.value.trim())) { feedback.textContent = 'The lock stays shut. Check the numbers on the paper.'; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
            closeDialog(); sound('unlock'); sound('creak'); render('continue');
          }; d.appendChild(form); input.focus();
        }));
        footer.appendChild(button('ke-woodbtn', '← Read the revealed message', 'remember', function () {
          panel('The lantern revealed', 'The hidden message reads: 4 · 2 · 7 · 6.');
        })); status.textContent = 'Find the brass lock on the right side of the door.';
      } else {
        var ending = el('div', 'kep-ending'); ending.appendChild(el('span', 'kep-kicker', 'YOU OPENED THE DOOR'));
        ending.appendChild(el('h4', null, 'Step deeper into the castle'));
        ending.appendChild(el('p', null, 'You found the key, brought hidden ink to light, and opened the lock. Explore the complete VR project and its three levels.'));
        var link = el('a', 'ke-woodbtn', 'Continue the full experience →'); link.href = 'kellie.html#k-play'; link.dataset.keAction = 'continue'; ending.appendChild(link);
        room.appendChild(ending); status.textContent = 'Diary ✓ Lantern ✓ Door ✓';
      }
      if (focusAction) { var target = room.querySelector('[data-ke-action="'+focusAction+'"]'); if (target) target.focus({ preventScroll: true }); }
    }
    return {
      start: function () { closeDialog(); q.reset(); room.hidden = false; render('diary'); },
      reset: function () { closeDialog(); q.reset(); room.hidden = true; room.innerHTML = ''; delete room.dataset.keMessage; }
    };
  }
  if (typeof module === 'object' && module.exports) module.exports = { createQuest: createQuest };
  else root.PORTFOLIO_CASTLE_QUEST = { mount: mount, createQuest: createQuest };
})(typeof window !== 'undefined' ? window : globalThis);
