// Game mode registry for Game Day Showdown.
// A mode is an object registered with GameModes.register({...}). Every hook is optional;
// a mode with no hooks uses the built-in "pick a ball" flow.
//
// Host hooks (run on the host computer, which owns the game):
//   initPlayer(engine, p)        set up per-player mode data on p (also called for robots)
//   start(engine)                game is starting
//   hostAnswer(engine, p, msg)   a player answered; msg = { correct, ms }. Replaces the pick-a-ball flow.
//   hostMessage(engine, p, msg)  a player sent { type: 'mode', ... }
//   botTurn(engine, p)           called about once a second for each robot player
//   badge(p)                     short text shown after the name on the big screen
//   unit                         text shown after scores (e.g. '🪙')
// Player hooks (run on each kid's device):
//   afterCorrect(ctx)            after a right answer (instead of "pick a ball")
//   onPlayerMessage(ctx, msg)    host sent this player { type: 'mode', ... }
// ctx = { me, send, show, topBar, updateTop, next, speak, SFX, banner, setScore, setScreen, screen, isOver }
(function () {
  const list = [];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  window.GameModes = {
    register(m) { list.push(m); },
    get(id) { return list.find((m) => m.id === id) || list[0] || null; },
    all() { return list.slice(); },
    util: { esc, fmt, rnd, pick },
  };

  // The original mode: built into game.js, so it needs no hooks.
  GameModes.register({
    id: 'steal',
    name: 'Steal the Ball',
    icon: '🖐️',
    blurb: 'Answer right, pick a ball, and see what’s inside: big points, doubles, swaps, or steal from someone!',
  });
})();
