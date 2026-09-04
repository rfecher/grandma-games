/* Caches everything on the first visit so the games keep working with no
   internet. Bump CACHE when you change any file. */

const CACHE = 'grandma-games-v2';

const FILES = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/config.js',
  'js/app.js',
  'js/games.js',
  'data/trivia.json',
  'data/lines.json',
  'data/remember.json',
  'data/decades.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      /* Add one at a time so a single missing file can't fail the whole install. */
      .then((c) => Promise.all(FILES.map((f) => c.add(f).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Network first, but only briefly: if the tablet's wifi is slow or gone, fall
   back to the cached copy after NET_TIMEOUT so the games always open fast.
   Going to the network first means a new version pushed to GitHub Pages shows
   up immediately, instead of a launch later. */
const NET_TIMEOUT = 2500;

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith((async () => {
    const cached = caches.match(e.request);

    /* Revalidate with the server rather than trusting the browser's HTTP
       cache, so a freshly pushed question bank shows up on the next launch. */
    const fromNetwork = fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    });

    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NET_TIMEOUT));

    let res = null;
    try {
      res = await Promise.race([fromNetwork, timeout]);
    } catch (err) {
      res = null;
    }
    if (res && res.ok) return res;

    return (await cached)
        || (await fromNetwork.catch(() => null))
        || (await caches.match('index.html'))
        || Response.error();
  })());
});
