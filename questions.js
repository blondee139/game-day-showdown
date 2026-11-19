// Questions for Game Day Showdown.
// Each question: { prompt, say, big, choices: [string], answer: string, subject }
// "say" is read aloud; "big" is an optional large picture line (emoji);
// "sayAnswer" is how to read the answer aloud when it is an emoji.
//
// No repeats: every level + subject has a deck. Each deck entry is either a fixed
// question or a generator that makes a fresh one (math with random numbers).
// A game draws from the shuffled deck and never shows the same question twice.
// Only if a deck is truly used up does it start over.
(function () {
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const uniq = (arr) => [...new Set(arr)];
  const rep = (n, f) => Array.from({ length: n }, () => f);
  const plain = (s) => String(s).replace(/^[^A-Za-z0-9]+\s*/u, ''); // "🏏 Bat" -> "Bat"
  const orList = (arr) => (arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ', or ' + arr[arr.length - 1]);

  // Numeric choices close to the answer, never negative.
  function numChoices(ans, spread = 3, fmt = (n) => String(n)) {
    const set = new Set([ans]);
    let guard = 0;
    while (set.size < 4 && guard++ < 100) {
      const d = rnd(1, spread) * (Math.random() < 0.5 ? -1 : 1);
      const v = ans + d;
      if (v >= 0) set.add(v);
    }
    let fill = ans + spread + 1;
    while (set.size < 4) set.add(fill++);
    return shuffle([...set].map(fmt));
  }
  function q(subject, prompt, answer, choices, extra = {}) {
    return { subject, prompt, answer: String(answer), choices: shuffle(uniq(choices.map(String))), ...extra };
  }

  const BALLS = ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐'];
  const TEAMS = ['Hawks', 'Tigers', 'Sharks', 'Bears', 'Rockets', 'Eagles', 'Lions', 'Comets', 'Panthers', 'Dragons'];
  const KIDS = ['Max', 'Lily', 'Sam', 'Ava', 'Leo', 'Mia', 'Jack', 'Zoe', 'Noah', 'Ella', 'Ben', 'Ruby'];
  const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const numWord = (n) => TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');

  // ---------- ALL-STAR (2nd grade) MATH ----------
  const M = (prompt, answer, wrong, big) => () => q('math', prompt, answer, [answer, ...wrong], { big });
  const allStarMath = [
    // facts
    ...rep(2, () => { const a = rnd(2, 10), b = rnd(2, 10); return q('math', `${a} + ${b} = ?`, a + b, numChoices(a + b, 3), { say: `${a} plus ${b}` }); }),
    ...rep(2, () => { const a = rnd(10, 20), b = rnd(2, 10); return q('math', `${a} − ${b} = ?`, a - b, numChoices(a - b, 3), { say: `${a} minus ${b}` }); }),
    () => { const n = rnd(3, 12); return q('math', `What is double ${n}?`, n * 2, numChoices(n * 2, 3), { say: `What is double ${n}? That means ${n} plus ${n}.` }); },
    () => { const a = rnd(1, 9); return q('math', `${a} + ? = 10`, 10 - a, numChoices(10 - a, 2), { say: `${a} plus what makes 10?`, big: '🔟' }); },
    () => { const a = rnd(2, 9), s = rnd(a + 2, 18); return q('math', `${a} + ? = ${s}`, s - a, numChoices(s - a, 3), { say: `${a} plus what equals ${s}?` }); },
    () => { const a = rnd(1, 9), b = rnd(1, 9), c = rnd(1, 9); return q('math', `${a} + ${b} + ${c} = ?`, a + b + c, numChoices(a + b + c, 3), { say: `${a} plus ${b} plus ${c}` }); },
    // two- and three-digit
    ...rep(2, () => { const a = rnd(11, 69), b = rnd(5, 29); return q('math', `${a} + ${b} = ?`, a + b, numChoices(a + b, 10), { say: `${a} plus ${b}` }); }),
    ...rep(2, () => { const a = rnd(30, 99), b = rnd(5, a - 5); return q('math', `${a} − ${b} = ?`, a - b, numChoices(a - b, 10), { say: `${a} minus ${b}` }); }),
    () => { const a = rnd(1, 6) * 100, b = rnd(1, 3) * 100; return q('math', `${a} + ${b} = ?`, a + b, [a + b, a + b + 100, a + b - 100, a + b + 10], { say: `${a} plus ${b}` }); },
    () => { const k = rnd(1, 9); return q('math', `100 − ${k * 10} = ?`, 100 - k * 10, [100 - k * 10, 100 - k * 10 + 10, Math.max(0, 100 - k * 10 - 10), 100 - k], { say: `100 minus ${k * 10}` }); },
    () => {
      const n = rnd(12, 88), more = Math.random() < 0.5, ans = more ? n + 10 : n - 10;
      return q('math', `What is 10 ${more ? 'more' : 'less'} than ${n}?`, ans, [ans, more ? n + 1 : n - 1, more ? n + 100 : n + 10, more ? n - 10 : n - 1]);
    },
    () => {
      const n = rnd(120, 880), more = Math.random() < 0.5, ans = more ? n + 100 : n - 100;
      return q('math', `What is 100 ${more ? 'more' : 'less'} than ${n}?`, ans, [ans, more ? n + 10 : n - 10, more ? n - 100 : n + 100, more ? n + 1 : n - 1]);
    },
    // place value
    () => {
      const n = rnd(100, 999), places = ['ones', 'tens', 'hundreds'], i = rnd(0, 2);
      const digit = String(n)[2 - i];
      const ds = uniq(String(n).split('').concat([String(rnd(0, 9)), String(rnd(0, 9)), String(rnd(0, 9))])).slice(0, 4);
      if (!ds.includes(digit)) ds[0] = digit;
      return q('math', `In ${n}, which digit is in the ${places[i]} place?`, digit, ds);
    },
    () => {
      const h = rnd(1, 9), t = rnd(1, 9), o = rnd(1, 9), n = h * 100 + t * 10 + o;
      return q('math', `${h * 100} + ${t * 10} + ${o} = ?`, n, [n, h * 100 + o * 10 + t, t * 100 + h * 10 + o, h + t + o], { say: `${h * 100} plus ${t * 10} plus ${o}` });
    },
    () => {
      const n = rnd(21, 99), r = Number(String(n).split('').reverse().join(''));
      const wrong = uniq([r, n + 10, n - 10, n + 1].filter((v) => v !== n && v > 9 && v < 100));
      return q('math', `Which number is ${numWord(n)}?`, n, [n, ...wrong.slice(0, 3)], { say: `Which number is ${n}?` });
    },
    () => {
      const a = rnd(10, 999), same = Math.random() < 0.15;
      let b = same ? a : rnd(Math.max(10, a - 60), a + 60); if (!same && b === a) b = a + 1;
      const sign = a > b ? '>' : a < b ? '<' : '=';
      return q('math', `Which sign goes in the blank?  ${a} ___ ${b}`, sign, ['>', '<', '='], { say: `Is ${a} greater than, less than, or equal to ${b}?` });
    },
    // patterns, money, time
    () => {
      const by = pick([2, 5, 10, 100]), start = by * rnd(0, by === 100 ? 4 : 6), seq = [0, 1, 2, 3].map((k) => start + k * by);
      return q('math', `Skip count: ${seq.join(', ')}, ___`, start + 4 * by, numChoices(start + 4 * by, 3), { say: `What comes next? ${seq.join(', ')}` });
    },
    () => { const n = rnd(11, 99); return q('math', `Is ${n} even or odd?`, n % 2 ? 'Odd' : 'Even', ['Even', 'Odd']); },
    () => {
      const ns = uniq([rnd(10, 99), rnd(10, 99), rnd(10, 99), rnd(10, 99)]);
      while (ns.length < 4) ns.push(rnd(100, 120));
      const big = Math.random() < 0.5;
      return q('math', `Which number is the ${big ? 'BIGGEST' : 'SMALLEST'}?`, big ? Math.max(...ns) : Math.min(...ns), ns);
    },
    ...rep(2, () => {
      const qs = rnd(0, 2), d = rnd(0, 3), n = rnd(0, 2), p = rnd(1, 4);
      const total = qs * 25 + d * 10 + n * 5 + p;
      const parts = [];
      if (qs) parts.push(`${qs} quarter${qs > 1 ? 's' : ''}`);
      if (d) parts.push(`${d} dime${d > 1 ? 's' : ''}`);
      if (n) parts.push(`${n} nickel${n > 1 ? 's' : ''}`);
      parts.push(`${p} penn${p > 1 ? 'ies' : 'y'}`);
      return q('math', `How much money? ${parts.join(', ')}`, `${total}¢`, numChoices(total, 6, (v) => `${v}¢`), { big: '🪙' });
    }),
    () => {
      const h = rnd(1, 12), half = Math.random() < 0.5;
      const clock = String.fromCodePoint((half ? 0x1f55c : 0x1f550) + h - 1);
      const ans = `${h}:${half ? '30' : '00'}`;
      const other = `${h}:${half ? '00' : '30'}`;
      const h2 = (h % 12) + 1, h0 = ((h + 10) % 12) + 1;
      return q('math', 'What time is it?', ans, [ans, other, `${h2}:${half ? '30' : '00'}`, `${h0}:${half ? '30' : '00'}`], { big: clock });
    },
    () => {
      const h = rnd(1, 9), add = rnd(1, 3), t = `${h}:00`, ans = `${h + add}:00`;
      return q('math', `Practice starts at ${t}. It lasts ${add} hour${add > 1 ? 's' : ''}. When does it end?`, ans, [ans, `${h + add + 1}:00`, `${h}:${add}0`, `${Math.max(1, h - add)}:00`], { big: '⏰' });
    },
    // word problems
    () => {
      const t = pick(TEAMS), a = rnd(10, 40), b = rnd(5, 30);
      return q('math', `The ${t} scored ${a} points in the first half and ${b} points in the second half. How many points in all?`, a + b, numChoices(a + b, 10), { big: '🏀' });
    },
    () => {
      const k = pick(KIDS), a = rnd(20, 60), b = rnd(5, 19);
      return q('math', `${k} had ${a} baseball cards and gave away ${b}. How many are left?`, a - b, numChoices(a - b, 8), { big: '⚾' });
    },
    () => {
      const g = rnd(2, 5), each = rnd(2, 5);
      return q('math', `There are ${g} teams with ${each} players each. How many players?`, g * each, numChoices(g * each, 4), { big: '🏈'.repeat(Math.min(g, 5)) });
    },
    () => {
      const a = rnd(1, 6), b = rnd(1, 6);
      return q('math', `A soccer team scored ${a} goals. The other team scored ${b} more than that. How many goals did the other team score?`, a + b, numChoices(a + b, 3), { big: '⚽🥅' });
    },
    () => {
      const r = rnd(2, 4), c = rnd(2, 5), b = pick(BALLS);
      return q('math', `${r} rows of ${c} balls. How many balls?`, r * c, numChoices(r * c, 3), { big: Array(r).fill(b.repeat(c)).join('<br>'), say: `${r} rows with ${c} balls in each row. How many balls in all?` });
    },
    () => {
      const td = rnd(2, 3);
      return q('math', `A touchdown is worth 6 points. How many points is ${td} touchdowns?`, 6 * td, numChoices(6 * td, 4), { big: '🏈'.repeat(td) });
    },
    () => {
      const k = pick(KIDS), a = rnd(2, 6), b = rnd(2, 6);
      return q('math', `${k} ran ${a} laps before lunch and ${b} laps after lunch. How many laps?`, a + b, numChoices(a + b, 3), { big: '🏃' });
    },
    () => {
      const total = rnd(14, 24), on = rnd(5, 11);
      return q('math', `A team has ${total} players. ${on} are on the field. How many are on the bench?`, total - on, numChoices(total - on, 3), { big: '🪑' });
    },
    () => {
      const a = rnd(10, 45), b = rnd(10, 45);
      return q('math', `The quarterback threw for ${a} yards, then ${b} more yards. How many yards in all?`, a + b, numChoices(a + b, 10), { big: '🏈' });
    },
    () => {
      const box = pick([12, 20, 24, 30]), hit = rnd(3, box - 3);
      return q('math', `A bucket had ${box} baseballs. ${hit} were hit into the stands. How many are still in the bucket?`, box - hit, numChoices(box - hit, 4), { big: '🪣⚾' });
    },
    () => {
      const t1 = pick(TEAMS), t2 = pick(TEAMS.filter((x) => x !== t1)), a = rnd(20, 60), b = rnd(5, a - 5);
      return q('math', `The ${t1} have ${a} points. The ${t2} have ${b} points. How many more points do the ${t1} have?`, a - b, numChoices(a - b, 8), { big: '🏆' });
    },
    () => {
      const n = rnd(2, 5), each = pick([2, 5, 10]);
      return q('math', `${n} kids each kick ${each} balls into the net. How many balls in the net?`, n * each, numChoices(n * each, each === 2 ? 3 : 5), { big: '🥅', say: `${n} kids each kick ${each} balls. How many balls in all? Try skip counting by ${each}s.` });
    },
    // shapes, fractions, measuring
    M('How many sides does a triangle have?', '3', ['4', '5', '6'], '🔺'),
    M('How many sides does a hexagon have?', '6', ['4', '5', '8'], '⬡'),
    M('How many sides does a pentagon have?', '5', ['4', '6', '3'], '⬠'),
    M('How many corners does a rectangle have?', '4', ['3', '5', '6'], '▭'),
    M('A pizza is cut into 2 equal pieces. Each piece is one…', 'Half', ['Third', 'Fourth', 'Whole'], '🍕'),
    M('A pizza is cut into 3 equal pieces. Each piece is one…', 'Third', ['Half', 'Fourth', 'Whole'], '🍕'),
    M('A pizza is cut into 4 equal pieces. Each piece is one…', 'Fourth', ['Half', 'Third', 'Whole'], '🍕'),
    M('How many halves make one whole?', '2', ['1', '3', '4'], '🍪'),
    M('How many inches are in 1 foot?', '12', ['10', '3', '100'], '📏'),
    M('Which is longer?', '1 yard', ['1 foot', '1 inch'], '📏'),
    M('Which would you measure in inches?', 'A pencil', ['A soccer field', 'A long road', 'A river'], '📏'),
    M('About how long is a baseball bat?', '3 feet', ['3 inches', '30 feet', '3 miles'], '⚾'),
    M('How many minutes are in 1 hour?', '60', ['30', '100', '12'], '⏰'),
    M('How many days are in 1 week?', '7', ['5', '10', '12'], '📅'),
    M('How many months are in 1 year?', '12', ['10', '7', '24'], '📅'),
    M('How many cents are in 1 dollar?', '100', ['10', '50', '25'], '💵'),
    M('How many cents is a quarter?', '25¢', ['5¢', '10¢', '50¢'], '🪙'),
    M('How many cents is a dime?', '10¢', ['1¢', '5¢', '25¢'], '🪙'),
    M('Which coin is worth 5 cents?', 'Nickel', ['Penny', 'Dime', 'Quarter'], '🪙'),
  ];

  // ---------- ROOKIE (ages 4–6) MATH ----------
  const R_SHAPES = [['circle', '🔵'], ['square', '🟥'], ['triangle', '🔺'], ['star', '⭐'], ['heart', '❤️'], ['diamond', '🔶'], ['moon', '🌙']];
  const rookieMath = [
    ...rep(2, () => { const n = rnd(1, 10), b = pick(BALLS); return q('math', `How many ${b}?`, n, numChoices(n, 2), { big: b.repeat(n), say: 'How many balls do you see? Count them!' }); }),
    ...rep(2, () => { const a = rnd(1, 5), c = rnd(1, 4), b = pick(BALLS); return q('math', `${a} + ${c} = ?`, a + c, numChoices(a + c, 2), { big: `${b.repeat(a)} ➕ ${b.repeat(c)}`, say: `${a} plus ${c}. How many in all?` }); }),
    () => { const a = rnd(3, 7), c = rnd(1, a - 1), b = pick(BALLS); return q('math', `${a} − ${c} = ?`, a - c, numChoices(a - c, 2), { big: b.repeat(a), say: `You have ${a} balls. ${c} roll away. How many are left?` }); },
    () => { const a = rnd(1, 10); let c = rnd(1, 10); if (c === a) c = a + 1; return q('math', 'Which number is BIGGER?', Math.max(a, c), [a, c], { say: `Which number is bigger, ${a} or ${c}?` }); },
    () => { const a = rnd(1, 10); let c = rnd(1, 10); if (c === a) c = a + 1; return q('math', 'Which number is SMALLER?', Math.min(a, c), [a, c], { say: `Which number is smaller, ${a} or ${c}?` }); },
    () => { const s = rnd(1, 7); return q('math', `${s}, ${s + 1}, ${s + 2}, ___`, s + 3, numChoices(s + 3, 2), { say: `What number comes next? ${s}, ${s + 1}, ${s + 2}` }); },
    () => { const s = rnd(2, 10); return q('math', `___, ${s}`, s - 1, numChoices(s - 1, 2), { say: `What number comes right before ${s}?` }); },
    () => { const s = rnd(1, 9), b = pick(BALLS); return q('math', `1 more than ${s}?`, s + 1, numChoices(s + 1, 2), { big: `${b.repeat(s)} ➕ ${b}`, say: `What is one more than ${s}?` }); },
    () => {
      const n = rnd(0, 20), near = [n + 1, n - 1, n + 10, n - 10, Number(String(n).split('').reverse().join(''))].filter((v) => v >= 0 && v <= 20 && v !== n);
      return q('math', 'Tap the number you hear!', n, [n, ...shuffle(uniq(near)).slice(0, 3)], { big: '🔊', say: `Find the number ${n}. ${n}.` });
    },
    () => {
      const a = rnd(1, 6); let c = rnd(1, 6); if (c === a) c = a + 2; const b = pick(BALLS);
      const ga = b.repeat(a), gc = b.repeat(c);
      return q('math', 'Which group has MORE?', a > c ? ga : gc, [ga, gc], { say: 'Which group has more balls?', sayAnswer: `the group with ${Math.max(a, c)}` });
    },
    () => {
      const [name, em] = pick(R_SHAPES);
      const others = shuffle(R_SHAPES.filter((s) => s[1] !== em)).slice(0, 3).map((s) => s[1]);
      return q('math', `Which one is a ${name}?`, em, [em, ...others], { say: `Which one is a ${name}?`, emojiChoices: true, sayAnswer: `the ${name}` });
    },
    M('How many sides does a triangle have?', '3', ['2', '4'], '🔺'),
    M('How many sides does a square have?', '4', ['3', '5'], '🟥'),
    M('How many wheels does a bike have?', '2', ['3', '4'], '🚲'),
    M('How many wheels does a car have?', '4', ['2', '6'], '🚗'),
    M('How many legs does a dog have?', '4', ['2', '6'], '🐶'),
    M('How many fingers are on one hand?', '5', ['4', '10'], '✋'),
    M('How many eyes do you have?', '2', ['1', '3'], '👀'),
  ];

  // ---------- ALL-STAR SPELLING ----------
  // [word, wrong, wrong, wrong, sentence]
  const SPELL = [
    ['because', 'becuz', 'becaus', 'beacause', 'I stayed inside because it was raining.'],
    ['friend', 'freind', 'frend', 'friennd', 'My friend plays soccer with me.'],
    ['ball', 'bal', 'bawl', 'balle', 'Kick the ball to me.'],
    ['team', 'teem', 'taem', 'tem', 'Our team won the game.'],
    ['play', 'plae', 'pley', 'plai', 'Let’s play kickball.'],
    ['catch', 'cach', 'katch', 'cetch', 'Can you catch the football?'],
    ['throw', 'thro', 'throe', 'thruw', 'Throw the ball to first base.'],
    ['kick', 'kik', 'kic', 'cick', 'Kick the ball hard.'],
    ['score', 'skore', 'scor', 'scoar', 'What is the score?'],
    ['win', 'wen', 'winn', 'whin', 'We want to win.'],
    ['goal', 'gole', 'goel', 'gool', 'She scored a goal.'],
    ['coach', 'coch', 'koach', 'coatch', 'The coach said to keep running.'],
    ['field', 'feild', 'feeld', 'fild', 'We ran across the field.'],
    ['game', 'gaim', 'gam', 'gaem', 'The game starts at noon.'],
    ['jump', 'jupm', 'jumpe', 'jomp', 'Jump as high as you can.'],
    ['run', 'runn', 'ron', 'rnu', 'Run to home plate!'],
    ['fast', 'fasst', 'fats', 'fest', 'He runs really fast.'],
    ['again', 'agen', 'agian', 'ugain', 'Let’s play again.'],
    ['when', 'wen', 'whin', 'whenn', 'When is the game?'],
    ['where', 'whear', 'wher', 'whare', 'Where is my glove?'],
    ['they', 'thay', 'tehy', 'thei', 'They are on my team.'],
    ['said', 'sed', 'siad', 'sayd', 'The coach said good job.'],
    ['people', 'peple', 'poeple', 'peeple', 'Lots of people came to the game.'],
    ['would', 'wuold', 'woud', 'whould', 'Would you like to play?'],
    ['could', 'cood', 'cuold', 'coud', 'I could hit the ball far.'],
    ['night', 'nite', 'nigt', 'niht', 'We played a night game.'],
    ['light', 'lite', 'ligth', 'lihgt', 'The ball is light.'],
    ['happy', 'hapy', 'happey', 'hapey', 'I am happy we won.'],
    ['always', 'allways', 'alwais', 'alway', 'I always wear my helmet.'],
    ['around', 'arownd', 'aroud', 'arund', 'Run around the bases.'],
    ['basket', 'baskit', 'baskett', 'bascet', 'He made a basket.'],
    ['helmet', 'helmit', 'hellmet', 'helment', 'Put on your helmet.'],
    ['player', 'plaier', 'playr', 'plaer', 'She is a great player.'],
    ['every', 'evry', 'evrey', 'everey', 'I practice every day.'],
    ['school', 'skool', 'shcool', 'scool', 'We play kickball at school.'],
    ['first', 'frist', 'ferst', 'furst', 'I ran to first base.'],
    ['after', 'aftr', 'afder', 'affter', 'We get snacks after the game.'],
    ['want', 'whant', 'wnat', 'wantt', 'I want to be the pitcher.'],
    ['very', 'vary', 'verry', 'vere', 'That was very fun!'],
    ['pitch', 'pich', 'pitsh', 'pitchh', 'Roll the pitch slowly.'],
    ['bounce', 'bownce', 'bounse', 'bouce', 'Bounce the ball two times.'],
    ['dribble', 'dribbel', 'drible', 'dribbl', 'Dribble the ball down the court.'],
    ['soccer', 'socer', 'sokker', 'soccor', 'I play soccer on Saturdays.'],
    ['basketball', 'baskitball', 'basketbal', 'baskettball', 'Basketball is my favorite sport.'],
    ['football', 'footbal', 'fotball', 'futball', 'We watched football on TV.'],
    ['baseball', 'basebal', 'baseboll', 'bayseball', 'He hit the baseball far.'],
    ['kickball', 'kikball', 'kickbal', 'kickboll', 'We play kickball at recess.'],
    ['shoot', 'shute', 'shooot', 'shoat', 'Shoot the ball at the hoop.'],
    ['point', 'piont', 'poynt', 'poin', 'We got one more point.'],
    ['cheer', 'cheir', 'chear', 'cher', 'The fans cheer loudly.'],
    ['crowd', 'crowde', 'croud', 'crwod', 'The crowd stood up and clapped.'],
    ['whistle', 'whisle', 'wissle', 'whistel', 'The ref blew the whistle.'],
    ['jersey', 'jersy', 'jursey', 'jersee', 'I wear number 8 on my jersey.'],
    ['sport', 'sporte', 'sprot', 'spoart', 'What sport do you like best?'],
    ['pass', 'pas', 'pase', 'passs', 'Pass the ball to your friend.'],
    ['race', 'rase', 'rais', 'raice', 'Let’s race to the fence.'],
    ['speed', 'spead', 'speeed', 'speid', 'Look at her speed!'],
    ['quick', 'qwick', 'quik', 'kwick', 'Be quick on your feet.'],
    ['strong', 'storng', 'strawng', 'stong', 'Exercise makes you strong.'],
    ['bench', 'bensh', 'bentch', 'bennch', 'The players sat on the bench.'],
    ['glove', 'gluv', 'glov', 'gloev', 'Grab your glove and your bat.'],
    ['base', 'bace', 'baes', 'basse', 'Run to second base.'],
    ['ready', 'redy', 'reddy', 'readdy', 'Are you ready to play?'],
    ['practice', 'pracktice', 'praktice', 'practis', 'We practice after school.'],
    ['trophy', 'trofy', 'trophey', 'troffy', 'Our team won a trophy!'],
    ['winner', 'winer', 'winnar', 'winnur', 'The winner gets a medal.'],
    ['medal', 'medel', 'meddal', 'madal', 'She won a gold medal.'],
    ['champion', 'champian', 'chamion', 'champeon', 'You are a champion!'],
    ['huddle', 'hudle', 'huddel', 'hudddle', 'The team got in a huddle.'],
    ['tackle', 'tackel', 'takle', 'tacle', 'He made a big tackle.'],
    ['inning', 'ining', 'innig', 'inninng', 'It is the last inning.'],
    ['umpire', 'umpier', 'umpyre', 'umpir', 'The umpire yelled strike!'],
    ['dunk', 'dunck', 'dunc', 'donk', 'Can you dunk the ball?'],
    ['hoop', 'hupe', 'hoope', 'houp', 'The ball went through the hoop.'],
    ['snack', 'snak', 'snakc', 'snac', 'I brought a snack for the team.'],
    ['water', 'watter', 'wauter', 'watr', 'Drink lots of water.'],
    ['shirt', 'shurt', 'sherth', 'shrit', 'Wear your team shirt.'],
    ['shoes', 'shose', 'shooes', 'shoze', 'Tie your shoes tight.'],
    ['minute', 'minit', 'mineute', 'minnute', 'The game ends in one minute.'],
    ['clock', 'clok', 'klock', 'clocke', 'Look at the clock.'],
    ['lucky', 'luky', 'lukky', 'luckey', 'That was a lucky catch!'],
    ['great', 'graet', 'grayt', 'greaat', 'That was a great pass!'],
    ['know', 'kno', 'noe', 'knoe', 'I know all the rules.'],
    ['write', 'rihte', 'wrigt', 'writte', 'Write your name on the ball.'],
    ['thank', 'thak', 'thangk', 'thenk', 'Thank you, coach!'],
    ['which', 'wich', 'whitch', 'wihch', 'Which team is winning?'],
    ['there', 'thare', 'ther', 'theer', 'The ball is over there.'],
    ['many', 'meny', 'mani', 'menny', 'How many points do we have?'],
    ['laugh', 'laf', 'lagh', 'laff', 'We laugh and have fun.'],
    ['brother', 'bruther', 'brothr', 'brothur', 'My brother plays baseball.'],
    ['sister', 'sistr', 'sistur', 'sisster', 'My sister is fast.'],
    ['family', 'famly', 'familee', 'fammily', 'My family loves game night.'],
    ['house', 'howse', 'hous', 'huose', 'We play catch at my house.'],
    ['outside', 'outsied', 'owtside', 'outsid', 'Let’s play outside.'],
    ['today', 'todday', 'tooday', 'todey', 'We have a game today.'],
    ['morning', 'morening', 'mornin', 'murning', 'We run in the morning.'],
    ['should', 'shuold', 'shood', 'shoud', 'You should wear a helmet.'],
    ['before', 'befor', 'bifore', 'beefore', 'Stretch before you run.'],
    ['under', 'undr', 'unnder', 'undur', 'The ball rolled under the car.'],
    ['over', 'ovr', 'ovar', 'oveer', 'Kick it over the net.'],
    ['open', 'opan', 'opin', 'oppen', 'I was open for a pass.'],
    ['round', 'rownd', 'rond', 'roound', 'A soccer ball is round.'],
    ['about', 'abowt', 'abaut', 'aboot', 'The game is about to start.'],
    ['found', 'fownd', 'faund', 'foundd', 'I found my lost ball.'],
    ['party', 'partee', 'parti', 'pardy', 'We had a pizza party.'],
    ['number', 'numbr', 'nomber', 'numbur', 'My number is 23.'],
    ['yellow', 'yelow', 'yelloe', 'yello', 'The tennis ball is yellow.'],
    ['purple', 'purpel', 'perple', 'purpl', 'Our team color is purple.'],
    ['orange', 'orang', 'ornage', 'oringe', 'A basketball is orange.'],
    ['green', 'grean', 'gren', 'greeen', 'The grass is green.'],
    ['black', 'blak', 'blac', 'blakc', 'He has black shoes.'],
    ['white', 'whte', 'wite', 'whight', 'A baseball is white.'],
    ['summer', 'sumer', 'summr', 'sommer', 'We swim in the summer.'],
    ['winter', 'wintr', 'wenter', 'wintor', 'We play inside in the winter.'],
    ['begin', 'bigin', 'begen', 'beggin', 'Let the game begin!'],
  ];
  const spellQ = ([w, a, b, c, sentence]) => () => q('spelling', 'Which word is spelled right?', w, [w, a, b, c], { say: `Spell: ${w}. ${sentence} ... ${w}.`, big: '🔊', autoSay: true });

  // [long form, right, wrong, wrong, wrong]
  const CONTRACTIONS = [
    ['do not', 'don’t', 'dont', 'do’nt', 'dno’t'],
    ['can not', 'can’t', 'cant', 'ca’nt', 'cann’t'],
    ['is not', 'isn’t', 'isnt', 'is’nt', 'isn’ot'],
    ['did not', 'didn’t', 'didnt', 'did’nt', 'din’t'],
    ['was not', 'wasn’t', 'wasnt', 'was’nt', 'wan’t'],
    ['have not', 'haven’t', 'havent', 'have’nt', 'hav’ent'],
    ['could not', 'couldn’t', 'couldnt', 'could’nt', 'coudn’t'],
    ['I am', 'I’m', 'Im', 'I’am', 'Ia’m'],
    ['it is', 'it’s', 'it’is', 'its’', 'i’ts'],
    ['you are', 'you’re', 'your’e', 'yo’ure', 'youre’'],
    ['we are', 'we’re', 'were’', 'w’are', 'we’are'],
    ['they are', 'they’re', 'theyr’e', 'the’yre', 'they’are'],
    ['let us', 'let’s', 'lets’', 'le’ts', 'let’us'],
    ['I will', 'I’ll', 'Ill', 'I’will', 'Il’l'],
    ['we will', 'we’ll', 'wel’l', 'we’will', 'wee’l'],
    ['she is', 'she’s', 'shes’', 'sh’es', 'she’is'],
    ['I have', 'I’ve', 'Iv’e', 'I’have', 'Ive’'],
  ];
  const contractionQ = ([long, w, a, b, c]) => () => q('spelling', `What is the short way to write “${long}”?`, w, [w, a, b, c], { big: '✂️', say: `What is the short way to write ${long}?` });

  // [part, part, right, wrong, wrong, wrong]
  const COMPOUNDS = [
    ['base', 'ball', 'baseball', 'baseboll', 'ballbase', 'basball'],
    ['foot', 'ball', 'football', 'footbal', 'ballfoot', 'foodball'],
    ['basket', 'ball', 'basketball', 'basketbal', 'ballbasket', 'baskball'],
    ['kick', 'ball', 'kickball', 'kikball', 'ballkick', 'kickbal'],
    ['touch', 'down', 'touchdown', 'tuchdown', 'downtouch', 'touchdowm'],
    ['side', 'line', 'sideline', 'sidline', 'lineside', 'sideleine'],
    ['team', 'mate', 'teammate', 'teamate', 'mateteam', 'teammat'],
    ['play', 'ground', 'playground', 'playgrownd', 'groundplay', 'plaground'],
    ['rain', 'bow', 'rainbow', 'rianbow', 'bowrain', 'rainbo'],
    ['snow', 'man', 'snowman', 'snoman', 'mansnow', 'snowmen'],
    ['cup', 'cake', 'cupcake', 'cupcak', 'cakecup', 'cuppcake'],
    ['pop', 'corn', 'popcorn', 'popcorne', 'cornpop', 'popcron'],
    ['back', 'pack', 'backpack', 'backpak', 'packback', 'bakpack'],
    ['sun', 'shine', 'sunshine', 'sunshin', 'shinesun', 'sunsine'],
    ['bed', 'room', 'bedroom', 'bedrom', 'roombed', 'bedrooom'],
    ['gold', 'fish', 'goldfish', 'goldfesh', 'fishgold', 'golfish'],
  ];
  const compoundQ = ([a, b, w, x, y, z]) => () => q('spelling', `Put the words together: ${a} + ${b} = ?`, w, [w, x, y, z], { big: '🧩', say: `Put the words together. ${a} plus ${b}. What word do they make?` });

  // [one, right plural, wrong, wrong, wrong]
  const PLURALS = [
    ['ball', 'balls', 'balles', 'ballz', 'ballies'],
    ['box', 'boxes', 'boxs', 'boxies', 'boxxes'],
    ['bus', 'buses', 'buss', 'busies', 'busez'],
    ['fox', 'foxes', 'foxs', 'foxies', 'foxen'],
    ['bench', 'benches', 'benchs', 'benchies', 'bensches'],
    ['coach', 'coaches', 'coachs', 'coachies', 'coachez'],
    ['glove', 'gloves', 'glovs', 'gloveses', 'glovies'],
    ['puppy', 'puppies', 'puppys', 'puppyes', 'pupps'],
    ['child', 'children', 'childs', 'childes', 'childrens'],
    ['man', 'men', 'mans', 'manes', 'mens'],
    ['foot', 'feet', 'foots', 'feets', 'footes'],
    ['tooth', 'teeth', 'tooths', 'teeths', 'toothes'],
    ['mouse', 'mice', 'mouses', 'mices', 'meese'],
    ['goose', 'geese', 'gooses', 'geeses', 'goosies'],
    ['berry', 'berries', 'berrys', 'berryes', 'berres'],
  ];
  const pluralQ = ([one, w, a, b, c]) => () => q('spelling', `One ${one}, two…`, w, [w, a, b, c], { big: '✌️', say: `One ${one}. Two what? Pick the right spelling.` });

  // [word, rhymes, not, not, not]
  const RHYMES = [
    ['ball', 'tall', 'bell', 'bat', 'bowl'],
    ['kick', 'stick', 'kite', 'cake', 'kiss'],
    ['run', 'sun', 'rug', 'ran', 'rain'],
    ['game', 'same', 'gum', 'goal', 'gate'],
    ['goal', 'hole', 'gold', 'girl', 'go'],
    ['bat', 'hat', 'bet', 'bag', 'boat'],
    ['net', 'pet', 'nut', 'nap', 'neck'],
    ['team', 'dream', 'time', 'teeth', 'tame'],
    ['throw', 'snow', 'three', 'throne', 'thumb'],
    ['win', 'pin', 'wing', 'wet', 'wand'],
    ['base', 'face', 'bus', 'bake', 'bass'],
    ['hoop', 'soup', 'hop', 'hope', 'hook'],
    ['catch', 'match', 'cat', 'cash', 'couch'],
    ['fast', 'last', 'fist', 'feast', 'fat'],
    ['score', 'door', 'scare', 'scarf', 'sock'],
    ['coach', 'roach', 'couch', 'cone', 'coat'],
  ];
  const rhymeQ = ([word, w, a, b, c]) => () => q('spelling', `Which word rhymes with “${word}”?`, w, [w, a, b, c], { big: '🎵', say: `Which word rhymes with ${word}?` });

  const abcOrder = () => {
    const words = [];
    for (const [w] of shuffle(SPELL)) { if (!words.some((x) => x[0] === w[0])) words.push(w); if (words.length === 4) break; }
    const first = words.slice().sort()[0];
    return q('spelling', 'Which word comes FIRST in ABC order?', first, words, { big: '🔤', say: `Which word comes first in A B C order? ${words.join(', ')}` });
  };

  const allStarSpelling = [
    ...SPELL.map(spellQ),
    ...CONTRACTIONS.map(contractionQ),
    ...COMPOUNDS.map(compoundQ),
    ...PLURALS.map(pluralQ),
    ...RHYMES.map(rhymeQ),
    ...rep(10, abcOrder),
  ];

  // ---------- ROOKIE LETTERS ----------
  const PICS = [
    ['🐶', 'dog'], ['🐱', 'cat'], ['☀️', 'sun'], ['🐷', 'pig'], ['🚌', 'bus'], ['🦊', 'fox'], ['🐝', 'bee'],
    ['⚽', 'ball'], ['🎩', 'hat'], ['🥚', 'egg'], ['🐟', 'fish'], ['🦖', 'dino'], ['🍎', 'apple'], ['🐻', 'bear'],
    ['🐸', 'frog'], ['🦁', 'lion'], ['🐵', 'monkey'], ['🐮', 'cow'], ['🦆', 'duck'], ['🍌', 'banana'], ['🌙', 'moon'],
    ['⭐', 'star'], ['🚗', 'car'], ['🐢', 'turtle'], ['🍕', 'pizza'], ['🎈', 'balloon'], ['🐍', 'snake'], ['🌮', 'taco'],
    ['🪁', 'kite'], ['🍋', 'lemon'], ['🐭', 'mouse'], ['🐙', 'octopus'], ['🐧', 'penguin'], ['🌈', 'rainbow'], ['🧦', 'sock'],
    ['🐯', 'tiger'], ['☂️', 'umbrella'], ['🎻', 'violin'], ['🍉', 'watermelon'], ['🪀', 'yo-yo'], ['🦓', 'zebra'],
    ['🏈', 'football'], ['🚂', 'train'], ['🥕', 'carrot'], ['🍩', 'donut'], ['🐘', 'elephant'], ['🐐', 'goat'],
    ['🏠', 'house'], ['🧃', 'juice'], ['🔑', 'key'], ['🦉', 'owl'], ['🐰', 'rabbit'], ['🦷', 'tooth'], ['🚐', 'van'],
  ];
  const LETTERS = 'ABCDEFGHIJKLMNOPRSTUVWYZ'.split('');
  const CVC = [
    ['🐱', 'cat', ['kat', 'cta', 'cet']], ['🐶', 'dog', ['dgo', 'dag', 'bog']], ['☀️', 'sun', ['sn', 'son', 'snu']],
    ['🐷', 'pig', ['pgi', 'big', 'peg']], ['🚌', 'bus', ['bas', 'buz', 'dus']], ['🎩', 'hat', ['het', 'aht', 'hatt']],
    ['🛏️', 'bed', ['bad', 'deb', 'bedd']], ['🦊', 'fox', ['fax', 'fux', 'ofx']], ['🏃', 'run', ['rn', 'rnu', 'ran']],
    ['🦇', 'bat', ['bta', 'dat', 'bet']], ['🐛', 'bug', ['bgu', 'dug', 'beg']], ['🥫', 'can', ['cna', 'kan', 'cen']],
    ['🐔', 'hen', ['hne', 'hin', 'han']], ['🗺️', 'map', ['mpa', 'nap', 'mop']], ['🍳', 'pan', ['pna', 'pen', 'ban']],
    ['🐀', 'rat', ['rta', 'rot', 'tar']], ['🥅', 'net', ['nte', 'nit', 'met']], ['🔟', 'ten', ['tne', 'tin', 'den']],
    ['🦵', 'leg', ['lge', 'lag', 'log']], ['🧢', 'cap', ['cpa', 'kap', 'cup']], ['🛁', 'tub', ['tbu', 'tab', 'dub']],
    ['☕', 'cup', ['cpu', 'cap', 'kup']], ['🪵', 'log', ['lgo', 'lag', 'dog']], ['🖊️', 'pen', ['pne', 'pin', 'ben']],
    ['📦', 'box', ['bxo', 'bax', 'dox']], ['🚐', 'van', ['vna', 'ven', 'fan']], ['🔥', 'hot', ['hto', 'hat', 'hut']],
    ['6️⃣', 'six', ['sik', 'siks', 'xis']],
  ];
  const SIGHT = ['the', 'and', 'see', 'is', 'go', 'can', 'my', 'we', 'it', 'up', 'to', 'like', 'me', 'you', 'big', 'look',
    'a', 'away', 'blue', 'come', 'down', 'find', 'for', 'funny', 'help', 'here', 'in', 'jump', 'little', 'make', 'not',
    'one', 'play', 'red', 'run', 'said', 'three', 'two', 'where', 'yellow', 'I', 'at', 'he', 'she', 'no', 'yes'];
  const firstLetterQ = ([em, word]) => () => {
    const L = word[0].toUpperCase();
    return q('spelling', `What letter does ${word} start with?`, L, shuffle(LETTERS.filter((x) => x !== L)).slice(0, 3).concat(L), { big: em, say: `What letter does ${word} start with?`, autoSay: true });
  };
  const startsWithQ = ([em, word]) => () => {
    const L = word[0];
    const others = shuffle(PICS.filter((p) => p[1][0] !== L && p[0] !== em)).filter((p, i, a) => a.findIndex((x) => x[1][0] === p[1][0]) === i).slice(0, 2);
    const names = {}; [[em, word], ...others].forEach(([e, w]) => { names[e] = w; });
    const q2 = q('spelling', `Which picture starts with ${L.toUpperCase()}?`, em, [em, ...others.map((p) => p[0])], { emojiChoices: true, autoSay: true, sayAnswer: word });
    q2.say = `Which picture starts with the letter ${L.toUpperCase()}? ${orList(q2.choices.map((c) => names[c]))}?`;
    return q2;
  };
  const cvcQ = ([em, word, wrong]) => () => q('spelling', `Which one spells ${word.toUpperCase().split('').join('-')}?`, word, [word, ...wrong], { big: em, say: `Which one spells ${word}?`, autoSay: true });
  const sightQ = (w) => () => q('spelling', 'Tap the word you hear!', w, shuffle(SIGHT.filter((x) => x !== w)).slice(0, 3).concat(w), { big: '🔊', say: `Find the word: ${w}. ${w}.`, autoSay: true });
  const caseQ = (L) => () => {
    const lower = L.toLowerCase();
    const tricky = { b: ['d', 'p', 'q'], d: ['b', 'p', 'q'], p: ['q', 'b', 'd'], q: ['p', 'g', 'd'], m: ['n', 'w', 'u'], n: ['m', 'u', 'h'], u: ['n', 'v', 'w'], w: ['m', 'v', 'u'] };
    const wrong = tricky[lower] || shuffle('abcdefghijklmnopqrstuvwxyz'.split('').filter((x) => x !== lower)).slice(0, 3);
    return q('spelling', `Find the little letter for ${L}`, lower, [lower, ...wrong], { big: L, say: `Find the little letter that matches big ${L}.`, autoSay: true, sayAnswer: `little ${lower}` });
  };
  const rookieSpelling = [
    ...PICS.map(firstLetterQ),
    ...shuffle(PICS).slice(0, 20).map(startsWithQ),
    ...CVC.map(cvcQ),
    ...SIGHT.map(sightQ),
    ...'ABDEFGHMNPQRTUW'.split('').map(caseQ),
  ];

  // ---------- SPORTS TRIVIA ----------
  const T = (prompt, answer, wrong, big) => () => q('trivia', prompt, answer, [answer, ...wrong], { big });
  const allStarTrivia = [
    // basketball
    T('How many players from one team are on a basketball court at a time?', '5', ['3', '7', '11'], '🏀'),
    T('How many points is a free throw worth?', '1', ['2', '3', '5'], '🏀'),
    T('A basketball shot from behind the big arc is worth how many points?', '3', ['1', '2', '4'], '🏀'),
    T('A regular basketball shot from inside the big arc is worth how many points?', '2', ['1', '3', '5'], '🏀'),
    T('How high is a basketball hoop?', '10 feet', ['5 feet', '20 feet', '100 feet'], '🏀'),
    T('In basketball, bouncing the ball while you move is called…', 'Dribbling', ['Punting', 'Pitching', 'Bunting'], '🏀'),
    T('Running with the basketball without dribbling is called…', 'Traveling', ['Passing', 'Bunting', 'Kicking'], '🏀'),
    T('The board behind the basketball hoop is called the…', 'Backboard', ['Scoreboard', 'Skateboard', 'Surfboard'], '🏀'),
    T('The metal ring that holds the basketball net is called the…', 'Rim', ['Base', 'Mound', 'Goalpost'], '🏀'),
    T('Grabbing the ball after a missed shot is called a…', 'Rebound', ['Touchdown', 'Home run', 'Corner kick'], '🏀'),
    T('Which sport has a slam dunk?', 'Basketball', ['Soccer', 'Baseball', 'Kickball'], '🏀'),
    T('Which sport is played on a court with a hoop?', 'Basketball', ['Baseball', 'Football', 'Golf'], '🏀'),
    T('How many quarters are in a pro basketball game?', '4', ['2', '3', '9'], '🏀'),
    // football
    T('How many points is a touchdown worth?', '6', ['1', '3', '10'], '🏈'),
    T('How many points is a field goal worth in football?', '3', ['1', '2', '6'], '🏈'),
    T('After a touchdown, kicking the ball through the goalposts is worth how many points?', '1', ['2', '3', '6'], '🏈'),
    T('A safety in football is worth how many points?', '2', ['1', '3', '6'], '🏈'),
    T('What shape is a football?', 'Oval', ['Circle', 'Square', 'Star'], '🏈'),
    T('How many quarters are in a football game?', '4', ['2', '3', '9'], '🏈'),
    T('The big championship game in football is called the…', 'Super Bowl', ['World Series', 'World Cup', 'Stanley Cup'], '🏆'),
    T('Where do you score a touchdown?', 'End zone', ['Dugout', 'Penalty box', 'Free-throw line'], '🏈'),
    T('Which football player usually throws the ball?', 'Quarterback', ['Goalie', 'Pitcher', 'Catcher'], '🏈'),
    T('How many players from one team are on the field in football?', '11', ['5', '9', '15'], '🏈'),
    T('How many yards long is a football field from goal line to goal line?', '100', ['10', '50', '1,000'], '🏈'),
    T('Catching a pass that was meant for the other team is called an…', 'Interception', ['Inning', 'Assist', 'Ace'], '🏈'),
    T('Stopping the player with the football by bringing them to the ground is a…', 'Tackle', ['Dribble', 'Bunt', 'Serve'], '🏈'),
    T('In football, how many tries (downs) does a team get to go 10 yards?', '4', ['2', '3', '10'], '🏈'),
    T('What do football players wear on their heads?', 'Helmet', ['Crown', 'Baseball cap', 'Headband only'], '🏈'),
    T('When a football team gets together to plan a play, it’s called a…', 'Huddle', ['Puddle', 'Cuddle', 'Bundle'], '🏈'),
    // soccer
    T('How many players from one team are on the field in soccer?', '11', ['5', '9', '20'], '⚽'),
    T('In soccer, which player is allowed to use their hands?', 'Goalie', ['Striker', 'Coach', 'Everyone'], '🧤'),
    T('What color card means a soccer player has to leave the game?', 'Red', ['Yellow', 'Green', 'Blue'], '🟥'),
    T('What color card is a warning in soccer?', 'Yellow', ['Red', 'Purple', 'Blue'], '🟨'),
    T('The World Cup is a contest for which sport?', 'Soccer', ['Baseball', 'Basketball', 'Football'], '🌎'),
    T('In soccer, hitting the ball with your head is called a…', 'Header', ['Slam dunk', 'Bunt', 'Punt'], '⚽'),
    T('How long is a pro soccer game?', '90 minutes', ['10 minutes', '30 minutes', '5 hours'], '⚽'),
    T('When the ball goes over the side line in soccer, the other team gets a…', 'Throw-in', ['Free throw', 'Home run', 'Touchdown'], '⚽'),
    T('A kick from the corner of the soccer field is called a…', 'Corner kick', ['Field goal', 'Free throw', 'Grand slam'], '⚽'),
    T('When one player scores 3 goals in one game, it’s called a…', 'Hat trick', ['Triple play', 'Slam dunk', 'Touchback'], '🎩'),
    T('In most countries around the world, soccer is called…', 'Football', ['Kickball', 'Baseball', 'Hockey'], '🌍'),
    T('Passing the ball to a teammate who then scores is called an…', 'Assist', ['Error', 'Inning', 'Out'], '⚽'),
    T('What do soccer players wear to protect their legs?', 'Shin guards', ['Mittens', 'Goggles', 'Earmuffs'], '⚽'),
    T('Which sport do you play mostly with your feet?', 'Soccer', ['Basketball', 'Baseball', 'Hockey'], '⚽'),
    // baseball
    T('How many strikes make an out in baseball?', '3', ['2', '4', '5'], '⚾'),
    T('How many balls (bad pitches) let the batter walk to first base?', '4', ['2', '3', '6'], '⚾'),
    T('How many bases are there in baseball (counting home plate)?', '4', ['3', '5', '6'], '⚾'),
    T('Hitting the ball over the fence in baseball is called a…', 'Home run', ['Touchdown', 'Slam dunk', 'Goal'], '⚾'),
    T('A home run when all the bases are full is called a…', 'Grand slam', ['Hat trick', 'Touchdown', 'Slam dunk'], '⚾'),
    T('How many innings are in a regular pro baseball game?', '9', ['4', '6', '12'], '⚾'),
    T('The big championship in baseball is called the…', 'World Series', ['Super Bowl', 'World Cup', 'Final Four'], '🏆'),
    T('Which sport uses a bat?', 'Baseball', ['Soccer', 'Basketball', 'Football'], '⚾'),
    T('Which of these is NOT a baseball position?', 'Goalie', ['Pitcher', 'Catcher', 'Shortstop'], '⚾'),
    T('The baseball player who crouches behind home plate is the…', 'Catcher', ['Pitcher', 'Goalie', 'Quarterback'], '⚾'),
    T('Where does the baseball pitcher stand?', 'Pitcher’s mound', ['End zone', 'Dugout', 'Penalty box'], '⚾'),
    T('Where do baseball players sit when they are not on the field?', 'Dugout', ['End zone', 'Penalty box', 'Backboard'], '⚾'),
    T('Tapping the baseball softly with the bat is called a…', 'Bunt', ['Dunk', 'Punt', 'Header'], '⚾'),
    T('How many players from one team are on the field in baseball?', '9', ['5', '11', '15'], '⚾'),
    T('The baseball player who plays between second and third base is the…', 'Shortstop', ['Quarterback', 'Goalie', 'Point guard'], '⚾'),
    T('The person who calls balls and strikes in baseball is the…', 'Umpire', ['Coach', 'Mascot', 'Goalie'], '⚾'),
    T('Which sport is played on a diamond?', 'Baseball', ['Basketball', 'Soccer', 'Swimming'], '💎'),
    T('How many outs does each team get in a half-inning of baseball?', '3', ['1', '5', '9'], '⚾'),
    // kickball
    T('In kickball, how does the pitcher send the ball to the kicker?', 'Rolls it', ['Throws it high', 'Kicks it', 'Bounces it on their head'], '🔴'),
    T('In kickball, how many outs end your team’s turn?', '3', ['1', '5', '10'], '🔴'),
    T('In kickball, you can get a runner out by…', 'Tagging them with the ball', ['Tickling them', 'Yelling “out!”', 'Taking their shoe'], '🔴'),
    T('In kickball, where does the kicker stand?', 'Home plate', ['First base', 'Center field', 'The dugout'], '🔴'),
    T('In kickball, if someone catches your kick before it bounces, you are…', 'Out', ['Safe', 'The winner', 'Allowed to kick again'], '🔴'),
    T('Kickball is a lot like which sport, but with a big rubber ball?', 'Baseball', ['Basketball', 'Hockey', 'Swimming'], '🔴'),
    T('After you kick the ball in kickball, which way do you run?', 'To first base', ['To third base', 'To the pitcher', 'Back to the bench'], '🔴'),
    T('In kickball, your team scores a run when a runner…', 'Gets all the way home', ['Kicks the pitcher', 'Catches the ball', 'Stands on first base'], '🔴'),
    // other sports
    T('Which sport is played on ice with a puck?', 'Hockey', ['Soccer', 'Baseball', 'Tennis'], '🏒'),
    T('The Stanley Cup is the trophy for which sport?', 'Hockey', ['Soccer', 'Golf', 'Baseball'], '🏆'),
    T('Which sport uses a racket and a fuzzy yellow ball?', 'Tennis', ['Golf', 'Soccer', 'Bowling'], '🎾'),
    T('In tennis, a score of zero is called…', 'Love', ['Zip', 'Egg', 'Nada'], '🎾'),
    T('Which sport uses a club to hit a tiny ball into a hole?', 'Golf', ['Hockey', 'Tennis', 'Baseball'], '⛳'),
    T('In which sport do you hit a ball over a high net with your hands?', 'Volleyball', ['Soccer', 'Golf', 'Football'], '🏐'),
    T('In bowling, what do you try to knock down?', 'Pins', ['Cones', 'Cups', 'Blocks'], '🎳'),
    T('Knocking down all 10 bowling pins with your first ball is called a…', 'Strike', ['Spare', 'Gutter ball', 'Home run'], '🎳'),
    T('In which sport might you do a cartwheel on a balance beam?', 'Gymnastics', ['Golf', 'Hockey', 'Bowling'], '🤸'),
    T('Which sport happens in a pool?', 'Swimming', ['Tennis', 'Baseball', 'Golf'], '🏊'),
    T('In a relay race, runners pass a…', 'Baton', ['Football', 'Hat', 'Sandwich'], '🏃'),
    T('In a race, the line you cross at the end is the…', 'Finish line', ['Start line', 'Foul line', 'Free-throw line'], '🏁'),
    // Olympics and fun facts
    T('First place at the Olympics wins a…', 'Gold medal', ['Silver medal', 'Bronze medal', 'Blue ribbon'], '🥇'),
    T('Second place at the Olympics wins a…', 'Silver medal', ['Gold medal', 'Bronze medal', 'Red ribbon'], '🥈'),
    T('Third place at the Olympics wins a…', 'Bronze medal', ['Gold medal', 'Silver medal', 'Paper medal'], '🥉'),
    T('How many rings are on the Olympic flag?', '5', ['3', '4', '7'], '🏅'),
    T('Which ball is the biggest?', 'Basketball', ['Baseball', 'Golf ball', 'Tennis ball'], '🏀'),
    T('Which ball is the smallest?', 'Golf ball', ['Basketball', 'Soccer ball', 'Football'], '⛳'),
    T('A team’s costumed character who cheers at games is the…', 'Mascot', ['Umpire', 'Coach', 'Goalie'], '🐯'),
    T('What does MVP stand for?', 'Most Valuable Player', ['Most Very Popular', 'Many Victory Points', 'Mega Volleyball Pass'], '🏆'),
    T('The person who teaches a team and plans the plays is the…', 'Coach', ['Fan', 'Mascot', 'Referee'], '📋'),
    T('Which word is NOT a basketball word?', 'Touchdown', ['Dribble', 'Rebound', 'Layup'], '🏀'),
    T('Which word is NOT a soccer word?', 'Home run', ['Goal', 'Corner kick', 'Header'], '⚽'),
    T('Which word is NOT a football word?', 'Slam dunk', ['Touchdown', 'Quarterback', 'End zone'], '🏈'),
    T('Which word is NOT a baseball word?', 'Free throw', ['Strike', 'Inning', 'Dugout'], '⚾'),
    // being a good sport
    T('What is the best thing to drink when you play sports?', 'Water', ['Soda', 'Syrup', 'Milkshake'], '💧'),
    T('What should you say to the other team after a game?', 'Good game!', ['You stink!', 'Nothing', 'Ha ha, we won!'], '🤝'),
    T('Stretching before you play is good for your…', 'Muscles', ['Hair', 'Teeth', 'Shoelaces'], '🧘'),
    T('If a teammate makes a mistake, a good sport says…', 'Nice try, you’ll get it!', ['Ugh, you messed up!', 'You’re off the team!', 'Nothing at all'], '💪'),
  ];

  // Rookie trivia: picture choices that are read aloud in the order shown.
  const R = (prompt, answer, wrong, big) => () => {
    const qq = q('trivia', prompt, answer, [answer, ...wrong], { big, autoSay: true });
    qq.say = `${prompt} ${orList(qq.choices.map(plain))}?`;
    qq.sayAnswer = plain(answer);
    return qq;
  };
  // Emoji-only choices: [emoji, name] pairs, first is the answer.
  const RE = (prompt, pairs) => () => {
    const names = Object.fromEntries(pairs);
    const qq = q('trivia', prompt, pairs[0][0], pairs.map((p) => p[0]), { emojiChoices: true, autoSay: true, say: prompt, sayAnswer: `the ${pairs[0][1]}` });
    return qq;
  };
  const BALL4 = [['🏀', 'basketball'], ['⚽', 'soccer ball'], ['⚾', 'baseball'], ['🏈', 'football'], ['🎾', 'tennis ball']];
  const ballQ = (i) => RE(`Which one is a ${BALL4[i][1]}?`, [BALL4[i], ...BALL4.filter((_, j) => j !== i).slice(0, 3)]);
  const rookieTrivia = [
    ...BALL4.map((_, i) => ballQ(i)),
    R('What do you use to hit a baseball?', '🏏 Bat', ['🥄 Spoon', '🧦 Sock'], '⚾'),
    R('What color is a basketball?', '🟠 Orange', ['🟣 Purple', '🟢 Green'], '🏀'),
    R('In kickball, what do you kick?', '🔴 Ball', ['🥾 Boot', '🍌 Banana'], '🦶'),
    R('Where does a soccer ball go to score?', '🥅 Goal', ['🛁 Bathtub', '🌳 Tree'], '⚽'),
    R('What do you wear on your hand to catch a baseball?', '🧤 Glove', ['🧢 Hat', '👟 Shoe'], '⚾'),
    R('What do football players wear on their heads?', '🪖 Helmet', ['👑 Crown', '🪣 Bucket'], '🏈'),
    R('What do you wear on your feet to run fast?', '👟 Sneakers', ['🧤 Mittens', '🎩 Top hat'], '🏃'),
    R('Where do you go swimming?', '🏊 Pool', ['🏜️ Desert', '🛏️ Bed'], '🩱'),
    R('What do you hit a hockey puck with?', '🏒 Stick', ['🥄 Spoon', '🎈 Balloon'], '🏒'),
    R('What do you get for winning first place?', '🥇 Gold medal', ['🥔 Potato', '🧦 Sock'], '🏆'),
    R('What should you drink after you play?', '💧 Water', ['🎨 Paint', '🛢️ Oil'], '🥤'),
    R('What do you say to the other team after a game?', '🤝 Good game', ['😝 Nah nah', '🙈 Nothing'], '🏆'),
    R('Where do you shoot a basketball?', '⭕ Hoop', ['📬 Mailbox', '🚽 Toilet'], '🏀'),
    R('What do you swing to hit a tennis ball?', '🏸 Racket', ['🍳 Frying pan', '🪥 Toothbrush'], '🎾'),
    R('Which animal is the fastest runner?', '🐆 Cheetah', ['🐢 Turtle', '🐌 Snail'], '🏁'),
    R('What shape is a soccer ball?', '🔵 Round', ['🟥 Square', '🔺 Triangle'], '⚽'),
    R('What does a football look like?', '🥚 An egg', ['🎲 A block', '⭐ A star'], '🏈'),
    R('Where do you play baseball?', '🏟️ Ball field', ['🛁 Bathtub', '🛒 Store'], '⚾'),
    R('What yummy food do people eat at a baseball game?', '🌭 Hot dog', ['🧼 Soap', '🪨 Rock'], '⚾'),
    R('Who wins a race?', '⚡ The fastest', ['🐢 The slowest', '😴 The sleepiest'], '🏁'),
    R('What do you wear on your eyes to swim?', '🥽 Goggles', ['🧤 Mittens', '🧥 Coat'], '🏊'),
    R('What do fans do when their team scores?', '📣 Cheer', ['😭 Cry', '😴 Sleep'], '🎉'),
    R('What do you bounce when you dribble?', '🏀 Ball', ['🥚 Egg', '🍉 Watermelon'], '⛹️'),
    R('What do you wear on your head to ride a bike?', '🪖 Helmet', ['🎂 Cake', '🧦 Sock'], '🚲'),
    R('What do you skate on in hockey?', '🧊 Ice', ['🍯 Honey', '🌊 Water'], '⛸️'),
    R('What do you need to play soccer?', '⚽ Ball', ['🍝 Spaghetti', '🛏️ Bed'], '🥅'),
    R('What does the winning team get?', '🏆 Trophy', ['🧹 Broom', '🧽 Sponge'], '🎉'),
    R('Which one can you ride?', '🚲 Bike', ['🍕 Pizza', '📚 Book'], '🛣️'),
    RE('Which one is a trophy?', [['🏆', 'trophy'], ['🍌', 'banana'], ['🧸', 'teddy bear'], ['🚗', 'car']]),
    RE('Which one is a bike?', [['🚲', 'bike'], ['🚗', 'car'], ['🚂', 'train'], ['✈️', 'airplane']]),
    RE('Which person is swimming?', [['🏊', 'swimmer'], ['🚴', 'bike rider'], ['⛹️', 'basketball player'], ['🏌️', 'golfer']]),
    RE('Which person is riding a bike?', [['🚴', 'bike rider'], ['🏊', 'swimmer'], ['⛹️', 'basketball player'], ['🏌️', 'golfer']]),
    RE('Which one is a hockey stick?', [['🏒', 'hockey stick'], ['🥄', 'spoon'], ['🪥', 'toothbrush'], ['🔨', 'hammer']]),
    RE('Which one is a medal?', [['🏅', 'medal'], ['🍪', 'cookie'], ['🎈', 'balloon'], ['🧢', 'cap']]),
  ];

  const BANK = {
    allstar: { math: allStarMath, spelling: allStarSpelling, trivia: allStarTrivia },
    rookie: { math: rookieMath, spelling: rookieSpelling, trivia: rookieTrivia },
  };

  // ---------- NO-REPEAT DECKS ----------
  // One set of decks per game (keyed by the game id the host sends). Each deck remembers
  // every question it has shown, so a question never comes back in the same game.
  const STORE = 'gds-seen';
  let game = null, decks = {}, subjectDeck = [];
  const keyOf = (qq) => `${qq.prompt}|${qq.big || ''}|${qq.answer}`;

  function save() {
    try {
      const keys = {};
      for (const id in decks) keys[id] = [...decks[id].seen];
      sessionStorage.setItem(STORE, JSON.stringify({ game, keys }));
    } catch (e) { /* storage blocked: still no repeats until the page reloads */ }
  }
  function newGame(id) {
    game = id; decks = {}; subjectDeck = [];
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) || 'null');
      // Same game after a page reload: remember what was already asked.
      if (saved && id != null && saved.game === id) for (const k in saved.keys) decks[k] = { order: [], seen: new Set(saved.keys[k]) };
    } catch (e) { /* ignore */ }
  }
  function draw(level, subject) {
    const id = level + ':' + subject, gens = BANK[level][subject];
    const d = decks[id] || (decks[id] = { order: [], seen: new Set() });
    for (let round = 0; round < 2; round++) {
      let refills = 0;
      for (;;) {
        if (!d.order.length) { if (refills++ > 0) break; d.order = shuffle(gens); }
        const gen = d.order.pop();
        // A fixed question gives the same thing every time; a generator gets a few tries
        // to come up with numbers that haven't been used yet.
        for (let t = 0; t < 25; t++) {
          const qq = gen(), k = keyOf(qq);
          if (!d.seen.has(k)) { d.seen.add(k); return qq; }
        }
      }
      d.seen.clear(); // every question in this deck has been asked: start the deck over
    }
    return gens[0]();
  }

  function make(level, subjects, gameId) {
    if (gameId !== game) newGame(gameId);
    const bank = BANK[level] ? level : 'allstar';
    const subs = (subjects && subjects.length ? subjects : ['math', 'spelling', 'trivia']).filter((s) => BANK[bank][s]);
    if (!subs.length) subs.push('math');
    // Take turns between subjects in a shuffled order so no type hogs the game.
    subjectDeck = subjectDeck.filter((s) => subs.includes(s));
    if (!subjectDeck.length) subjectDeck = shuffle(subs);
    const question = draw(bank, subjectDeck.pop());
    if (!question.say) question.say = question.prompt;
    save();
    return question;
  }

  window.Questions = { make, _BANK: BANK, _keyOf: keyOf };
})();
