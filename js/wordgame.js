/* Crossword Clues: one clue at a time, spelled by tapping big letter tiles.
   No keyboard (too small, and its left third may be invisible to her) and no
   grid (scanning a grid is exactly what left neglect breaks). */

const DECOY_POOL = 'EEEAAAIIOOTTNNSSRRLLDDHCMPBGUYWFK';

const WordGame = {
  key: null,
  item: null,
  squares: [],     /* { letter, tile, locked, given } — letter is what she placed */
  tiles: [],       /* { letter, used } — used tiles stay as ghosts so nothing shifts */
  filled: [],      /* square indices in the order she filled them, for Take back */
  misses: 0,       /* full-board checks that weren't right yet */
  hints: 0,
  done: false,
  checking: false,
  skipAdvance: false,

  async start(key) {
    WordGame.key = key;
    Store.data.last = key;
    Store.save();
    show('word');
    renderStarCount();
    renderLevelChip();

    if (!Game.bank[key]) {
      $('w-clue').textContent = 'Just a moment…';
      $('w-squares').innerHTML = '';
      $('w-tiles').innerHTML = '';
      try {
        Game.bank[key] = await Game.loadBank(key);
      } catch (e) {
        $('w-clue').textContent = 'Hmm, the clues did not load. Try closing this and opening it again.';
        return;
      }
    }
    const bank = Game.bank[key];
    if (Store.order(key, bank).shown) Store.advance(key, bank);
    WordGame.render();
  },

  render() {
    const bank = Game.bank[WordGame.key];
    const prog = Store.order(WordGame.key, bank);
    const item = WordGame.item = bank[prog.order[prog.pos]];
    const answer = item.a;
    const opts = CONFIG.levels[Store.data.level].word;

    WordGame.misses = 0;
    WordGame.hints = 0;
    WordGame.done = false;
    WordGame.checking = false;
    WordGame.filled = [];

    const givenCount = Math.min(opts.given(answer.length), answer.length - 1);
    const given = new Set();
    if (givenCount > 0) given.add(0);
    const rest = shuffle(answer.split('').map((_, i) => i).slice(1));
    while (given.size < givenCount) given.add(rest.pop());

    WordGame.squares = answer.split('').map((ch, i) => given.has(i)
      ? { letter: ch, tile: null, locked: true, given: true }
      : { letter: null, tile: null, locked: false, given: false });

    const letters = answer.split('').filter((_, i) => !given.has(i));
    for (let i = 0; i < opts.decoys; i++) {
      letters.push(DECOY_POOL[Math.floor(Math.random() * DECOY_POOL.length)]);
    }
    const needed = answer.split('').filter((_, i) => !given.has(i)).join('');
    for (let tries = 0; tries < 20; tries++) {
      shuffle(letters);
      if (!letters.join('').startsWith(needed)) break;
    }
    WordGame.tiles = letters.map((l) => ({ letter: l, used: false }));

    $('w-cat').textContent = (item.cat || 'Crossword') + ' · ' + answer.length + ' letters';
    $('w-clue').textContent = item.q;
    $('w-card').classList.remove('answered');
    $('w-speak').hidden = !Speech.ok;
    WordGame.updateSpeakButton();
    $('w-note').textContent = '';
    $('w-reveal').hidden = true;
    $('w-play').hidden = false;
    $('w-feedback').hidden = true;
    $('w-next').hidden = true;

    WordGame.draw();
    Store.markShown(WordGame.key, item, bank.length);
    if (Store.data.autoRead) setTimeout(() => WordGame.speak(), 350);
  },

  draw() {
    const sq = $('w-squares');
    sq.innerHTML = '';
    sq.classList.toggle('long', WordGame.squares.length >= 8);
    const cursor = WordGame.squares.findIndex((s) => !s.letter);
    WordGame.squares.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'square'
        + (s.letter ? ' filled' : '')
        + (s.given ? ' given' : s.locked ? ' locked' : '')
        + (i === cursor && !WordGame.done ? ' cursor' : '')
        + (WordGame.done ? ' solved' : '');
      b.textContent = s.letter || '';
      b.setAttribute('aria-label', s.letter ? 'Letter ' + s.letter : 'Empty square');
      b.addEventListener('click', () => WordGame.tapSquare(i));
      sq.appendChild(b);
    });

    const tl = $('w-tiles');
    tl.innerHTML = '';
    WordGame.tiles.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = 'tile' + (t.used ? ' used' : '');
      b.textContent = t.used ? '' : t.letter;
      b.disabled = t.used;
      b.addEventListener('click', () => WordGame.tapTile(i));
      tl.appendChild(b);
    });

    $('w-back').disabled = !WordGame.filled.length;
  },

  tapTile(i) {
    const t = WordGame.tiles[i];
    if (WordGame.done || WordGame.checking || t.used) return;
    const slot = WordGame.squares.findIndex((s) => !s.letter);
    if (slot === -1) return;
    WordGame.place(slot, i);
    $('w-note').textContent = '';
    WordGame.draw();
    if (WordGame.squares.every((s) => s.letter)) WordGame.check();
  },

  place(slot, tileIndex) {
    const s = WordGame.squares[slot];
    s.letter = WordGame.tiles[tileIndex].letter;
    s.tile = tileIndex;
    WordGame.tiles[tileIndex].used = true;
    WordGame.filled.push(slot);
  },

  unplace(slot) {
    const s = WordGame.squares[slot];
    if (s.locked || !s.letter) return;
    WordGame.tiles[s.tile].used = false;
    s.letter = null;
    s.tile = null;
    WordGame.filled = WordGame.filled.filter((n) => n !== slot);
  },

  tapSquare(i) {
    if (WordGame.done || WordGame.checking) return;
    WordGame.unplace(i);
    WordGame.draw();
  },

  takeBack() {
    if (WordGame.done || WordGame.checking || !WordGame.filled.length) return;
    WordGame.unplace(WordGame.filled[WordGame.filled.length - 1]);
    WordGame.draw();
  },

  /* Runs as soon as the last square fills, so there is no Check button to find.
     Right letters lock in place; wrong ones glow, then go back to the tiles. */
  check() {
    const answer = WordGame.item.a;
    const wrong = [];
    WordGame.squares.forEach((s, i) => {
      if (s.locked) return;
      if (s.letter === answer[i]) s.locked = true;
      else wrong.push(i);
    });
    WordGame.filled = WordGame.filled.filter((i) => !WordGame.squares[i].locked);

    if (!wrong.length) { WordGame.finish(true); return; }

    WordGame.misses += 1;
    WordGame.checking = true;
    WordGame.draw();
    const els = $('w-squares').children;
    wrong.forEach((i) => els[i].classList.add('oops'));
    $('w-note').textContent = wrong.length === 1
      ? 'So close — one letter is off.'
      : 'Almost — ' + wrong.length + ' letters are off. The right ones stay put.';
    if (Store.data.autoRead) Speech.say($('w-note').textContent);

    setTimeout(() => {
      wrong.forEach((i) => WordGame.unplace(i));
      WordGame.checking = false;
      if (WordGame.misses >= 2) $('w-reveal').hidden = false;
      WordGame.draw();
    }, 1100);
  },

  /* Locks the first letter that isn't right yet, pulling its tile from the
     bank, or from a square where she put it by mistake. */
  hint() {
    if (WordGame.done || WordGame.checking) return;
    const answer = WordGame.item.a;
    const slot = WordGame.squares.findIndex((s, i) => !s.locked && s.letter !== answer[i]);
    if (slot === -1) return;
    WordGame.unplace(slot);

    const want = answer[slot];
    let t = WordGame.tiles.findIndex((x) => !x.used && x.letter === want);
    if (t === -1) {
      const holder = WordGame.squares.findIndex((s, i) => !s.locked && s.letter === want && i !== slot);
      WordGame.unplace(holder);
      t = WordGame.tiles.findIndex((x) => !x.used && x.letter === want);
    }
    WordGame.place(slot, t);
    WordGame.squares[slot].locked = true;
    WordGame.squares[slot].given = true;
    WordGame.filled = WordGame.filled.filter((n) => n !== slot);
    WordGame.hints += 1;
    $('w-note').textContent = '';
    WordGame.draw();
    if (WordGame.squares.every((s) => s.letter)) WordGame.check();
  },

  reveal() {
    if (WordGame.done || WordGame.checking) return;
    WordGame.squares.forEach((s, i) => {
      if (!s.locked) { WordGame.unplace(i); s.letter = WordGame.item.a[i]; s.locked = true; }
    });
    WordGame.finish(false);
  },

  finish(solved) {
    WordGame.done = true;
    WordGame.draw();
    Speech.stop();
    $('w-card').classList.add('answered');
    $('w-play').hidden = true;

    const list = solved ? CONFIG.cheers : ['Here it is!', 'Now you know!', 'That was a tough one.'];
    const head = list[Math.floor(Math.random() * list.length)];
    $('w-feedback').className = solved ? 'feedback' : 'feedback try';
    $('w-fb-head').textContent = head;
    $('w-fb-answer').textContent = '✓ ' + WordGame.item.a;
    $('w-fb-fact').textContent = WordGame.item.fact || '';
    $('w-feedback').hidden = false;
    $('w-next').hidden = false;
    if (Store.data.autoRead) setTimeout(() => Speech.say(head + ' ' + (WordGame.item.fact || '')), 500);

    if (solved) rewardCorrect();
    const beforeSwitch = () => {
      Store.advance(WordGame.key, Game.bank[WordGame.key]);
      WordGame.skipAdvance = true;
    };
    /* A solve with hints is still a solve, but only clean solves build the
       "want to try Hard?" streak. */
    if (!solved) Coach.record(false, beforeSwitch);
    else if (!WordGame.hints) Coach.record(true, beforeSwitch);
  },

  next() {
    if (WordGame.skipAdvance) WordGame.skipAdvance = false;
    else Store.advance(WordGame.key, Game.bank[WordGame.key]);
    WordGame.render();
    window.scrollTo(0, 0);
  },

  speechText() {
    const item = WordGame.item;
    let text = item.q.replace(/_{2,}/g, 'blank') + ' … ' + item.a.length + ' letters.';
    const first = WordGame.squares[0];
    if (first && first.given) text += ' It starts with ' + first.letter + '.';
    return text;
  },

  speak() {
    if (!WordGame.item) return;
    $('w-speak').classList.add('speaking');
    Speech.say(WordGame.speechText(), () => $('w-speak').classList.remove('speaking'));
  },

  toggleSpeech() {
    Store.data.autoRead = !Store.data.autoRead;
    if (Store.data.autoRead) WordGame.speak();
    else { Speech.stop(); $('w-speak').classList.remove('speaking'); }
    Store.save();
    WordGame.updateSpeakButton();
  },

  updateSpeakButton() {
    $('w-speak').textContent = Store.data.autoRead ? '🔊 Stop reading aloud' : '🔊 Read it to me';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  $('w-back').addEventListener('click', () => WordGame.takeBack());
  $('w-hint').addEventListener('click', () => WordGame.hint());
  $('w-reveal').addEventListener('click', () => WordGame.reveal());
  $('w-next').addEventListener('click', () => WordGame.next());
  $('w-speak').addEventListener('click', () => WordGame.toggleSpeech());
});
