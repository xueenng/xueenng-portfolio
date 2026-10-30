/* A browser adaptation of the three FYP levels, grounded in the project film. */
(function (root) {
  'use strict';
  var DIARY = [
    { id: 'home', title: 'From Scotland to the Jungle', text: 'Mother arrived from Scotland. The jungle greeted her with rain and heat. She missed home, but supported Father with quiet strength.' },
    { id: 'dream', title: 'A palace waiting to be built', text: 'The land was rough, but Father saw a palace waiting to be built. Mother financed the dream.' },
    { id: 'hope', title: 'The family behind the dream', text: 'She supported Father even as the dream grew. We hoped it would not break him. These pages remember a family, not just a building.' }
  ];
  var QUESTIONS = [
    { prompt: 'Where did Mother arrive from?', choices: ['Scotland', 'The veranda', 'The study'], answer: 'Scotland' },
    { prompt: 'What greeted her in the jungle?', choices: ['Rain and heat', 'Snow and ice', 'A quiet winter'], answer: 'Rain and heat' },
    { prompt: 'Who financed the dream?', choices: ['Mother', 'The gardener', 'A visitor'], answer: 'Mother' }
  ];
  var FRAGMENTS = [
    { id: 'portrait', title: 'Portrait', text: 'A picture guards memories of the past. Legacy watches from the walls.' },
    { id: 'slate', title: 'Chalk slate', text: 'My studies demand order. On the black slate, chalk reveals ideas beyond the page.' },
    { id: 'books', title: 'Bookshelf', text: 'In the stillness of the night, I turn the pages slowly. Knowledge waits among these books.' }
  ];
  var CLUES = [
    { id: 'tower', title: 'The first hidden message', text: 'Amidst dreams of grandeur, only ONE tower rose tall, standing against the sky.', digits: '1' },
    { id: 'chambers', title: 'The second hidden message', text: 'Whispers speak of NINE secret chambers, never completed. Their silence holds a number.', digits: '9' },
    { id: 'year', title: 'The final hidden message', text: 'By 1926, the hammers fell silent. TWO and SIX mark the year when ambition stopped abruptly.', digits: '26' }
  ];
  function createStory() {
    var s;
    function reset() { s = { level: 1, diary: [], quiz: 0, key: 'missing', fragments: [], sequence: false, candle: false, clues: [], plan: false, complete: false }; }
    reset();
    return {
      state: function () { return Object.assign({}, s, { diary: s.diary.slice(), fragments: s.fragments.slice(), clues: s.clues.slice() }); },
      reset: reset,
      discover: function (id) {
        var source = s.level === 1 ? DIARY : s.level === 2 ? FRAGMENTS : [];
        if (!source.some(function (d) { return d.id === id; })) return false;
        var list = s.level === 1 ? s.diary : s.fragments;
        if (list.indexOf(id) < 0) list.push(id); return true;
      },
      answer: function (answer) {
        if (s.level !== 1 || s.diary.length !== DIARY.length || s.quiz >= QUESTIONS.length || QUESTIONS[s.quiz].answer !== answer) return false;
        s.quiz++; if (s.quiz === QUESTIONS.length) s.key = 'revealed'; return true;
      },
      submitSequence: function (ids) {
        if (s.level !== 2 || s.fragments.length !== FRAGMENTS.length || !Array.isArray(ids) || ids.length !== FRAGMENTS.length ||
          !ids.every(function (id, i) { return id === FRAGMENTS[i].id; })) return false;
        s.sequence = true; if (s.key === 'missing') s.key = 'revealed'; return true;
      },
      collectKey: function () { if (s.level < 3 && s.key === 'revealed') s.key = 'collected'; },
      advance: function () {
        if (s.level > 2 || s.key !== 'collected') return false;
        s.level++; s.key = 'missing'; return true;
      },
      lightCandle: function () { if (s.level === 3) s.candle = true; },
      illuminate: function (id, distance) {
        if (s.level !== 3 || !s.candle || !Number.isFinite(distance) || distance < 0 || distance > .15 ||
          !CLUES.some(function (c) { return c.id === id; })) return false;
        if (s.clues.indexOf(id) < 0) s.clues.push(id); return true;
      },
      submitPlan: function (pieces) {
        if (s.level !== 3 || s.clues.length !== CLUES.length || !Array.isArray(pieces) || pieces.length !== 6 ||
          !pieces.every(function (id, i) { return id === i; })) return false;
        s.plan = true; return true;
      },
      unlock: function (code) {
        if (s.level !== 3 || s.clues.length !== CLUES.length || !s.plan || String(code) !== '1926') return false;
        s.complete = true; return true;
      }
    };
  }
  var api = { createStory: createStory, DIARY: DIARY, QUESTIONS: QUESTIONS, FRAGMENTS: FRAGMENTS, CLUES: CLUES };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PORTFOLIO_CASTLE_STORY = api;
})(typeof window !== 'undefined' ? window : globalThis);
