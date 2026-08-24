/* Screens, saved progress, stars, speech, and the little flourishes.
   Nothing here is game-specific — see games.js for that. */

const $ = (id) => document.getElementById(id);

/* ---------------------------------------------------------------- storage */
const Store = {
  KEY: 'grandma-games-v1',
  data: null,

  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(Store.KEY)); } catch (e) { d = null; }
    Store.data = Object.assign({ stars: {}, total: 0, last: null, progress: {} }, d || {});
    CONFIG.kids.forEach((k) => {
      if (typeof Store.data.stars[k.name] !== 'number') Store.data.stars[k.name] = 0;
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

  /* A shuffled running order per game, so nothing repeats until every
     question has been seen once. */
  order(game, count) {
    const p = Store.data.progress[game];
    if (p && p.order && p.order.length === count && p.pos < count) return p;
    const order = [];
    for (let i = 0; i < count; i++) order.push(i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    Store.data.progress[game] = { order: order, pos: 0 };
    Store.save();
    return Store.data.progress[game];
  },

  advance(game, count) {
    const p = Store.data.progress[game];
    p.pos += 1;
    if (p.pos >= count) {
      Store.data.progress[game] = null;   /* seen them all — reshuffle */
      Store.order(game, count);
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

let celebrateResume = null;
function celebrate(kid, onClose) {
  const tmpl = CONFIG.celebrations[Math.floor(Math.random() * CONFIG.celebrations.length)];
  const msg = tmpl.replace(/\{name\}/g, kid.name).replace(/\{calls\}/g, kid.calls);
  $('celebrate-msg').textContent = msg;
  $('celebrate').hidden = false;
  celebrateResume = onClose || null;
  Speech.say(msg);
}

function renderStarCount() {
  const el = $('star-count');
  el.querySelector('b').textContent = Store.data.total;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
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

  $('stars-teaser').textContent = Store.data.total > 0
    ? 'You have earned ' + Store.data.total + (Store.data.total === 1 ? ' star' : ' stars')
    : 'See what you can earn';
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

  $('btn-home').addEventListener('click', () => { renderHome(); show('home'); });
  $('btn-home2').addEventListener('click', () => { renderHome(); show('home'); });

  $('btn-celebrate-ok').addEventListener('click', () => {
    $('celebrate').hidden = true;
    const fn = celebrateResume; celebrateResume = null;
    if (fn) fn();
  });

  $('btn-speak').addEventListener('click', () => Game.speakQuestion());
  $('btn-next').addEventListener('click', () => Game.next());

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
