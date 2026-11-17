// Question generators for Game Day Showdown.
// Each question: { prompt, say, big, choices: [string], answer: string, subject }
// "say" is read aloud; "big" is an optional large picture line (emoji).
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
  const TEAMS = ['Hawks', 'Tigers', 'Sharks', 'Bears', 'Rockets', 'Eagles', 'Lions', 'Comets'];
  const KIDS = ['Max', 'Lily', 'Sam', 'Ava', 'Leo', 'Mia', 'Jack', 'Zoe'];

  // ---------- ALL-STAR (2nd grade) MATH ----------
  const allStarMath = [
    () => { const a = rnd(2, 10), b = rnd(2, 10); return q('math', `${a} + ${b} = ?`, a + b, numChoices(a + b, 3), { say: `${a} plus ${b}` }); },
    () => { const a = rnd(10, 20), b = rnd(2, 10); return q('math', `${a} − ${b} = ?`, a - b, numChoices(a - b, 3), { say: `${a} minus ${b}` }); },
    () => { const a = rnd(11, 69), b = rnd(5, 29); return q('math', `${a} + ${b} = ?`, a + b, numChoices(a + b, 10), { say: `${a} plus ${b}` }); },
    () => { const a = rnd(30, 99), b = rnd(5, a - 5); return q('math', `${a} − ${b} = ?`, a - b, numChoices(a - b, 10), { say: `${a} minus ${b}` }); },
    () => { const a = rnd(2, 9), s = rnd(a + 2, 18); return q('math', `${a} + ? = ${s}`, s - a, numChoices(s - a, 3), { say: `${a} plus what equals ${s}?` }); },
    () => {
      const n = rnd(100, 999), places = ['ones', 'tens', 'hundreds'], i = rnd(0, 2);
      const digit = String(n)[2 - i];
      const ds = uniq(String(n).split('').concat([String(rnd(0, 9)), String(rnd(0, 9)), String(rnd(0, 9))])).slice(0, 4);
      if (!ds.includes(digit)) ds[0] = digit;
      return q('math', `In ${n}, which digit is in the ${places[i]} place?`, digit, ds);
    },
    () => {
      const by = pick([2, 5, 10]), start = by * rnd(0, 6), seq = [0, 1, 2, 3].map((k) => start + k * by);
      return q('math', `Skip count: ${seq.join(', ')}, ___`, start + 4 * by, numChoices(start + 4 * by, 3).map(Number).map((v) => v), { say: `What comes next? ${seq.join(', ')}` });
    },
    () => { const n = rnd(11, 99); return q('math', `Is ${n} even or odd?`, n % 2 ? 'Odd' : 'Even', ['Even', 'Odd']); },
    () => {
      const ns = uniq([rnd(10, 99), rnd(10, 99), rnd(10, 99), rnd(10, 99)]);
      while (ns.length < 4) ns.push(rnd(100, 120));
      const big = Math.random() < 0.5;
      return q('math', `Which number is the ${big ? 'BIGGEST' : 'SMALLEST'}?`, big ? Math.max(...ns) : Math.min(...ns), ns);
    },
    () => {
      const qs = rnd(0, 2), d = rnd(0, 3), n = rnd(0, 2), p = rnd(1, 4);
      const total = qs * 25 + d * 10 + n * 5 + p;
      const parts = [];
      if (qs) parts.push(`${qs} quarter${qs > 1 ? 's' : ''}`);
      if (d) parts.push(`${d} dime${d > 1 ? 's' : ''}`);
      if (n) parts.push(`${n} nickel${n > 1 ? 's' : ''}`);
      parts.push(`${p} penn${p > 1 ? 'ies' : 'y'}`);
      return q('math', `How much money? ${parts.join(', ')}`, `${total}¢`, numChoices(total, 6, (v) => `${v}¢`), { big: '🪙' });
    },
    () => {
      const h = rnd(1, 12), half = Math.random() < 0.5;
      const clock = String.fromCodePoint((half ? 0x1f55c : 0x1f550) + h - 1);
      const ans = `${h}:${half ? '30' : '00'}`;
      const other = `${h}:${half ? '00' : '30'}`;
      const h2 = (h % 12) + 1, h0 = ((h + 10) % 12) + 1;
      return q('math', 'What time is it?', ans, [ans, other, `${h2}:${half ? '30' : '00'}`, `${h0}:${half ? '30' : '00'}`], { big: clock });
    },
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
  ];

  // ---------- ROOKIE (ages 4–6) MATH ----------
  const rookieMath = [
    () => { const n = rnd(1, 10), b = pick(BALLS); return q('math', `How many ${b}?`, n, numChoices(n, 2), { big: b.repeat(n), say: 'How many balls do you see? Count them!' }); },
    () => { const a = rnd(1, 5), c = rnd(1, 4), b = pick(BALLS); return q('math', `${a} + ${c} = ?`, a + c, numChoices(a + c, 2), { big: `${b.repeat(a)} ➕ ${b.repeat(c)}`, say: `${a} plus ${c}. How many in all?` }); },
    () => { const a = rnd(3, 7), c = rnd(1, a - 1), b = pick(BALLS); return q('math', `${a} − ${c} = ?`, a - c, numChoices(a - c, 2), { big: b.repeat(a), say: `You have ${a} balls. ${c} roll away. How many are left?` }); },
    () => { const a = rnd(1, 10); let c = rnd(1, 10); if (c === a) c = a + 1; return q('math', 'Which number is BIGGER?', Math.max(a, c), [a, c], { say: `Which number is bigger, ${a} or ${c}?` }); },
    () => { const s = rnd(1, 7); return q('math', `${s}, ${s + 1}, ${s + 2}, ___`, s + 3, numChoices(s + 3, 2), { say: `What number comes next? ${s}, ${s + 1}, ${s + 2}` }); },
    () => {
      const shapes = [['circle', '🔵'], ['square', '🟥'], ['triangle', '🔺'], ['star', '⭐'], ['heart', '❤️']];
      const [name, em] = pick(shapes);
      return q('math', `Which one is a ${name}?`, em, shuffle(shapes).slice(0, 3).map((s) => s[1]).concat(em), { say: `Which one is a ${name}?`, emojiChoices: true });
    },
  ];

  // ---------- ALL-STAR SPELLING ----------
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
    ['coach', 'coch', 'koach', 'coatch', 'The coach blew the whistle.'],
    ['field', 'feild', 'feeld', 'fild', 'We ran across the field.'],
    ['game', 'gaim', 'gam', 'gaem', 'The game starts at noon.'],
    ['jump', 'jupm', 'jumpe', 'jomp', 'Jump as high as you can.'],
    ['run', 'runn', 'ron', 'rnu', 'Run to home plate!'],
    ['fast', 'fasst', 'fats', 'fest', 'He runs really fast.'],
    ['again', 'agen', 'agian', 'ugain', 'Let’s play again.'],
    ['when', 'wen', 'whin', 'whenn', 'When is the game?'],
    ['where', 'wear', 'were', 'whare', 'Where is my glove?'],
    ['they', 'thay', 'tehy', 'thei', 'They are on my team.'],
    ['said', 'sed', 'siad', 'sayd', 'The coach said good job.'],
    ['people', 'peple', 'poeple', 'peeple', 'Lots of people came to the game.'],
    ['would', 'wood', 'wuold', 'woud', 'Would you like to play?'],
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
    ['want', 'wont', 'whant', 'wnat', 'I want to be the pitcher.'],
    ['very', 'vary', 'verry', 'vere', 'That was very fun!'],
    ['pitch', 'pich', 'pitsh', 'pitchh', 'Roll the pitch slowly.'],
  ];
  const allStarSpelling = [
    () => {
      const [w, ...rest] = pick(SPELL);
      const sentence = rest.pop();
      return q('spelling', 'Which word is spelled right?', w, [w, ...rest], { say: `Spell: ${w}. ${sentence} ... ${w}.`, big: '🔊', autoSay: true });
    },
  ];

  // ---------- ROOKIE LETTERS ----------
  const PICS = [
    ['🐶', 'dog'], ['🐱', 'cat'], ['☀️', 'sun'], ['🐷', 'pig'], ['🚌', 'bus'], ['🦊', 'fox'], ['🐝', 'bee'],
    ['⚽', 'ball'], ['🎩', 'hat'], ['🥚', 'egg'], ['🐟', 'fish'], ['🦖', 'dino'], ['🍎', 'apple'], ['🐻', 'bear'],
  ];
  const LETTERS = 'ABCDEFGHIJKLMNOPRSTW'.split('');
  const CVC = [
    ['🐱', 'cat', ['kat', 'cta', 'cet']], ['🐶', 'dog', ['dgo', 'dag', 'bog']], ['☀️', 'sun', ['sn', 'son', 'snu']],
    ['🐷', 'pig', ['pgi', 'big', 'peg']], ['🚌', 'bus', ['bas', 'buz', 'dus']], ['🎩', 'hat', ['het', 'aht', 'hatt']],
    ['🛏️', 'bed', ['bad', 'deb', 'bedd']], ['🦊', 'fox', ['fax', 'fux', 'ofx']], ['🏃', 'run', ['rn', 'rnu', 'ran']],
  ];
  const SIGHT = ['the', 'and', 'see', 'is', 'go', 'can', 'my', 'we', 'it', 'up', 'to', 'like', 'me', 'you', 'big', 'look'];
  const rookieSpelling = [
    () => {
      const [em, word] = pick(PICS), L = word[0].toUpperCase();
      return q('spelling', `What letter does ${word} start with?`, L, shuffle(LETTERS.filter((x) => x !== L)).slice(0, 3).concat(L), { big: em, say: `What letter does ${word} start with?`, autoSay: true });
    },
    () => {
      const [em, word, wrong] = pick(CVC);
      return q('spelling', `Which one spells ${word.toUpperCase().split('').join('-')}?`, word, [word, ...wrong], { big: em, say: `Which one spells ${word}?`, autoSay: true });
    },
    () => {
      const w = pick(SIGHT);
      return q('spelling', 'Tap the word you hear!', w, shuffle(SIGHT.filter((x) => x !== w)).slice(0, 3).concat(w), { big: '🔊', say: `Find the word: ${w}. ${w}.`, autoSay: true });
    },
  ];

  // ---------- SPORTS TRIVIA ----------
  const T = (prompt, answer, wrong, big) => () => q('trivia', prompt, answer, [answer, ...wrong], { big });
  const allStarTrivia = [
    T('How many players from one team are on a basketball court at a time?', '5', ['3', '7', '11'], '🏀'),
    T('How many points is a free throw worth?', '1', ['2', '3', '5'], '🏀'),
    T('A basketball shot from behind the big arc is worth how many points?', '3', ['1', '2', '4'], '🏀'),
    T('How high is a basketball hoop?', '10 feet', ['5 feet', '20 feet', '100 feet'], '🏀'),
    T('How many points is a touchdown worth?', '6', ['1', '3', '10'], '🏈'),
    T('How many points is a field goal worth in football?', '3', ['1', '2', '6'], '🏈'),
    T('What shape is a football?', 'Oval', ['Circle', 'Square', 'Star'], '🏈'),
    T('How many quarters are in a football game?', '4', ['2', '3', '9'], '🏈'),
    T('The big championship game in football is called the…', 'Super Bowl', ['World Series', 'World Cup', 'Stanley Cup'], '🏆'),
    T('How many players from one team are on the field in soccer?', '11', ['5', '9', '20'], '⚽'),
    T('In soccer, which player is allowed to use their hands?', 'Goalie', ['Striker', 'Coach', 'Everyone'], '🧤'),
    T('What color card means a soccer player has to leave the game?', 'Red', ['Yellow', 'Green', 'Blue'], '🟥'),
    T('The World Cup is a contest for which sport?', 'Soccer', ['Baseball', 'Basketball', 'Football'], '🌎'),
    T('How many strikes make an out in baseball?', '3', ['2', '4', '5'], '⚾'),
    T('How many bases are there in baseball (counting home plate)?', '4', ['3', '5', '6'], '⚾'),
    T('Hitting the ball over the fence in baseball is called a…', 'Home run', ['Touchdown', 'Slam dunk', 'Goal'], '⚾'),
    T('How many innings are in a regular pro baseball game?', '9', ['4', '6', '12'], '⚾'),
    T('The big championship in baseball is called the…', 'World Series', ['Super Bowl', 'World Cup', 'Final Four'], '🏆'),
    T('In kickball, how does the pitcher send the ball to the kicker?', 'Rolls it', ['Throws it high', 'Kicks it', 'Bounces it on their head'], '🔴'),
    T('In kickball, how many outs end your team’s turn?', '3', ['1', '5', '10'], '🔴'),
    T('In kickball, you can get a runner out by…', 'Tagging them with the ball', ['Tickling them', 'Yelling “out!”', 'Taking their shoe'], '🔴'),
    T('Which sport has a slam dunk?', 'Basketball', ['Soccer', 'Baseball', 'Kickball'], '🏀'),
    T('Which sport uses a bat?', 'Baseball', ['Soccer', 'Basketball', 'Football'], '⚾'),
    T('Which sport is played on ice with a puck?', 'Hockey', ['Soccer', 'Baseball', 'Tennis'], '🏒'),
    T('Which sport do you play mostly with your feet?', 'Soccer', ['Basketball', 'Baseball', 'Hockey'], '⚽'),
    T('What do football players wear on their heads?', 'Helmet', ['Crown', 'Baseball cap', 'Headband only'], '🏈'),
    T('Which of these is NOT a baseball position?', 'Goalie', ['Pitcher', 'Catcher', 'Shortstop'], '⚾'),
    T('In basketball, bouncing the ball while you move is called…', 'Dribbling', ['Punting', 'Pitching', 'Bunting'], '🏀'),
  ];
  const rookieTrivia = [
    () => q('trivia', 'Which one is a basketball?', '🏀', ['🏀', '⚽', '⚾', '🏈'], { say: 'Which one is a basketball?', emojiChoices: true, autoSay: true }),
    () => q('trivia', 'Which one is a soccer ball?', '⚽', ['🏀', '⚽', '⚾', '🏈'], { say: 'Which one is a soccer ball?', emojiChoices: true, autoSay: true }),
    () => q('trivia', 'Which one is a football?', '🏈', ['🏀', '⚽', '⚾', '🏈'], { say: 'Which one is a football?', emojiChoices: true, autoSay: true }),
    () => q('trivia', 'Which one is a baseball?', '⚾', ['🏀', '⚽', '⚾', '🏈'], { say: 'Which one is a baseball?', emojiChoices: true, autoSay: true }),
    () => q('trivia', 'What do you use to hit a baseball?', '🏏 Bat', ['🏏 Bat', '🥄 Spoon', '🧦 Sock'], { big: '⚾', say: 'What do you use to hit a baseball? A bat, a spoon, or a sock?', autoSay: true }),
    () => q('trivia', 'What color is a basketball?', 'Orange', ['Orange', 'Purple', 'Green'], { big: '🏀', say: 'What color is a basketball? Orange, purple, or green?', autoSay: true }),
    () => q('trivia', 'In kickball, what do you kick?', '🔴 Ball', ['🔴 Ball', '🥾 Boot', '🍌 Banana'], { big: '🦶', say: 'In kickball, what do you kick? A ball, a boot, or a banana?', autoSay: true }),
    () => q('trivia', 'Where does a soccer ball go to score?', '🥅 Goal', ['🥅 Goal', '🛁 Bathtub', '🌳 Tree'], { big: '⚽', say: 'Where does a soccer ball go to score? The goal, the bathtub, or a tree?', autoSay: true }),
    () => q('trivia', 'Which one do you wear on your hand to catch a baseball?', '🧤 Glove', ['🧤 Glove', '🧢 Hat', '👟 Shoe'], { say: 'What do you wear on your hand to catch a baseball? A glove, a hat, or a shoe?', autoSay: true }),
  ];

  const BANK = {
    allstar: { math: allStarMath, spelling: allStarSpelling, trivia: allStarTrivia },
    rookie: { math: rookieMath, spelling: rookieSpelling, trivia: rookieTrivia },
  };

  let lastPrompt = '';
  function make(level, subjects) {
    const bank = BANK[level] || BANK.allstar;
    const subs = (subjects && subjects.length ? subjects : ['math', 'spelling', 'trivia']).filter((s) => bank[s]);
    for (let i = 0; i < 10; i++) {
      const s = pick(subs);
      // spelling only has one generator for all-stars, so weight math a bit more
      const gen = pick(bank[s]);
      const question = gen();
      if (question.prompt + question.answer !== lastPrompt) {
        lastPrompt = question.prompt + question.answer;
        if (!question.say) question.say = question.prompt;
        return question;
      }
    }
    return pick(bank.math)();
  }

  window.Questions = { make, _BANK: BANK };
})();
