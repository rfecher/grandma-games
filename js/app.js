/* Screens, saved progress, difficulty levels, stars, speech, and the little
   flourishes. Nothing here is game-specific — see games.js for that. */

const $ = (id) => document.getElementById(id);

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------------------------------------------------------- storage */
const Store = {
  KEY: 'grandma-games-v1',
  data: null,

  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(Store.KEY)); } catch (e) { d = null; }
    Store.data = Object.assign(
      { stars: {}, total: 0, last: null, progress: {}, seen: {}, level: CONFIG.DEFAULT_LEVEL },
      d || {}
    );
    if (!CONFIG.levels[Store.data.level]) Store.data.level = CONFIG.DEFAULT_LEVEL;
    if (!Store.data.seen) Store.data.seen = {};
    CONFIG.kids.forEach((k) => {
      if (typeof Store.data.stars[k.name] !== 'number') Store.data.stars[k.name] = 0;
    });
    /* Progress saved before difficulty levels existed is keyed by game alone. */
    Object.keys(Store.data.progress).forEach((k) => {
      if (k.indexOf(':') === -1) delete Store.data.progress[k];
    });
    return Store.data;
  },

  save() {
    try { localStorage.setItem(Store.KEY, JSON.stringify(Store.data)); } catch (e) { /* private mode: play on */ }
  },

  /* Award one star to whichever grandkid is next in the rotation. */
  awardStar() {
    const kid = CONFIG.kids[Store.data.total % CONFIG.kids.length];
    Store.data.total += 1;
    Store.data.stars[kid.name] += 1;
    Store.save();
    return kid;
  },

  setLevel(n) {
    if (!CONFIG.levels[n]) return;
    Store.data.level = n;
    Store.save();
  },

  /* ---- question order -------------------------------------------------
     Each game keeps a running order per difficulty level. The order is a
     weighted shuffle across the difficulty tiers (see CONFIG.levels), and
     within each tier the questions she has never seen come first — so
     switching levels doesn't bring back things she just played. Nothing
     repeats until every eligible question has been shown once. */
  progressKey(game) { return game + ':' + Store.data.level; },

  order(game, bank) {
    const key = Store.progressKey(game);
    const sig = bank.length + '/' + Store.data.level;
    const p = Store.data.progress[key];
    if (p && p.sig === sig && p.pos < p.order.length) return p;
    const fresh = { order: Store.buildOrder(game, bank, Store.data.level), pos: 0, sig: sig, shown: false };
    Store.data.progress[key] = fresh;
    Store.save();
    return fresh;
  },

  buildOrder(game, bank, level) {
    const w = CONFIG.levels[level].weights;
    const seen = Store.data.seen[game] || {};
    const tiers = { 1: [], 2: [], 3: [] };
    bank.forEach((item, i) => {
      const d = tiers[item.d] ? item.d : 1;
      tiers[d].push(i);
    });
    /* Unseen first within each tier, each half shuffled. */
    [1, 2, 3].forEach((t) => {
      const fresh = shuffle(tiers[t].filter((i) => !seen[bank[i].q]));
      const old = shuffle(tiers[t].filter((i) => seen[bank[i].q]));
      tiers[t] = fresh.concat(old);
    });

    const ptr = { 1: 0, 2: 0, 3: 0 };
    const order = [];
    for (;;) {
      const avail = [1, 2, 3].filter((t) => w[t] > 0 && ptr[t] < tiers[t].length);
      if (!avail.length) break;
      let r = Math.random() * avail.reduce((s, t) => s + w[t], 0);
      let pick = avail[avail.length - 1];
      for (let k = 0; k < avail.length; k++) {
        r -= w[avail[k]];
        if (r <= 0) { pick = avail[k]; break; }
      }
      order.push(tiers[pick][ptr[pick]++]);
    }
    /* A level with nothing eligible (an unrated bank, say) falls back to everything. */
    if (!order.length) { bank.forEach((_, i) => order.push(i)); shuffle(order); }
    return order;
  },

  /* The question at the current position has been on screen. */
  markShown(game, item, bankSize) {
    const p = Store.data.progress[Store.progressKey(game)];
    if (p) p.shown = true;
    const seen = Store.data.seen[game] || (Store.data.seen[game] = {});
    seen[item.q] = 1;
    if (Object.keys(seen).length >= bankSize) Store.data.seen[game] = {};   /* seen them all — start over */
    Store.save();
  },

  advance(game, bank) {
    const key = Store.progressKey(game);
    const p = Store.data.progress[key];
    if (p) { p.pos += 1; p.shown = false; }
    if (!p || p.pos >= p.order.length) {
      delete Store.data.progress[key];
      Store.order(game, bank);
    }
    Store.save();
  }
};

/* ---------------------------------------------------------------- screens */
function show(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('is-active'));
  $('screen-' + name).classList.add('is-active');
  window.scrollTo(0, 0);
  Speech.stop();
}

