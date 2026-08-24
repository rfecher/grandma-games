/* All three games are the same shape: a prompt, a few big buttons, a warm
   reaction. Only the question bank changes. */

const Game = {
  key: null,        /* 'trivia' | 'lines' | 'remember' */
  bank: {},         /* loaded question arrays, by key */
  item: null,       /* the question on screen */
  view: null,       /* choices as displayed, plus the correct display index */
  answered: false,

  async start(key) {
    Game.key = key;
    Store.data.last = key;
    Store.save();
    show('game');
    renderStarCount();

    if (!Game.bank[key]) {
      Game.showMessage('Just a moment…', 'Getting your questions ready.');
      try {
        Game.bank[key] = await Game.loadBank(key);
      } catch (e) {
        Game.showMessage(
          'Hmm, the questions did not load.',
          'Try closing this and opening it again. If it keeps happening, give one of the kids a call.'
        );
        return;
      }
    }
    Game.render();
  },

  async loadBank(key) {
    const files = CONFIG.games[key].files;
    const parts = await Promise.all(files.map((f) => fetch(f).then((r) => {
      if (!r.ok) throw new Error(f);
      return r.json();
    })));
    const all = [].concat.apply([], parts);
    if (!all.length) throw new Error('empty');
    return all;
  },

  /* A calm full-card message (loading / trouble), with no choices. */
  showMessage(head, body) {
    $('q-cat').textContent = '';
    $('q-text').textContent = head;
    $('q-card').classList.remove('answered');
    $('choices').innerHTML = '';
    $('btn-next').hidden = true;
    $('btn-speak').hidden = true;
    const fb = $('feedback');
    fb.hidden = false;
    fb.className = 'feedback try';
    $('fb-head').textContent = '';
    $('fb-answer').textContent = '';
    $('fb-fact').textContent = body;
  },

  render() {
    const bank = Game.bank[Game.key];
    const prog = Store.order(Game.key, bank.length);
    Game.item = bank[prog.order[prog.pos]];
    Game.answered = false;

    /* Build the on-screen choice order. */
    const idx = Game.item.choices.map((_, i) => i);
    if (CONFIG.games[Game.key].shuffleChoices) {
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
    }
    Game.view = {
      order: idx,
      correct: idx.indexOf(Game.item.answer)
    };

    $('q-cat').textContent = Game.item.cat || CONFIG.games[Game.key].title;
    $('q-text').textContent = Game.item.q;
    $('q-card').classList.remove('answered');
    $('btn-speak').hidden = !Speech.ok;
    Game.updateSpeakButton();
    $('feedback').hidden = true;
    $('btn-next').hidden = true;

    const wrap = $('choices');
    wrap.className = 'choices';
    wrap.innerHTML = '';
    idx.forEach((original, shown) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.innerHTML = '<span class="num"></span><span class="label"></span><span class="mark"></span>';
      b.querySelector('.num').textContent = shown + 1;
      b.querySelector('.label').textContent = Game.item.choices[original];
      b.addEventListener('click', () => Game.answer(shown, b));
      wrap.appendChild(b);
    });

    if (Store.data.autoRead) setTimeout(() => Game.speak(), 350);
  },

  answer(shown, btn) {
    if (Game.answered) return;
    Game.answered = true;
    Speech.stop();

    const right = shown === Game.view.correct;
    const buttons = Array.from($('choices').children);
    $('choices').classList.add('locked');
    $('q-card').classList.add('answered');

    buttons.forEach((b, i) => {
      if (i === Game.view.correct) {
        b.classList.add('correct');
        b.querySelector('.mark').textContent = '✓';
      } else if (b === btn) {
        b.classList.add('wrong');
      }
    });

    /* She sees her tap land, then the buttons fold away and the answer moves
       into the result panel — that keeps everything on one screen, with no
       scrolling to reach the Next button. */
    setTimeout(() => buttons.forEach((b) => b.classList.add('gone')), 800);

    const correctText = Game.item.choices[Game.item.answer];
    const fb = $('feedback');
    fb.hidden = false;
    fb.className = right ? 'feedback' : 'feedback try';
    const list = right ? CONFIG.cheers : CONFIG.encouragements;
    const head = list[Math.floor(Math.random() * list.length)];
    $('fb-head').textContent = head;
    $('fb-answer').textContent = '✓ ' + correctText;
    $('fb-fact').textContent = Game.item.fact || '';
    $('btn-next').hidden = false;

    if (Store.data.autoRead) {
      const spoken = (right ? head : head + ' The answer was ' + correctText + '.')
        + ' ' + (Game.item.fact || '');
      setTimeout(() => Speech.say(spoken), 900);
    }

    if (right) {
      const kid = Store.awardStar();
      renderStarCount();
      if (Store.data.total % CONFIG.CELEBRATE_EVERY === 0) {
        Game.pendingKid = kid;
        Game.celebrateTimer = setTimeout(() => {
          Game.pendingKid = null;
          celebrate(kid);
        }, 500);
      } else {
        toast('⭐ A star for ' + kid.name + '!');
      }
    }
  },

  next() {
    /* If she tapped Next before the celebration had a chance to appear, show
       it over the new question rather than swallowing it. */
    const owed = Game.pendingKid;
    clearTimeout(Game.celebrateTimer);
    Game.pendingKid = null;

    Store.advance(Game.key, Game.bank[Game.key].length);
    Game.render();
    window.scrollTo(0, 0);

    if (owed) celebrate(owed);
  },

  /* ---- reading aloud ---- */
  speechText() {
    const parts = [Game.item.q];
    Game.view.order.forEach((original, shown) => {
      parts.push('Number ' + (shown + 1) + '. ' + Game.item.choices[original] + '.');
    });
    return parts.join(' … ');
  },

  speak() {
    if (!Game.item) return;
    $('btn-speak').classList.add('speaking');
    Speech.say(Game.speechText(), () => $('btn-speak').classList.remove('speaking'));
  },

  /* The button doubles as an on/off switch: once she asks for reading,
     every question reads itself until she turns it back off. */
  speakQuestion() {
    if (Store.data.autoRead) {
      Store.data.autoRead = false;
      Speech.stop();
      $('btn-speak').classList.remove('speaking');
    } else {
      Store.data.autoRead = true;
      Game.speak();
    }
    Store.save();
    Game.updateSpeakButton();
  },

  updateSpeakButton() {
    $('btn-speak').textContent = Store.data.autoRead ? '🔊 Stop reading aloud' : '🔊 Read it to me';
  }
};
