/* NÛR — service worker : fonctionnement hors ligne (cache de l'application, du texte et de la police). */
const VERSION = "nur-v2.4.0";
const SHELL = [
  "./", "./index.html", "./styles.css", "./app.js", "./prayer.js", "./translit.js", "./contenus.js", "./manifest.webmanifest",
  "./quran.json", "./phonetique.json", "./parcours.json", "./quotidien.json", "./config.json", "./traduction-fr.json", "./KFGQPC-Warsh-Uthmanic.ttf", "./icon-192.png", "./logo.svg", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png", "./img/ill-calendrier.svg", "./img/ill-cartes.svg", "./img/ill-dhikr.svg", "./img/ill-enfant.svg", "./img/ill-femme.svg", "./img/ill-jeune.svg", "./img/ill-kaaba.svg", "./img/ill-lanterne.svg", "./img/ill-mediter.svg", "./img/ill-nouveau.svg", "./img/ill-parcours.svg", "./img/ill-quran.svg", "./img/ill-tafsir.svg", "./img/ill-tidjaniya.svg", "./img/ill-wudu.svg", "./img/ill-zakat.svg", "./img/logo-light.svg", "./img/pattern-gold.svg", "./img/pattern-light.svg", "./img/scene-day.svg", "./img/scene-fajr.svg", "./img/scene-isha.svg", "./img/scene-maghrib.svg"
];
/* Mise à jour légère : les fichiers lourds qui ne changent pas (texte du Coran, police, icônes) sont repris du cache précédent
   au lieu d'être retéléchargés ; les fichiers de langue déjà utilisés sur l'appareil sont rafraîchis. */
const KEEP = /\/(quran\.json|KFGQPC-Warsh-Uthmanic\.ttf|icon-[^/]*\.png|apple-touch-icon\.png|img\/[^/]+\.svg)$/;
const LANGF = /\/(i18n-(en|zh|ar)\.json|traduction-(en|zh)\.json|tafsir-ar\.json|hafs\.json)$/;
self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION), old = (await caches.keys()).filter((k) => k !== VERSION && k !== "nur-audio");
    const extra = [];
    for (const k of old) for (const r of await (await caches.open(k)).keys()) if (LANGF.test(new URL(r.url).pathname)) extra.push(r.url);
    await Promise.all(SHELL.map(async (u) => {
      const abs = new URL(u, self.registration.scope).href;
      if (KEEP.test(new URL(abs).pathname)) { const hit = await caches.match(abs); if (hit) return c.put(abs, hit); }
      return c.add(u);
    }));
    await Promise.all([...new Set(extra)].map((u) => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== "nur-audio").map((k) => caches.delete(k))))
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
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./#/priere";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) if ("focus" in c) { c.navigate && c.navigate(url).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
