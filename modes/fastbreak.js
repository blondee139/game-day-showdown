// Fast Break: a straight points race. Faster answers and hot streaks score more.
(function () {
  const { fmt, rnd } = GameModes.util;
  const WINDOW = { rookie: 20000, allstar: 12000 }; // ms to earn any speed bonus

  function scoreFor(p, ms) {
    const win = WINDOW[p.level] || WINDOW.allstar;
    const speed = Math.max(0, Math.min(1, 1 - (Number(ms) || win) / win));
    const speedPts = Math.round(speed * 10) * 10; // 0..100 in steps of 10
    const streakPts = Math.min(p.streak - 1, 5) * 20; // 0..100
    return { total: 100 + speedPts + streakPts, speedPts, streakPts };
  }

  GameModes.register({
    id: 'fastbreak',
    name: 'Fast Break',
    icon: '💨',
    blurb: 'A race to the most points. Every right answer scores. Answer fast and build a streak for bonus points!',
    initPlayer(eng, p) { p.streak = p.streak || 0; p.best = p.best || 0; },
    hostAnswer(eng, p, m) {
      if (!m.correct) {
        if (p.streak >= 3) eng.log(`${p.mascot} ${p.name}'s ${p.streak}-answer streak ended`);
        p.streak = 0;
        eng.sendTo(p.pid, { type: 'mode', kind: 'fb', correct: false });
        return;
      }
      p.streak++; p.best = Math.max(p.best, p.streak);
      const s = scoreFor(p, m.ms);
      p.score += s.total;
      if (p.streak === 3 || p.streak === 5 || p.streak % 10 === 0) eng.log(`🔥 ${p.mascot} ${p.name} is on fire! ${p.streak} in a row`);
      eng.sendTo(p.pid, { type: 'mode', kind: 'fb', correct: true, pts: s.total, speed: s.speedPts, streakPts: s.streakPts, streak: p.streak, score: Math.round(p.score) });
    },
    botTurn(eng, p) {
      p.next = p.next || Date.now() + rnd(3000, 7000);
      if (Date.now() < p.next) return;
      p.next = Date.now() + rnd(5000, 10000);
      if (Math.random() < 0.3) { p.streak = 0; return; }
      p.streak = (p.streak || 0) + 1;
      p.score += scoreFor(p, rnd(3000, 9000)).total;
      eng.changed();
    },
    badge(p) { return p.streak >= 3 ? ` 🔥${p.streak}` : ''; },

    afterCorrect(ctx) {
      // Wait for the host to say how many points; move on even if the message is slow.
      ctx.fbWaiting = true;
      clearTimeout(ctx.fbTimer);
      ctx.fbTimer = setTimeout(() => { if (ctx.fbWaiting) { ctx.fbWaiting = false; ctx.next(); } }, 2500);
    },
    onPlayerMessage(ctx, m) {
      if (m.kind !== 'fb' || !m.correct) return;
      ctx.setScore(m.score);
      if (!ctx.fbWaiting) return;
      ctx.fbWaiting = false; clearTimeout(ctx.fbTimer);
      const q = document.querySelector('.question');
      if (q) {
        const d = document.createElement('div');
        d.className = 'fb-pop pop';
        d.innerHTML = `+${fmt(m.pts)}` +
          `<small>${m.speed ? `⚡ speed +${m.speed}` : ''}${m.streakPts ? ` 🔥 streak +${m.streakPts}` : ''}</small>` +
          (m.streak >= 2 ? `<span class="fb-streak">${m.streak} in a row!</span>` : '');
        q.appendChild(d);
      }
      if (ctx.me.level === 'rookie') ctx.speak(`${m.pts} points!`);
      setTimeout(() => ctx.next(), ctx.me.level === 'rookie' ? 1600 : 1100);
    },
  });
})();
