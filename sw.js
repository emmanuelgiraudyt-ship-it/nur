/* NÛR — service worker : fonctionnement hors ligne (cache de l'application, du texte et de la police). */
const VERSION = "nur-v1.2.2";
const SHELL = [
  "./", "./index.html", "./styles.css", "./app.js", "./prayer.js", "./translit.js", "./manifest.webmanifest",
  "./quran.json", "./phonetique.json", "./parcours.json", "./quotidien.json", "./config.json", "./KFGQPC-Warsh-Uthmanic.ttf", "./LICENCE-KFGQPC.txt",
  "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
/* Fichiers lourds et stables (texte du Coran, police, icônes) : lus d'abord dans le cache.
   Application et contenus : réseau d'abord, pour que chaque mise à jour publiée s'affiche aussitôt ; cache si hors ligne. */
const STABLE = /\/(quran\.json|KFGQPC-Warsh-Uthmanic\.ttf|icon-[^/]*\.png|apple-touch-icon\.png)$/;
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const put = (res) => { if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; };
  const fallback = () => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error()));
  if (STABLE.test(url.pathname)) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then(put)));
    return;
  }
  e.respondWith(fetch(req, { cache: "no-cache" }).then(put).catch(fallback));
});
self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });
