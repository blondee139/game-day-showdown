// Snack Shack: run a stadium snack stand. Right answers restock the food,
// fans in the stands order snacks, and serving them earns coins for upgrades.
(function () {
  const { esc, fmt, rnd, pick } = GameModes.util;

  const MENU = [
    { id: 'hotdog', e: '🌭', n: 'Hot Dog', price: 50, unlock: 0 },
    { id: 'popcorn', e: '🍿', n: 'Popcorn', price: 80, unlock: 0 },
    { id: 'pretzel', e: '🥨', n: 'Pretzel', price: 120, unlock: 500 },
    { id: 'taco', e: '🌮', n: 'Taco', price: 180, unlock: 1200 },
    { id: 'slushie', e: '🥤', n: 'Slushie', price: 250, unlock: 2500 },
    { id: 'pizza', e: '🍕', n: 'Pizza', price: 350, unlock: 5000 },
    { id: 'icecream', e: '🍦', n: 'Ice Cream', price: 500, unlock: 9000 },
  ];
  const UPGRADES = [
    { id: 'cooler', e: '🧊', n: 'Bigger Cooler', d: 'Get more snacks each time you restock', costs: [400, 1000, 2500, 5000] },
    { id: 'recipe', e: '👨‍🍳', n: 'Secret Recipe', d: 'Every snack sells for more coins', costs: [600, 1500, 3500, 7000] },
  ];
  const FANS = ['🧒', '👧', '👦', '👩', '👨', '🧑', '👵', '👴', '🧔', '👱', '🦖', '🐻'];
  const item = (id) => MENU.find((x) => x.id === id);
  const restockAmt = (s) => 3 + s.cooler * 2;
  const priceOf = (s, it, vip) => Math.round(it.price * (1 + s.recipe * 0.25) * (vip ? 3 : 1));

  function newFan(s) {
    return { e: pick(FANS), want: pick(s.unlocked), vip: Math.random() < 0.1 };
  }
  function shackOf(p) {
    const s = p.shack;
    return {
      coins: Math.round(p.score), stock: s.stock, unlocked: s.unlocked, cooler: s.cooler, recipe: s.recipe,
      fans: s.fans.map((f) => ({ ...f, price: priceOf(s, item(f.want), f.vip) })),
    };
  }
  function push(eng, p, note, kind) {
    eng.sendTo(p.pid, { type: 'mode', kind: kind || 'shack', s: shackOf(p), note, score: Math.round(p.score) });
    eng.changed();
  }

  GameModes.register({
    id: 'snackshack',
    name: 'Snack Shack',
    icon: '🌭',
    unit: ' 🪙',
    blurb: 'Run a stadium snack stand! Right answers restock your food. Serve hungry fans to earn coins and unlock new snacks.',
    initPlayer(eng, p) {
      if (p.shack) return;
      p.shack = { stock: {}, unlocked: ['hotdog', 'popcorn'], cooler: 0, recipe: 0, fans: [], served: 0 };
      for (const m of MENU) p.shack.stock[m.id] = 0;
      for (let i = 0; i < 3; i++) p.shack.fans.push(newFan(p.shack));
    },
    hostAnswer(eng, p, m) {
      if (!m.correct) return;
      const n = restockAmt(p.shack);
      for (const id of p.shack.unlocked) p.shack.stock[id] += n;
      push(eng, p, `Restocked! +${n} of each snack`, 'restock');
    },
    hostMessage(eng, p, m) {
      const s = p.shack;
      if (m.act === 'serve') {
        const f = s.fans[m.slot | 0];
        if (!f) return;
        const it = item(f.want);
        if (s.stock[f.want] <= 0) { push(eng, p, `Out of ${it.n.toLowerCase()}s! Answer a question to restock.`); return; }
        s.stock[f.want]--;
        const coins = priceOf(s, it, f.vip);
        p.score += coins; s.served++;
        if (f.vip) eng.log(`🌟 ${p.mascot} ${p.name} served a VIP fan: +${fmt(coins)} coins!`);
        else if (s.served % 25 === 0) eng.log(`${p.mascot} ${p.name} has served ${s.served} fans!`);
        s.fans[m.slot | 0] = newFan(s);
        push(eng, p, `+${fmt(coins)}`);
      } else if (m.act === 'buy') {
        const menu = MENU.find((x) => x.id === m.id);
        if (menu) {
          if (s.unlocked.includes(menu.id) || p.score < menu.unlock) return push(eng, p, 'Not enough coins yet!');
          p.score -= menu.unlock; s.unlocked.push(menu.id);
          s.stock[menu.id] += restockAmt(s);
          eng.log(`${p.mascot} ${p.name} now sells ${menu.e} ${menu.n}s!`);
          return push(eng, p, `${menu.e} ${menu.n}s unlocked!`);
        }
        const up = UPGRADES.find((x) => x.id === m.id);
        if (!up) return;
        const cost = up.costs[s[up.id]];
        if (cost === undefined || p.score < cost) return push(eng, p, 'Not enough coins yet!');
        p.score -= cost; s[up.id]++;
        eng.log(`${p.mascot} ${p.name} bought ${up.e} ${up.n}!`);
        push(eng, p, `${up.e} ${up.n} level ${s[up.id]}!`);
      }
    },
    botTurn(eng, p) {
      p.next = p.next || Date.now() + rnd(3000, 6000);
      if (Date.now() < p.next) return;
      p.next = Date.now() + rnd(4000, 8000);
      const mins = (Date.now() - (eng.startedAt || Date.now())) / 60000;
      p.score += rnd(60, 160) * (1 + mins * 0.6);
      eng.changed();
    },
    badge(p) { return p.shack ? ' ' + p.shack.unlocked.map((id) => item(id).e).slice(-3).join('') : ''; },

    // ---------- player side ----------
    afterCorrect(ctx) {
      ctx.ssWaiting = true;
      clearTimeout(ctx.ssTimer);
      ctx.ssTimer = setTimeout(() => { if (ctx.ssWaiting) { ctx.ssWaiting = false; ctx.next(); } }, 3000);
    },
    onPlayerMessage(ctx, m) {
      if (!m.s) return;
      ctx.shack = m.s;
      ctx.setScore(m.score);
      if (ctx.isOver()) return;
      if (m.kind === 'restock') {
        if (!ctx.ssWaiting) return;
        ctx.ssWaiting = false; clearTimeout(ctx.ssTimer);
        const q = document.querySelector('.question');
        if (q) { const d = document.createElement('div'); d.className = 'fb-pop pop'; d.innerHTML = `📦 Restocked!<small>+${restockAmt(m.s)} of each snack</small>`; q.appendChild(d); }
        if (ctx.me.level === 'rookie') ctx.speak('Restocked! Now feed the fans!');
        setTimeout(() => renderShack(ctx), 1000);
        return;
      }
      if (ctx.screen() === 'shop') renderShop(ctx, m.note);
      else if (ctx.screen() === 'shack') renderShack(ctx, m.note);
    },
  });

  function renderShack(ctx, note) {
    const s = ctx.shack;
    if (ctx.isOver()) return;
    if (!s) { ctx.next(); return; }
    const firstTime = ctx.screen() !== 'shack';
    ctx.setScreen('shack');
    const hasFood = s.unlocked.some((id) => s.stock[id] > 0);
    ctx.show(`${ctx.topBar()}
      <div class="shack">
        <div class="shack-sign">🏟️ ${esc(ctx.me.name)}'s Snack Shack</div>
        <p class="shack-help">${hasFood ? 'Tap a fan to give them their snack!' : 'Out of food! Answer a question to restock.'}</p>
        <div class="fans">${s.fans.map((f, i) => {
          const have = s.stock[f.want] > 0, it = item(f.want);
          return `<button class="fan ${f.vip ? 'vip' : ''} ${have ? '' : 'nope'}" data-i="${i}">
            ${f.vip ? '<span class="vip-tag">🌟 VIP x3</span>' : ''}
            <span class="fan-e">${f.e}</span><span class="bubble">${it.e}</span>
            <span class="fan-price">${fmt(f.price)} 🪙</span></button>`;
        }).join('')}</div>
        <div class="shelf">${s.unlocked.map((id) => { const it = item(id); return `<div class="stock ${s.stock[id] ? '' : 'empty'}"><span>${it.e}</span><b>${s.stock[id]}</b></div>`; }).join('')}</div>
        <div class="shack-note" id="ssnote">${note ? esc(note) : ''}</div>
        <div class="shack-btns">
          <button class="btn gold big" id="restock">📦 Restock<small>answer a question</small></button>
          <button class="btn blue big" id="shop">🛒 Shop</button>
        </div>
      </div>`);
    ctx.updateTop();
    if (ctx.me.level === 'rookie' && firstTime) ctx.speak(hasFood ? 'Tap a fan to give them their snack!' : 'Answer a question to get more food!');
    for (const b of document.querySelectorAll('.fan')) {
      b.onclick = () => {
        const f = s.fans[+b.dataset.i];
        if (!s.stock[f.want]) { ctx.SFX.bad(); flash(`Out of ${item(f.want).n.toLowerCase()}s! Tap Restock.`); if (ctx.me.level === 'rookie') ctx.speak(`No more ${item(f.want).n}s. Tap restock.`); return; }
        for (const x of document.querySelectorAll('.fan')) x.disabled = true;
        b.classList.add('served');
        ctx.SFX.good();
        ctx.send({ type: 'mode', act: 'serve', slot: +b.dataset.i });
      };
    }
    $id('restock').onclick = () => ctx.next();
    $id('shop').onclick = () => renderShop(ctx);
  }

  function renderShop(ctx, note) {
    const s = ctx.shack;
    ctx.setScreen('shop');
    const row = (e, n, d, cost, owned, id) => `
      <button class="shop-item" data-id="${id}" ${owned || cost === undefined || s.coins < cost ? 'disabled' : ''}>
        <span class="si-e">${e}</span><span class="si-t"><b>${esc(n)}</b><small>${esc(d)}</small></span>
        <span class="si-c">${owned ? '✅' : cost === undefined ? 'MAX' : fmt(cost) + ' 🪙'}</span></button>`;
    ctx.show(`${ctx.topBar()}
      <div class="shack">
        <div class="shack-sign">🛒 Shop</div>
        <div class="shack-note">${note ? esc(note) : `You have ${fmt(s.coins)} 🪙`}</div>
        <h3>New snacks</h3>
        <div class="shop-list">${MENU.filter((m) => m.unlock).map((m) => row(m.e, m.n, `Sells for ${fmt(m.price)}`, m.unlock, s.unlocked.includes(m.id), m.id)).join('')}</div>
        <h3>Upgrades</h3>
        <div class="shop-list">${UPGRADES.map((u) => row(u.e, `${u.n} (level ${s[u.id]})`, u.d, u.costs[s[u.id]], false, u.id)).join('')}</div>
        <div class="shack-btns"><button class="btn ghost big back" id="back">← Back to the shack</button></div>
      </div>`);
    ctx.updateTop();
    for (const b of document.querySelectorAll('.shop-item')) {
      b.onclick = () => { for (const x of document.querySelectorAll('.shop-item')) x.disabled = true; ctx.SFX.win(); ctx.send({ type: 'mode', act: 'buy', id: b.dataset.id }); };
    }
    $id('back').onclick = () => renderShack(ctx);
  }

  function $id(id) { return document.getElementById(id); }
  function flash(text) { const n = $id('ssnote'); if (n) { n.textContent = text; n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); } }
})();