/* ---------------------------------------------------------------- speech  */
const Speech = {
  ok: 'speechSynthesis' in window,
  say(text, onDone) {
    if (!Speech.ok) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = CONFIG.SPEECH_RATE;
      u.pitch = 1;
      u.onend = onDone || null;
      u.onerror = onDone || null;
      window.speechSynthesis.speak(u);
    } catch (e) { if (onDone) onDone(); }
  },
  stop() { if (Speech.ok) { try { window.speechSynthesis.cancel(); } catch (e) {} } }
};

/* ---------------------------------------------------------------- flourish */
let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  t.style.animation = 'none';
  void t.offsetWidth;
  t.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

/* One modal, shared by celebrations and the gentle "want to try Hard?"
   offers. Requests queue up so two never fight over the screen. */
const Modal = {
  queue: [],
  current: null,

  show(opts) {
    Modal.queue.push(opts);
    if (!Modal.current) Modal.next();
  },

  next() {
    const o = Modal.queue.shift();
    Modal.current = o || null;
    if (!o) { $('modal').hidden = true; return; }
    $('modal-icon').textContent = o.icon || '⭐';
    $('modal-msg').textContent = o.msg;
    $('modal-yes').querySelector('.btn-text').textContent = o.yes || 'Keep Going!';
    $('modal-no').hidden = !o.no;
    if (o.no) $('modal-no').querySelector('.btn-text').textContent = o.no;
    $('modal').hidden = false;
    if (Store.data.autoRead || o.speak) Speech.say(o.msg);
  },

  close(saidYes) {
    const o = Modal.current;
    if (o && saidYes && o.onYes) o.onYes();
    if (o && !saidYes && o.onNo) o.onNo();
    Modal.next();
  }
};

function celebrate(kid) {
  const tmpl = CONFIG.celebrations[Math.floor(Math.random() * CONFIG.celebrations.length)];
  const msg = tmpl.replace(/\{name\}/g, kid.name).replace(/\{calls\}/g, kid.calls);
  Modal.show({ icon: '⭐', msg: msg, yes: 'Keep Going!', speak: true });
}

function renderStarCount() {
  const el = $('star-count');
  el.querySelector('b').textContent = Store.data.total;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function renderLevelChip() {
  $('level-chip').textContent = CONFIG.levels[Store.data.level].name;
}

/* ---------------------------------------------------------------- home    */
function renderHome() {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  $('greeting').textContent = part + ', ' + CONFIG.playerName + '!';

  const last = Store.data.last;
  const btn = $('resume-btn');
  if (last && CONFIG.games[last]) {
    $('resume-name').textContent = CONFIG.games[last].title;
    btn.hidden = false;
    btn.dataset.go = last;
  } else {
    btn.hidden = true;
  }

  document.querySelectorAll('.seg-btn').forEach((b) => {
    b.classList.toggle('is-active', Number(b.dataset.level) === Store.data.level);
  });
  $('home-stars').querySelector('b').textContent = Store.data.total;
}

/* ---------------------------------------------------------------- stars   */
function renderStars() {
  const wrap = $('kid-cards');
  wrap.innerHTML = '';
  CONFIG.kids.forEach((k) => {
    const n = Store.data.stars[k.name] || 0;
    const row = document.createElement('div');
    row.className = 'kid';
    row.innerHTML =
      '<span style="font-size:44px">' + k.emoji + '</span>' +
      '<span><span class="kid-name"></span><br><span class="kid-sub"></span></span>' +
      '<span class="kid-stars">⭐ <span class="kid-n"></span></span>';
    row.querySelector('.kid-name').textContent = k.name;
    row.querySelector('.kid-sub').textContent = 'calls you ' + k.calls;
    row.querySelector('.kid-n').textContent = n;
    wrap.appendChild(row);
  });
  $('stars-note').textContent = Store.data.total > 0
    ? 'That is ' + Store.data.total + ' stars altogether. They are all very proud of you!'
    : 'Play a game to start earning stars for the grandkids!';
}

/* ---------------------------------------------------------------- wiring  */
document.addEventListener('DOMContentLoaded', () => {
  Store.load();
  renderHome();

  document.body.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (!go) return;
    const dest = go.dataset.go;
    if (dest === 'stars') { renderStars(); show('stars'); }
    else { Game.start(dest); }
  });

  $('level-seg').addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (!b) return;
    const n = Number(b.dataset.level);
    if (n === Store.data.level) return;
    Store.setLevel(n);
    renderHome();
    toast(CONFIG.levels[n].name + ' questions from now on');
  });

  $('btn-home').addEventListener('click', () => { renderHome(); show('home'); });
  $('btn-home2').addEventListener('click', () => { renderHome(); show('home'); });

  $('modal-yes').addEventListener('click', () => Modal.close(true));
  $('modal-no').addEventListener('click', () => Modal.close(false));

  $('btn-speak').addEventListener('click', () => Game.speakQuestion());
  $('btn-next').addEventListener('click', () => Game.next());

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
