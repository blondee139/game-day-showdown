// Game Day Showdown: host on one screen, players join from their own devices.
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const params = new URLSearchParams(location.search);
  const LOCAL = params.has('local'); // test mode: tabs in one browser talk over BroadcastChannel
  const PREFIX = 'gameday-showdown-v1-';

  const MASCOTS = [
    { e: '🏀', n: 'Hoops' }, { e: '🏈', n: 'Blitz' }, { e: '⚽', n: 'Striker' }, { e: '⚾', n: 'Slugger' },
    { e: '🔴', n: 'Kickball Kid' }, { e: '🦖', n: 'Dino Dunk' }, { e: '🐯', n: 'Tiger' }, { e: '🦅', n: 'Eagle' },
    { e: '🦈', n: 'Shark' }, { e: '🐻', n: 'Bear' }, { e: '🐐', n: 'G.O.A.T.' }, { e: '🚀', n: 'Rocket' },
  ];
  const BOT_NAMES = [['Coach Bot', '🤖'], ['Robo Ref', '🦾'], ['Mascot Max', '🐶']];

  // ---------------- sounds ----------------
  let actx;
  function beep(notes) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      let t = actx.currentTime;
      for (const [f, d] of notes) {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d);
        t += d * 0.8;
      }
    } catch (e) { /* no audio */ }
  }
  const SFX = {
    good: () => beep([[523, 0.12], [659, 0.12], [784, 0.2]]),
    bad: () => beep([[220, 0.25], [180, 0.3]]),
    win: () => beep([[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.35]]),
    lose: () => beep([[300, 0.2], [200, 0.35]]),
    whistle: () => beep([[1800, 0.15], [1800, 0.3]]),
  };
  function speak(text) {
    try {
      if (!window.speechSynthesis) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9; u.lang = 'en-US';
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }
  function keepAwake() {
    try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => {}); } catch (e) { /* ignore */ }
  }

  // ---------------- transports ----------------
  // Host transport: { send(id,msg), broadcast(msg), close() }; handlers: onReady, onMessage(id,msg), onLeave(id), onError(err)
  // Client transport: { send(msg), close() }; handlers: onReady, onMessage(msg), onClose, onError(err)
  const PEER_OPTS = { debug: 0 };

  function peerHost(code, h) {
    const conns = new Map();
    const peer = new Peer(PREFIX + code, PEER_OPTS);
    peer.on('open', () => h.onReady());
    peer.on('error', (e) => h.onError(e));
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* ignore */ } });
    peer.on('connection', (c) => {
      c.on('open', () => conns.set(c.peer, c));
      c.on('data', (d) => h.onMessage(c.peer, d));
      c.on('close', () => { conns.delete(c.peer); h.onLeave(c.peer); });
      c.on('error', () => {});
    });
    return {
      send(id, m) { const c = conns.get(id); if (c && c.open) c.send(m); },
      broadcast(m) { for (const id of conns.keys()) this.send(id, m); },
      close() { try { peer.destroy(); } catch (e) { /* ignore */ } },
    };
  }
  function peerClient(code, h) {
    const peer = new Peer(PEER_OPTS);
    let conn;
    peer.on('open', () => {
      conn = peer.connect(PREFIX + code, { reliable: true });
      conn.on('open', () => h.onReady());
      conn.on('data', (d) => h.onMessage(d));
      conn.on('close', () => h.onClose());
      conn.on('error', (e) => h.onError(e));
    });
    peer.on('error', (e) => h.onError(e));
    return {
      send(m) { if (conn && conn.open) conn.send(m); },
      close() { try { peer.destroy(); } catch (e) { /* ignore */ } },
    };
  }
  function bcHost(code, h) {
    const ch = new BroadcastChannel('gds-' + code);
    ch.onmessage = (ev) => { const d = ev.data; if (d.to === 'host') h.onMessage(d.from, d.m); };
    setTimeout(() => h.onReady(), 0);
    return {
      send(id, m) { ch.postMessage({ to: id, m }); },
      broadcast(m) { ch.postMessage({ to: '*', m }); },
      close() { ch.close(); },
    };
  }
  function bcClient(code, h) {
    const ch = new BroadcastChannel('gds-' + code);
    const id = 'c' + Math.random().toString(36).slice(2, 9);
    ch.onmessage = (ev) => { const d = ev.data; if (d.to === id || d.to === '*') h.onMessage(d.m); };
    setTimeout(() => h.onReady(), 0);
    return { send(m) { ch.postMessage({ to: 'host', from: id, m }); }, close() { ch.close(); } };
  }
  // In-page loopback for solo practice.
  function loopback() {
    let hostH, clientH;
    const id = 'me';
    return {
      host(h) {
        hostH = h; setTimeout(() => h.onReady(), 0);
        return { send(_i, m) { setTimeout(() => clientH && clientH.onMessage(m), 0); }, broadcast(m) { this.send(id, m); }, close() {} };
      },
      client(h) {
        clientH = h; setTimeout(() => h.onReady(), 5);
        return { send(m) { setTimeout(() => hostH.onMessage(id, m), 0); }, close() {} };
      },
    };
  }

  // ---------------- outcomes ----------------
  // weight, kind, value, label
  const OUTCOMES = [
    { w: 16, k: 'gain', v: 100, t: 'Layup!', e: '🏀', d: '+100 points' },
    { w: 14, k: 'gain', v: 250, t: 'Touchdown!', e: '🏈', d: '+250 points' },
    { w: 10, k: 'gain', v: 500, t: 'GOOOAL!', e: '⚽', d: '+500 points' },
    { w: 6, k: 'gain', v: 1000, t: 'Grand Slam!', e: '⚾', d: '+1,000 points' },
    { w: 9, k: 'mult', v: 2, t: 'Double Play!', e: '✌️', d: 'Your points x2' },
    { w: 3, k: 'mult', v: 3, t: 'Hat Trick!', e: '🎩', d: 'Your points x3' },
    { w: 9, k: 'steal', v: 0.25, t: 'Interception!', e: '🖐️', d: 'Steal 25% from someone' },
    { w: 6, k: 'steal', v: 0.1, t: 'Stolen Base!', e: '💨', d: 'Steal 10% from someone' },
    { w: 3, k: 'swap', v: 0, t: 'Trade Deadline!', e: '🔄', d: 'Swap points with someone' },
    { w: 7, k: 'lose', v: 0.25, t: 'Fumble!', e: '😵', d: 'Lose 25% of your points' },
    { w: 6, k: 'none', v: 0, t: 'Rain Delay', e: '🌧️', d: 'Nothing happens' },
    { w: 4, k: 'gift', v: 0, t: 'Team Spirit!', e: '🤝', d: '+300 for you AND last place' },
  ];
  function roll(isRookie) {
    const list = OUTCOMES.filter((o) => !(isRookie && o.k === 'lose'));
    let r = Math.random() * list.reduce((s, o) => s + o.w, 0);
    for (const o of list) { if ((r -= o.w) <= 0) return { ...o }; }
    return { ...list[0] };
  }

  // ---------------- host engine ----------------
  class HostEngine {
    constructor(settings, makeTransport, ui) {
      this.settings = settings; // { subjects, minutes, bots, mode }
      this.ui = ui || {};
      this.mode = (window.GameModes && GameModes.get(settings.mode)) || null; // see modes/modes.js
      this.players = new Map(); // pid -> player
      this.conn = new Map(); // connId -> pid
      this.phase = 'lobby';
      this.feed = [];
      this.endsAt = 0;
      this.t = makeTransport({
        onReady: () => this.ui.onReady && this.ui.onReady(),
        onError: (e) => this.ui.onError && this.ui.onError(e),
        onMessage: (cid, m) => this.onMessage(cid, m),
        onLeave: (cid) => {
          const pid = this.conn.get(cid);
          if (pid && this.players.get(pid)) { this.players.get(pid).online = false; this.conn.delete(cid); this.changed(); }
        },
      });
      for (let i = 0; i < (settings.bots || 0); i++) this.addBot();
    }
    hook(name, ...args) { return this.mode && this.mode[name] ? this.mode[name](this, ...args) : undefined; }
    addBot() {
      const used = [...this.players.values()].filter((p) => p.bot).length;
      if (used >= BOT_NAMES.length) return;
      const [name, e] = BOT_NAMES[used];
      const pid = 'bot' + used;
      this.players.set(pid, { pid, name, mascot: e, level: 'allstar', score: 0, bot: true, online: true, right: 0, tries: 0 });
      this.hook('initPlayer', this.players.get(pid));
      this.changed();
    }
    cidOf(pid) { for (const [c, p] of this.conn) if (p === pid) return c; return null; }
    sendTo(pid, m) { const c = this.cidOf(pid); if (c) this.t.send(c, m); }
    standings() {
      return [...this.players.values()].sort((a, b) => b.score - a.score)
        .map((p) => ({ pid: p.pid, name: p.name, mascot: p.mascot, score: Math.round(p.score), bot: !!p.bot, online: p.online, level: p.level }));
    }
    stateMsg() { return { type: 'state', mode: this.mode ? this.mode.id : 'steal', phase: this.phase, endsAt: this.endsAt, now: Date.now(), standings: this.standings(), feed: this.feed.slice(0, 6), subjects: this.settings.subjects }; }
    changed() {
      if (this.ui.onChange) this.ui.onChange(this);
      clearTimeout(this._bt);
      this._bt = setTimeout(() => this.t.broadcast(this.stateMsg()), 60);
    }
    log(text) { this.feed.unshift({ text, at: Date.now() }); this.feed.length = Math.min(this.feed.length, 30); }
    onMessage(cid, m) {
      if (!m || typeof m !== 'object') return;
      if (m.type === 'join') {
        const name = String(m.name || 'Player').slice(0, 14).trim() || 'Player';
        let p = [...this.players.values()].find((x) => !x.bot && x.name.toLowerCase() === name.toLowerCase());
        if (p) {
          // Rejoin (device slept or page reloaded): keep the score.
          for (const [c, pid] of this.conn) if (pid === p.pid) this.conn.delete(c);
          p.online = true; p.mascot = m.mascot || p.mascot; p.level = m.level || p.level;
        } else {
          const pid = 'p' + Math.random().toString(36).slice(2, 8);
          p = { pid, name, mascot: m.mascot || '🏀', level: m.level === 'rookie' ? 'rookie' : 'allstar', score: 0, online: true, right: 0, tries: 0 };
          this.players.set(pid, p);
          this.hook('initPlayer', p);
          if (this.phase !== 'lobby') this.log(`${p.mascot} ${p.name} joined the game!`);
        }
        this.conn.set(cid, p.pid);
        this.t.send(cid, { type: 'welcome', pid: p.pid, score: p.score });
        this.t.send(cid, this.stateMsg());
        this.changed();
        return;
      }
      const pid = this.conn.get(cid);
      const p = pid && this.players.get(pid);
      if (!p) return;
      if (m.type === 'answer') {
        p.tries++; if (m.correct) p.right++;
        if (this.mode && this.mode.hostAnswer) { if (this.phase === 'playing') this.hook('hostAnswer', p, m); }
        else if (m.correct) p.canPick = true;
        this.changed();
      } else if (m.type === 'mode') {
        if (this.phase === 'playing') this.hook('hostMessage', p, m);
      } else if (m.type === 'pick') {
        if (!p.canPick || this.phase !== 'playing') return;
        p.canPick = false;
        const o = roll(p.level === 'rookie');
        if (o.k === 'steal' || o.k === 'swap') {
          const targets = this.standings().filter((x) => x.pid !== pid && (o.k === 'swap' || x.score > 0));
          if (targets.length) {
            p.pending = o;
            this.sendTo(pid, { type: 'outcome', o, needsTarget: true, targets });
            return;
          }
          o.k = 'gain'; o.v = 100; o.t = 'Nobody to steal from!'; o.d = '+100 points instead'; o.e = '🤷';
        }
        const msg = this.apply(p, o);
        this.sendTo(pid, { type: 'outcome', o, result: msg, score: Math.round(p.score) });
      } else if (m.type === 'target') {
        const o = p.pending; if (!o) return;
        p.pending = null;
        const target = this.players.get(m.target);
        const msg = this.apply(p, o, target);
        this.sendTo(pid, { type: 'outcome', o, result: msg, score: Math.round(p.score) });
      }
    }
    apply(p, o, target) {
      let msg = '';
      const who = `${p.mascot} ${p.name}`;
      if (o.k === 'gain') { p.score += o.v; msg = `+${fmt(o.v)}`; this.log(`${who}: ${o.t} +${fmt(o.v)}`); }
      else if (o.k === 'mult') {
        if (p.score <= 0) { p.score += 200; msg = '+200 (had 0, so here’s a boost!)'; }
        else { const before = p.score; p.score *= o.v; msg = `+${fmt(p.score - before)}`; }
        this.log(`${who}: ${o.t} x${o.v}!`);
      } else if (o.k === 'lose') { const amt = Math.round(p.score * o.v); p.score -= amt; msg = `−${fmt(amt)}`; this.log(`${who} fumbled and lost ${fmt(amt)}`); }
      else if (o.k === 'steal' && target) {
        const amt = Math.round(target.score * o.v); target.score -= amt; p.score += amt;
        msg = `Stole ${fmt(amt)} from ${target.name}!`;
        this.log(`${who} stole ${fmt(amt)} from ${target.mascot} ${target.name}! 😱`);
        this.sendTo(target.pid, { type: 'alert', text: `${p.mascot} ${p.name} stole ${fmt(amt)} from you!`, score: Math.round(target.score) });
      } else if (o.k === 'swap' && target) {
        [p.score, target.score] = [target.score, p.score];
        msg = `Swapped with ${target.name}!`;
        this.log(`${who} swapped points with ${target.mascot} ${target.name}! 🔄`);
        this.sendTo(target.pid, { type: 'alert', text: `${p.mascot} ${p.name} swapped points with you!`, score: Math.round(target.score) });
      } else if (o.k === 'gift') {
        p.score += 300;
        const last = this.standings().filter((x) => x.pid !== p.pid).pop();
        if (last) { this.players.get(last.pid).score += 300; msg = `+300 for you and ${last.name}`; this.log(`${who} shared 300 points with ${last.mascot} ${last.name} 🤝`); }
        else msg = '+300';
      } else { msg = 'Nothing happened'; this.log(`${who}: ${o.t}`); }
      p.score = Math.max(0, Math.round(p.score));
      if (target) target.score = Math.max(0, Math.round(target.score));
      this.changed();
      return msg;
    }
    start() {
      this.phase = 'playing';
      this.startedAt = Date.now();
      this.hook('start');
      this.endsAt = Date.now() + this.settings.minutes * 60000;
      this.log('🏁 Game on!');
      this.changed();
      this._timer = setInterval(() => { if (Date.now() >= this.endsAt) this.end(); }, 500);
      this._bots = setInterval(() => this.botTurn(), 1000);
    }
    botTurn() {
      if (this.mode && this.mode.botTurn) { for (const p of this.players.values()) if (p.bot) this.hook('botTurn', p); return; }
      for (const p of this.players.values()) {
        if (!p.bot) continue;
        p.next = p.next || Date.now() + rnd(4000, 9000);
        if (Date.now() < p.next) continue;
        p.next = Date.now() + rnd(6000, 12000);
        if (Math.random() < 0.3) continue; // missed the question
        const o = roll(false);
        let target;
        if (o.k === 'steal' || o.k === 'swap') {
          const others = [...this.players.values()].filter((x) => x !== p && x.score > 0);
          if (!others.length) continue;
          // bots are polite: swap only if it doesn't wreck a kid, steal from the leader
          target = others.sort((a, b) => b.score - a.score)[0];
          if (o.k === 'swap' && target.score < p.score) continue;
        }
        this.apply(p, o, target);
      }
    }
    end() {
      if (this.phase === 'ended') return;
      clearInterval(this._timer); clearInterval(this._bots);
      this.phase = 'ended';
      this.log('🏆 Final whistle!');
      this.changed();
      if (this.ui.onEnd) this.ui.onEnd(this);
    }
    close() { clearInterval(this._timer); clearInterval(this._bots); this.t.close(); }
  }

  // ---------------- UI helpers ----------------
  const app = $('#app');
  function show(html) { app.innerHTML = html; window.scrollTo(0, 0); }
  function timeLeft(endsAt, skew = 0) {
    const s = Math.max(0, Math.ceil((endsAt - (Date.now() + skew)) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  function errText(e) {
    const t = e && (e.type || e.message || String(e));
    if (t === 'peer-unavailable') return 'No game found with that code. Check the number on the big screen.';
    if (t === 'unavailable-id') return 'That game code is taken.';
    if (t === 'network' || t === 'server-error' || t === 'socket-error') return 'Can’t reach the game server. Check the Wi-Fi and try again.';
    if (t === 'browser-incompatible') return 'This browser can’t do multiplayer. Try Safari or Chrome.';
    return 'Something went wrong (' + t + '). Try again.';
  }

  // ---------------- home ----------------
  function home() {
    show(`
      <div class="home">
        <div class="logo"><span class="balls">🏀🏈⚽⚾</span><h1>Game Day<br>Showdown</h1><p class="tag">Answer questions. Score points. Steal the win!</p></div>
        <div class="home-btns">
          <button class="btn big gold" id="hostBtn">📺 Host a game<small>on the computer or TV</small></button>
          <button class="btn big blue" id="joinBtn">📱 Join a game<small>on an iPad or phone</small></button>
          <button class="btn green" id="soloBtn">🏋️ Practice by myself</button>
        </div>
      </div>`);
    $('#hostBtn').onclick = hostSetup;
    $('#joinBtn').onclick = () => joinScreen();
    $('#soloBtn').onclick = () => joinScreen({ solo: true });
  }

  // ---------------- host screens ----------------
  function hostSetup() {
    show(`
      <div class="panel">
        <h2>📺 Set up the game</h2>
        <h3>Game mode</h3>
        <div class="modes" id="modes">${(window.GameModes ? GameModes.all() : []).map((md, i) => `<button data-v="${md.id}" class="${i === 0 ? 'on' : ''}"><span class="mi">${md.icon}</span><b>${esc(md.name)}</b><small>${esc(md.blurb || '')}</small></button>`).join('')}</div>
        <h3>Question types</h3>
        <div class="checks">
          <label><input type="checkbox" name="sub" value="math" checked> ➕ Math</label>
          <label><input type="checkbox" name="sub" value="spelling" checked> 🔤 Spelling</label>
          <label><input type="checkbox" name="sub" value="trivia" checked> 🏆 Sports trivia</label>
        </div>
        <h3>How long?</h3>
        <div class="seg" id="mins">
          <button data-v="3">3 min</button><button data-v="5" class="on">5 min</button><button data-v="8">8 min</button><button data-v="12">12 min</button>
        </div>
        <h3>Robot players</h3>
        <div class="seg" id="bots">
          <button data-v="0">None</button><button data-v="1" class="on">1</button><button data-v="2">2</button>
        </div>
        <p class="hint">Robots join in and score points, so there's always someone to steal from.</p>
        <div class="row"><button class="btn ghost" id="back">← Back</button><button class="btn gold" id="create">Create game →</button></div>
      </div>`);
    for (const id of ['mins', 'bots', 'modes']) {
      const el = $('#' + id); if (!el) continue;
      el.onclick = (ev) => {
        const b = ev.target.closest('button'); if (!b || !b.dataset.v) return;
        for (const x of el.children) x.classList.toggle('on', x === b);
      };
    }
    $('#back').onclick = home;
    $('#create').onclick = () => {
      const subjects = [...document.querySelectorAll('input[name=sub]:checked')].map((x) => x.value);
      if (!subjects.length) { alertBox('Pick at least one question type.'); return; }
      const modeBtn = $('#modes .on');
      hostLobby({ subjects, minutes: +$('#mins .on').dataset.v, bots: +$('#bots .on').dataset.v, mode: modeBtn ? modeBtn.dataset.v : 'steal' });
    };
  }

  function hostLobby(settings, tries = 0) {
    const code = String(rnd(1000, 9999));
    const joinUrl = location.origin + location.pathname + '?join=' + code + (LOCAL ? '&local' : '');
    show(`<div class="panel center"><h2>Setting up…</h2><div class="spinner">🏀</div></div>`);
    let engine;
    const ui = {
      onReady: () => renderLobby(),
      onError: (e) => {
        if (e && e.type === 'unavailable-id' && tries < 5) { engine.close(); hostLobby(settings, tries + 1); return; }
        show(`<div class="panel center"><h2>😬 Uh oh</h2><p>${esc(errText(e))}</p><button class="btn gold" id="retry">Try again</button></div>`);
        $('#retry').onclick = () => { engine.close(); hostLobby(settings); };
      },
      onChange: () => { if (!engine) return; if (engine.phase === 'lobby') renderPlayers(); else if (engine.phase === 'playing') renderLive(); },
      onEnd: () => { SFX.win(); renderPodium(); },
    };
    engine = new HostEngine(settings, (h) => (LOCAL ? bcHost(code, h) : peerHost(code, h)), ui);
    window.__host = engine; // handy for testing

    function renderLobby() {
      keepAwake();
      show(`
        <div class="lobby">
          <div class="join-card">
            <p class="step">On the iPad or phone, open this website and tap <b>Join a game</b>.<br>Or scan the code with the camera:</p>
            <div class="qr" id="qr"></div>
            <p class="small url">${esc(joinUrl)}</p>
            <p class="step">Game code</p>
            <div class="code">${code}</div>
          </div>
          <div class="lobby-side">
            ${engine.mode ? `<div class="mode-pill">${engine.mode.icon} ${esc(engine.mode.name)}</div>` : ''}
            <h2>Players warming up</h2>
            <div id="players" class="chips"></div>
            <div class="row">
              <button class="btn ghost" id="addBot">+ Robot</button>
              <button class="btn gold big" id="start">Start! 🏁</button>
            </div>
          </div>
        </div>`);
      try {
        const qr = qrcode(0, 'M'); qr.addData(joinUrl); qr.make();
        $('#qr').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
      } catch (e) { $('#qr').remove(); }
      $('#addBot').onclick = () => engine.addBot();
      $('#start').onclick = () => {
        if (![...engine.players.values()].some((p) => !p.bot)) { alertBox('Wait for at least one player to join.'); return; }
        SFX.whistle(); engine.start(); renderLive();
      };
      renderPlayers();
    }
    function renderPlayers() {
      const el = $('#players'); if (!el) return;
      const ps = engine.standings();
      el.innerHTML = ps.length ? ps.map((p) => `<div class="chip ${p.online ? '' : 'off'}"><span>${p.mascot}</span>${esc(p.name)}${p.level === 'rookie' ? ' <em>Rookie</em>' : ''}</div>`).join('') : '<p class="hint">Waiting for players…</p>';
    }
    let liveBuilt = false;
    function renderLive() {
      if (!liveBuilt) {
        liveBuilt = true;
        show(`
          <div class="live">
            <div class="scoreboard"><div class="clock" id="clock">0:00</div><div class="sb-title">GAME DAY SHOWDOWN${engine.mode ? `<small>${engine.mode.icon} ${esc(engine.mode.name)}</small>` : ''}</div><div class="code-sm">Code ${code}</div></div>
            <div class="live-grid"><div id="board" class="board"></div><div class="feed-wrap"><h3>Play-by-play</h3><div id="feed" class="feed"></div></div></div>
            <div class="row"><button class="btn ghost" id="endNow">End game now</button></div>
          </div>`);
        $('#endNow').onclick = () => engine.end();
        const tick = setInterval(() => { const c = $('#clock'); if (!c || engine.phase !== 'playing') { clearInterval(tick); return; } c.textContent = timeLeft(engine.endsAt); }, 250);
      }
      const ps = engine.standings(), top = Math.max(1, ...ps.map((p) => p.score));
      const md = engine.mode || {}, unit = md.unit || '';
      const badge = (pid) => (md.badge ? esc(md.badge(engine.players.get(pid)) || '') : '');
      $('#board').innerHTML = ps.map((p, i) => `
        <div class="bar-row ${p.online ? '' : 'off'}">
          <div class="rank">${i + 1}</div><div class="who"><span class="m">${p.mascot}</span>${esc(p.name)}${badge(p.pid)}</div>
          <div class="bar"><div class="fill" style="width:${Math.max(4, (p.score / top) * 100)}%"></div></div>
          <div class="pts">${fmt(p.score)}${unit}</div>
        </div>`).join('');
      $('#feed').innerHTML = engine.feed.slice(0, 10).map((f) => `<div class="fi">${esc(f.text)}</div>`).join('');
    }
    function renderPodium() {
      const ps = engine.standings();
      show(`
        <div class="panel center podium-wrap">
          <h2>🏆 Final Score 🏆</h2>
          ${podiumHtml(ps)}
          <div class="final-list">${ps.slice(3).map((p, i) => `<div>${i + 4}. ${p.mascot} ${esc(p.name)} — ${fmt(p.score)}</div>`).join('')}</div>
          <div class="row"><button class="btn gold" id="again">Play again</button><button class="btn ghost" id="homeBtn">Home</button></div>
        </div>`);
      confetti();
      $('#again').onclick = () => { engine.close(); hostLobby(settings); };
      $('#homeBtn').onclick = () => { engine.close(); home(); };
    }
  }

  function podiumHtml(ps) {
    const slot = (p, place, cls) => p ? `<div class="pod ${cls}"><div class="pm">${p.mascot}</div><div class="pn">${esc(p.name)}</div><div class="pp">${fmt(p.score)}</div><div class="step-block">${place}</div></div>` : '<div class="pod empty"></div>';
    return `<div class="podium">${slot(ps[1], '🥈', 'second')}${slot(ps[0], '🥇', 'first')}${slot(ps[2], '🥉', 'third')}</div>`;
  }

  // ---------------- player screens ----------------
  function joinScreen(opts = {}) {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('gds-player') || '{}'); } catch (e) { /* ignore */ }
    const preCode = params.get('join') || '';
    let mascot = saved.mascot || MASCOTS[0].e;
    let level = saved.level || 'allstar';
    show(`
      <div class="panel">
        <h2>${opts.solo ? '🏋️ Practice' : '📱 Join a game'}</h2>
        ${opts.solo ? '' : `<label class="lbl">Game code (on the big screen)<input id="code" inputmode="numeric" maxlength="4" placeholder="1234" value="${esc(preCode)}"></label>`}
        <label class="lbl">Your name<input id="name" maxlength="14" placeholder="Name" value="${esc(saved.name || '')}"></label>
        <h3>Pick your player</h3>
        <div class="mascots" id="mascots">${MASCOTS.map((m) => `<button data-e="${m.e}" class="${m.e === mascot ? 'on' : ''}"><span>${m.e}</span>${m.n}</button>`).join('')}</div>
        <h3>Level</h3>
        <div class="seg levels" id="level">
          <button data-v="rookie" class="${level === 'rookie' ? 'on' : ''}">🌟 Rookie<small>ages 4–6, read out loud</small></button>
          <button data-v="allstar" class="${level === 'allstar' ? 'on' : ''}">🏆 All-Star<small>2nd grade &amp; up</small></button>
        </div>
        <p class="err" id="err"></p>
        <div class="row"><button class="btn ghost" id="back">← Back</button><button class="btn blue big" id="go">${opts.solo ? 'Play! ▶' : 'Join! ▶'}</button></div>
      </div>`);
    $('#mascots').onclick = (ev) => {
      const b = ev.target.closest('button'); if (!b) return;
      mascot = b.dataset.e; for (const x of $('#mascots').children) x.classList.toggle('on', x === b);
    };
    $('#level').onclick = (ev) => {
      const b = ev.target.closest('button'); if (!b) return;
      level = b.dataset.v; for (const x of $('#level').children) x.classList.toggle('on', x === b);
    };
    $('#back').onclick = () => { history.replaceState(null, '', location.pathname + (LOCAL ? '?local' : '')); home(); };
    $('#go').onclick = () => {
      const name = $('#name').value.trim();
      const code = opts.solo ? '' : $('#code').value.trim();
      if (!opts.solo && !/^\d{4}$/.test(code)) { $('#err').textContent = 'Type the 4-number code from the big screen.'; return; }
      if (!name) { $('#err').textContent = 'Type your name.'; return; }
      try { localStorage.setItem('gds-player', JSON.stringify({ name, mascot, level })); } catch (e) { /* ignore */ }
      speak(' '); // unlock speech on iPad with this tap
      beep([[1, 0.01]]); // unlock audio
      playerGame({ name, mascot, level, code, solo: !!opts.solo });
    };
    if (preCode && saved.name) $('#name').focus();
  }

  function playerGame(me) {
    let t, state = null, pid = null, myScore = 0, skew = 0, screen = 'connecting', soloEngine = null, retries = 0;
    const mode = () => (state && window.GameModes ? GameModes.get(state.mode) : null);
    // What a game mode can use on this device (see modes/modes.js).
    const ctx = {
      me,
      send: (m) => t.send(m),
      show: (html) => show(html),
      topBar: () => topBar(),
      updateTop: () => updateTop(),
      next: () => nextQuestion(),
      speak, SFX, banner: (x) => banner(x),
      setScore: (n) => { if (typeof n === 'number') { myScore = n; updateTop(); } },
      setScreen: (s) => { screen = s; },
      screen: () => screen,
      isOver: () => !state || state.phase === 'ended',
    };
    show(`<div class="panel center"><h2>Connecting…</h2><div class="spinner">⚽</div></div>`);

    const handlers = {
      onReady: () => { retries = 0; t.send({ type: 'join', name: me.name, mascot: me.mascot, level: me.level }); },
      onMessage: (m) => onMsg(m),
      onClose: () => reconnect(),
      onError: (e) => {
        if (e && e.type === 'peer-unavailable') { failed(errText(e)); return; }
        reconnect(e);
      },
    };
    function connect() {
      if (me.solo) {
        const lb = loopback();
        soloEngine = new HostEngine({ subjects: ['math', 'spelling', 'trivia'], minutes: 5, bots: 2 }, (h) => lb.host(h), {});
        t = lb.client(handlers);
        setTimeout(() => soloEngine.start(), 50);
      } else {
        t = LOCAL ? bcClient(me.code, handlers) : peerClient(me.code, handlers);
      }
    }
    function reconnect(e) {
      if (me.solo || (state && state.phase === 'ended')) return;
      try { t.close(); } catch (x) { /* ignore */ }
      if (++retries > 5) { failed(errText(e || { type: 'network' })); return; }
      banner('Reconnecting…');
      setTimeout(connect, 1000 * retries);
    }
    function failed(text) {
      show(`<div class="panel center"><h2>😬 Can’t join</h2><p>${esc(text)}</p><button class="btn blue" id="again">Try again</button></div>`);
      $('#again').onclick = () => joinScreen();
    }
    function banner(text) {
      let b = $('#banner');
      if (!b) { b = document.createElement('div'); b.id = 'banner'; b.className = 'banner'; document.body.appendChild(b); }
      b.textContent = text; b.classList.add('show');
      clearTimeout(banner._t); banner._t = setTimeout(() => b.classList.remove('show'), 3000);
    }

    function onMsg(m) {
      if (m.type === 'welcome') { pid = m.pid; myScore = m.score; }
      else if (m.type === 'state') {
        const prev = state && state.phase;
        state = m; skew = m.now - Date.now();
        const mine = m.standings.find((p) => p.pid === pid);
        if (mine) myScore = mine.score;
        if (m.phase === 'lobby') waiting();
        else if (m.phase === 'playing' && (prev !== 'playing' || screen === 'waiting' || screen === 'connecting')) { if (prev === 'lobby') SFX.whistle(); nextQuestion(); }
        else if (m.phase === 'ended' && prev !== 'ended') finish();
        updateTop();
        if (screen === 'waiting') renderWaitList();
      } else if (m.type === 'mode') { const md = mode(); if (md && md.onPlayerMessage) md.onPlayerMessage(ctx, m); }
      else if (m.type === 'outcome') showOutcome(m);
      else if (m.type === 'alert') { myScore = m.score; banner(m.text); SFX.lose(); updateTop(); }
    }

    function topBar() {
      return `<div class="topbar"><div class="me"><span>${me.mascot}</span>${esc(me.name)}</div><div class="rankpill" id="rank"></div><div class="myscore"><span id="myscore">${fmt(myScore)}</span>${(mode() && mode().unit) || ''}</div><div class="clock-sm" id="clk"></div></div>`;
    }
    function updateTop() {
      const s = $('#myscore'); if (s) s.textContent = fmt(myScore);
      const r = $('#rank');
      if (r && state) { const i = state.standings.findIndex((p) => p.pid === pid); r.textContent = i >= 0 ? `#${i + 1} of ${state.standings.length}` : ''; }
    }
    setInterval(() => { const c = $('#clk'); if (c && state && state.phase === 'playing') c.textContent = '⏱ ' + timeLeft(state.endsAt, skew); }, 500);

    function waiting() {
      if (screen === 'waiting') return;
      screen = 'waiting';
      show(`<div class="panel center"><div class="big-mascot bounce">${me.mascot}</div><h2>You're in, ${esc(me.name)}!</h2><p>Warming up… the game starts soon.</p><div id="wl" class="chips"></div></div>`);
      renderWaitList();
    }
    function renderWaitList() {
      const el = $('#wl'); if (!el || !state) return;
      el.innerHTML = state.standings.map((p) => `<div class="chip"><span>${p.mascot}</span>${esc(p.name)}</div>`).join('');
    }

    function nextQuestion() {
      if (state && state.phase === 'ended') return;
      screen = 'question';
      const qn = Questions.make(me.level, state && state.subjects);
      const emojiOnly = qn.emojiChoices;
      show(`
        ${topBar()}
        <div class="question ${me.level}">
          <div class="qtag">${{ math: '➕ Math', spelling: '🔤 Spelling', trivia: '🏆 Sports' }[qn.subject]}</div>
          ${qn.big ? `<div class="qbig ${qn.big.length > 12 ? 'many' : ''}">${qn.big}</div>` : ''}
          <div class="qtext">${esc(qn.prompt)}</div>
          <button class="btn say" id="say">🔊 Hear it</button>
          <div class="answers ${emojiOnly ? 'emoji' : ''} n${qn.choices.length}">${qn.choices.map((c, i) => `<button class="ans a${i}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        </div>`);
      updateTop();
      const shownAt = Date.now();
      $('#say').onclick = () => speak(qn.say);
      if (me.level === 'rookie' || qn.autoSay) setTimeout(() => speak(qn.say), 250);
      let done = false;
      for (const b of document.querySelectorAll('.ans')) {
        b.onclick = () => {
          if (done) return; done = true;
          const ok = b.dataset.c === qn.answer;
          t.send({ type: 'answer', correct: ok, ms: Date.now() - shownAt });
          for (const x of document.querySelectorAll('.ans')) {
            if (x.dataset.c === qn.answer) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); else x.classList.add('dim');
          }
          const md = mode();
          if (ok) { SFX.good(); if (md && md.afterCorrect) md.afterCorrect(ctx); else setTimeout(chooseBall, 700); }
          else {
            SFX.bad();
            if (me.level === 'rookie') speak(`Nice try! The answer is ${qn.answer}.`);
            const n = document.createElement('div'); n.className = 'oops'; n.innerHTML = `Nice try! The answer is <b>${esc(qn.answer)}</b>`;
            $('.question').appendChild(n);
            setTimeout(nextQuestion, me.level === 'rookie' ? 2800 : 2000);
          }
        };
      }
    }

    function chooseBall() {
      if (state && state.phase === 'ended') return;
      screen = 'pick';
      const balls = ['🏀', '🏈', '⚽', '⚾', '🔴'].sort(() => Math.random() - 0.5).slice(0, 3);
      show(`${topBar()}<div class="pick"><h2>✅ Correct! Pick a ball!</h2><div class="balls3">${balls.map((b, i) => `<button class="ballbtn" data-i="${i}"><span>${b}</span></button>`).join('')}</div></div>`);
      updateTop();
      if (me.level === 'rookie') speak('Correct! Pick a ball!');
      let done = false;
      for (const b of document.querySelectorAll('.ballbtn')) {
        b.onclick = () => {
          if (done) return; done = true;
          b.classList.add('chosen');
          for (const x of document.querySelectorAll('.ballbtn')) if (x !== b) x.classList.add('dim');
          t.send({ type: 'pick' });
        };
      }
    }

    function showOutcome(m) {
      const o = m.o;
      if (m.needsTarget) {
        screen = 'target';
        show(`${topBar()}<div class="outcome"><div class="o-emoji pop">${o.e}</div><h2>${esc(o.t)}</h2><p>${esc(o.d)}</p><h3>Pick a player:</h3>
          <div class="targets">${m.targets.map((p) => `<button class="tbtn" data-p="${p.pid}"><span>${p.mascot}</span><b>${esc(p.name)}</b><em>${fmt(p.score)}</em></button>`).join('')}</div></div>`);
        updateTop();
        if (me.level === 'rookie') speak(`${o.t} Pick a player.`);
        for (const b of document.querySelectorAll('.tbtn')) b.onclick = () => { for (const x of document.querySelectorAll('.tbtn')) x.disabled = true; t.send({ type: 'target', target: b.dataset.p }); };
        return;
      }
      screen = 'outcome';
      myScore = m.score;
      const good = o.k !== 'lose' && o.k !== 'none';
      good ? SFX.win() : SFX.lose();
      show(`${topBar()}<div class="outcome ${good ? 'good' : 'meh'}"><div class="o-emoji pop">${o.e}</div><h2>${esc(o.t)}</h2><p class="o-res">${esc(m.result)}</p><button class="btn blue big" id="next">Next question ▶</button></div>`);
      updateTop();
      if (me.level === 'rookie') speak(`${o.t} ${m.result}`);
      $('#next').onclick = nextQuestion;
    }

    function finish() {
      screen = 'end';
      const ps = state.standings;
      const place = ps.findIndex((p) => p.pid === pid) + 1;
      show(`<div class="panel center podium-wrap"><h2>🏁 Final whistle!</h2>${podiumHtml(ps)}
        <p class="myplace">You finished <b>#${place}</b> with <b>${fmt(myScore)}</b> ${state.mode === 'snackshack' ? 'coins' : 'points'}!</p>
        <div class="row"><button class="btn blue" id="again">${me.solo ? 'Play again' : 'Join next game'}</button><button class="btn ghost" id="homeBtn">Home</button></div></div>`);
      if (place === 1) { SFX.win(); confetti(); }
      if (me.level === 'rookie') speak(`Game over! You got ${fmt(myScore)} points!`);
      $('#again').onclick = () => { cleanup(); me.solo ? playerGame(me) : joinScreen(); };
      $('#homeBtn').onclick = () => { cleanup(); home(); };
    }
    function cleanup() { try { t.close(); } catch (e) { /* ignore */ } if (soloEngine) soloEngine.close(); }

    keepAwake();
    connect();
  }

  // ---------------- small bits ----------------
  function alertBox(text) {
    const d = document.createElement('div'); d.className = 'toast'; d.textContent = text;
    document.body.appendChild(d); setTimeout(() => d.remove(), 2500);
  }
  function confetti() {
    const items = ['🏀', '🏈', '⚽', '⚾', '🎉', '⭐', '🏆'];
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('div'); s.className = 'confetti'; s.textContent = pick(items);
      s.style.left = Math.random() * 100 + 'vw'; s.style.animationDelay = Math.random() * 1.5 + 's'; s.style.fontSize = rnd(20, 44) + 'px';
      document.body.appendChild(s); setTimeout(() => s.remove(), 5000);
    }
  }

  if (params.get('join')) joinScreen(); else home();
})();
