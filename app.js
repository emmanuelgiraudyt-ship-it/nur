/* NÛR — application installable (PWA). Aucun traceur, aucune publicité, aucune donnée envoyée à un serveur.
 * Toutes les données de l'utilisateur restent sur son appareil (stockage local). */
(function () {
  "use strict";
  var P = window.NurPrayer;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var VERSION = "1.5.1";
  var KEY = "nur:v1", KEY2 = "nur:v2";

  /* ------------------------------------------------------------ état persistant */
  function DEF() {
    return {
      settings: { method: "MWL", theme: "auto", fs: 1, hijriOffset: 0, loc: null, offsets: {}, dhuhrMin: 0, customFajr: 18, customIsha: 17, pin: null, notif: false, layers: { phon: true, fr: true }, speed: 1, prayerTrack: false, dose: 5, lecture: "debutant" },
      last: null, bookmarks: [], hifz: {}, journal: [], gratitudes: [], intentions: [], stars: 0,
      tidj: { items: [], log: {} },
      days: {}, pts: { pratique: 0, prieres: 0 }, khatm: { read: {}, since: null },
      parcours: { lecons: {}, quiz: {}, opened: null, declared: {}, base: 0 }, temps: 0
    };
  }
  function merge(d, r) {
    for (var k in r) {
      if (r[k] && typeof r[k] === "object" && !Array.isArray(r[k]) && d[k] && typeof d[k] === "object" && !Array.isArray(d[k])) merge(d[k], r[k]);
      else d[k] = r[k];
    }
    return d;
  }
  /* ------------------------------------------------------------ profils (cinq au plus par appareil) */
  /* Chaque profil a ses propres données. Le code parental est commun à l'appareil. */
  var MAXP = 5;
  function loadStore() {
    var st = null, old = null;
    try { st = JSON.parse(localStorage.getItem(KEY2)); } catch (e) { st = null; }
    if (st && st.profiles && st.data) return st;
    try { old = JSON.parse(localStorage.getItem(KEY)); } catch (e2) { old = null; }
    if (old) {
      var d = merge(DEF(), old), pin = d.settings.pin || null; d.settings.pin = null;
      return { v: 2, active: "p1", profiles: [{ id: "p1", nom: "", type: "adulte", age: null, cree: Date.now() }], data: { p1: d }, pin: pin, onboarded: true };
    }
    return { v: 2, active: null, profiles: [], data: {}, pin: null, onboarded: false };
  }
  var STORE = loadStore();
  function curData() { return STORE.active && STORE.data[STORE.active] ? merge(DEF(), STORE.data[STORE.active]) : DEF(); }
  var S = curData();
  function save() {
    try { if (STORE.active) STORE.data[STORE.active] = S; localStorage.setItem(KEY2, JSON.stringify(STORE)); }
    catch (e) { toast("Enregistrement local impossible (stockage plein ou désactivé)."); }
  }
  function toast(msg) { var t = $("#toast"); t.textContent = typeof tr === "function" ? tr(msg) : msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 2600); }
  var TYPES = { homme: "Homme", femme: "Femme", garcon: "Enfant (garçon)", fille: "Enfant (fille)", adulte: "Adulte" };
  function prof() { for (var i = 0; i < STORE.profiles.length; i++) if (STORE.profiles[i].id === STORE.active) return STORE.profiles[i]; return null; }
  function isChild(p) { p = p || prof(); return !!p && (p.type === "garcon" || p.type === "fille"); }
  function addProfile(o) {
    var id = "p" + Date.now().toString(36), d = DEF(), cur = STORE.active ? S.settings : null;
    if (cur) { d.settings.loc = cur.loc; d.settings.method = cur.method; d.settings.offsets = cur.offsets; d.settings.hijriOffset = cur.hijriOffset; d.settings.theme = cur.theme; d.settings.customFajr = cur.customFajr; d.settings.customIsha = cur.customIsha; }
    STORE.profiles.push({ id: id, nom: o.nom || "", type: o.type || "adulte", age: o.age || null, cree: Date.now() });
    STORE.data[id] = d;
    return id;
  }
  function switchProfile(id) {
    if (STORE.active) STORE.data[STORE.active] = S;
    STORE.active = id; S = curData(); parentOK = 0; OPT = null; save(); applyTheme(); if (typeof applyLang === "function") applyLang(); scheduleNotifs();
  }
  /* Code parental : demandé pour sortir d'un profil enfant, ouvrir ses réglages ou déclarer son palier. */
  var parentOK = 0;
  function askPin(msg) {
    if (!STORE.pin) return Promise.resolve(true);
    var c = prompt(msg || "Code parental");
    if (c == null) return Promise.resolve(false);
    return pinHash(c).then(function (h) { if (h === STORE.pin) return true; toast("Code incorrect."); return false; });
  }
  function guardParent(fn) {
    if (!(isChild() && STORE.pin && Date.now() > parentOK)) return fn();
    return askPin("Code parental (page réservée à l'adulte)").then(function (ok) {
      if (ok) { parentOK = Date.now() + 5 * 60000; return fn(); }
      return { title: "Réservé à l'adulte", html: '<div class="callout">Cette page est réservée à l\'adulte responsable du profil.</div><p><a class="btn" href="#/">Retour à l\'accueil</a></p>', back: "#/" };
    });
  }

  /* ------------------------------------------------------------ points, objectifs du jour, khatm */
  /* Barème validé : leçon 10, quiz 30, pratique quotidienne plafonnée à 15, prière déclarée 2 (10 par jour). */
  var PTS = { lecture: 5, verset: 3, dhikr: 4, hadith: 3 }, CAP = 15, PRI = 2;
  var OBJ = [["lecture", "Lecture du jour"], ["verset", "Verset du jour"], ["dhikr", "Dhikr du jour"], ["hadith", "Hadith du jour"]];
  function today() { return dayKey(ymd(Date.now(), loc().tz)); }
  function dayIndex() { var t = ymd(Date.now(), loc().tz); return Math.floor(Date.UTC(t.y, t.m - 1, t.d) / 864e5); }
  function dayRec(k) { k = k || today(); if (!S.days[k]) S.days[k] = { f: {}, pr: {}, p: 0 }; return S.days[k]; }
  function pruneDays() { var ks = Object.keys(S.days).sort(); while (ks.length > 60) delete S.days[ks.shift()]; }
  function award(kind) {
    var d = dayRec(); if (d.f[kind]) return 0;
    var add = Math.max(0, Math.min(PTS[kind] || 0, CAP - d.p));
    d.f[kind] = 1; d.p += add; S.pts.pratique = (S.pts.pratique || 0) + add; pruneDays(); save();
    return add;
  }
  function togglePrayer(k) {
    var d = dayRec();
    if (d.pr[k]) { delete d.pr[k]; S.pts.prieres = Math.max(0, (S.pts.prieres || 0) - PRI); }
    else { d.pr[k] = 1; S.pts.prieres = (S.pts.prieres || 0) + PRI; }
    save();
  }
  function firstTodo(d) { for (var i = 0; i < OBJ.length; i++) if (!d.f[OBJ[i][0]]) return i + 1; return 5; }
  function weekHTML() {
    var L = loc(), t0 = ymd(Date.now(), L.tz), out = '<div class="week" aria-label="Régularité des sept derniers jours">';
    for (var i = 6; i >= 0; i--) {
      var o = addDays(t0, -i), k = dayKey(o), on = S.days[k] && S.days[k].p > 0;
      var lab = new Intl.DateTimeFormat(UIL(), { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(o.y, o.m - 1, o.d))).replace(".", "");
      out += '<span class="' + (on ? "on" : "") + (i === 0 ? " today" : "") + '" title="' + k + (on ? " : pratique faite" : "") + '">' + esc(lab) + '</span>';
    }
    return out + '</div>';
  }
  function kRead(sn) { return S.khatm.read[sn] || []; }
  function kMark(sn, a, on) {
    var m = S.khatm.read[sn] || [], i = m.indexOf(a);
    if (on === undefined) on = i < 0;
    if (on && i < 0) m.push(a);
    if (!on && i >= 0) m.splice(i, 1);
    S.khatm.read[sn] = m; if (!S.khatm.since) S.khatm.since = today();
    if (on && i < 0) { var d = dayRec(); d.lu = (d.lu || 0) + 1; }
  }
  /* Les versets marqués comme lus dans « Réciter » valident la lecture du jour une fois la dose atteinte. */
  function creditReading() {
    var d = dayRec(), dose = S.settings.dose || 5;
    if (d.f.lecture || (d.lu || 0) < dose) return;
    var p = award("lecture"); toast(p ? "Lecture du jour validée : +" + p + " points" : "Lecture du jour validée.");
  }
  function readingLine() {
    var d = dayRec(), dose = S.settings.dose || 5, n = Math.min(d.lu || 0, dose);
    return '<p class="ptsline"><strong>Lecture du jour</strong> : ' + (d.f.lecture ? 'validée aujourd\'hui (+' + PTS.lecture + ' points).' : n + ' / ' + dose + ' versets marqués « lu » aujourd\'hui ; à ' + dose + ', +' + PTS.lecture + ' points.') + '</p>';
  }
  function kStats(q) {
    var v = 0, su = 0, tot = 0;
    q.suras.forEach(function (s) { var n = kRead(s.n).length; tot += s.v.length; v += Math.min(n, s.v.length); if (n >= s.v.length) su++; });
    return { v: v, s: su, tot: tot, pct: tot ? Math.floor(1000 * v / tot) / 10 : 0 };
  }
  /* Ordre de la lecture du jour : « débutant » commence par Al-Fâtiha et les sourates courtes. */
  function kOrder(q) {
    var o = [], n;
    if ((S.settings.lecture || "debutant") === "debutant") { o.push(1); for (n = 114; n >= 99; n--) o.push(n); for (n = 2; n <= 98; n++) o.push(n); }
    else for (n = 1; n <= 114; n++) o.push(n);
    return o;
  }
  function kNext(q, n) {
    var order = kOrder(q), out = [];
    for (var i = 0; i < order.length; i++) {
      var s = q.byN[order[i]], rd = kRead(s.n);
      if (rd.length >= s.v.length) continue;
      for (var j = 0; j < s.v.length && out.length < n; j++) if (rd.indexOf(s.v[j][0]) < 0) out.push({ s: s, a: s.v[j][0], t: s.v[j][1], i: j });
      if (out.length) break;
    }
    return out;
  }
  function dailyVerse(q) {
    var pool = versePool(q), idx = dayIndex() % pool.length;
    return { sn: pool[idx][0], a: pool[idx][1] };
  }
  function phonOf(opt, sn, a, q) {
    var s = q.byN[sn], ph = opt && opt.phon && opt.phon.suras && opt.phon.suras[sn], i;
    if (!s) return null;
    for (i = 0; i < s.v.length; i++) if (s.v[i][0] === a) {
      if (ph && ph[i] && ph[i][0]) return ph[i][0];
      return window.NUR_PHON ? window.NUR_PHON(s.v[i][1], sn, a) : null;
    }
    return null;
  }
  function basmalaHTML(q, sn) {
    if (sn === 9) return "";
    var p = phonOn() && window.NUR_PHON ? window.NUR_PHON(q.basmala, 0, 0) : "";
    return '<div class="basmala">' + esc(q.basmala) + '</div>' + (p ? '<div class="ph basmalaPh" lang="ar-Latn">' + esc(p) + '</div>' : '');
  }
  function phonOn() { return !S.settings.layers || S.settings.layers.phon !== false; }
  function phonLine(sn, a, q) { var o = ""; if (phonOn()) { var p = phonOf(OPT, sn, a, q); if (p) o = '<div class="ph" lang="ar-Latn">' + esc(p) + '</div>'; } return o + (typeof frLine === "function" ? frLine(sn, a, q) : ""); }
  function arSeulHTML() { return '<div class="laychk"><label class="chk"><input type="checkbox" class="lyp"' + (phonOn() ? " checked" : "") + '> Phonétique</label><label class="chk"><input type="checkbox" class="lyf"' + (frOn() ? " checked" : "") + '> Français</label></div>'; }
  function bindArSeul(r) {
    $$(".lyp", r).forEach(function (c) { c.onchange = function () { S.settings.layers = S.settings.layers || {}; S.settings.layers.phon = c.checked; save(); render(); }; });
    $$(".lyf", r).forEach(function (c) { c.onchange = function () { S.settings.layers = S.settings.layers || {}; S.settings.layers.fr = c.checked; save(); render(); }; });
  }
  var NOTE_PHON = 'Phonétique : aide à la lecture produite automatiquement à partir du texte Warsh, avec la forme de pause en fin de verset. Elle ne remplace pas l\'écoute d\'un enseignant.';

  /* ------------------------------------------------------------ parcours : paliers, étapes, leçons, quiz */
  function bareme(opt) { return (opt.parcours && opt.parcours.bareme) || { lecon: 10, quiz: 30, quiz_seuil: 80 }; }
  function paliers(opt) { return (opt.parcours && opt.parcours.paliers) || []; }
  function palById(opt, id) { var P = paliers(opt); for (var i = 0; i < P.length; i++) if (P[i].id === id) return P[i]; return null; }
  function curPalier(opt) { var P = paliers(opt); for (var i = 0; i < P.length; i++) if (!S.parcours.declared[P[i].id]) return P[i]; return P[P.length - 1] || null; }
  function etapeState(pid, et) {
    var done = 0; et.lecons.forEach(function (x, i) { if (S.parcours.lecons[pid + "." + et.n + "." + (i + 1)]) done++; });
    var qz = S.parcours.quiz[pid + "." + et.n];
    return { lec: done, tot: et.lecons.length, quiz: !!(qz && qz.ok), best: qz ? qz.best : null, complete: done === et.lecons.length && !!(qz && qz.ok) };
  }
  function etapeOpen(pal, n) {
    if (n <= 1) return true;
    for (var i = 0; i < pal.etapes.length; i++) if (pal.etapes[i].n === n - 1) return etapeState(pal.id, pal.etapes[i]).complete;
    return false;
  }
  function lessonPts(opt) {
    var B = bareme(opt), qz = 0;
    Object.keys(S.parcours.quiz).forEach(function (k) { if (S.parcours.quiz[k].ok) qz++; });
    return Object.keys(S.parcours.lecons).length * B.lecon + qz * B.quiz;
  }
  function totalPts(opt) { return (S.pts.pratique || 0) + (S.pts.prieres || 0) + lessonPts(opt); }
  function palierPts(opt) { return Math.max(0, totalPts(opt) - (S.parcours.base || 0)); }
  function parcoursNow(opt) {
    var pal = curPalier(opt); if (!pal) return null;
    var done = 0, cur = null;
    (pal.etapes || []).forEach(function (et) { if (etapeState(pal.id, et).complete) done++; else if (!cur) cur = et; });
    return { pal: pal, done: done, tot: (pal.etapes || []).length, cur: cur, pts: palierPts(opt) };
  }
  function durTxt(sec) { var m = Math.round((sec || 0) / 60); return Math.floor(m / 60) + " h " + String(m % 60).padStart(2, "0"); }
  function motsHTML(mots) {
    if (!mots || !mots.length) return "";
    return '<h3>Les mots à connaître</h3><table class="mots"><tbody>' + mots.map(function (w) {
      return '<tr><td class="a" lang="ar">' + esc(w.ar) + '</td><td><strong>' + esc(w.ph) + '</strong><small>translittération : ' + esc(w.tr) + '</small></td><td>' + esc(w.fr) + '</td></tr>';
    }).join("") + '</tbody></table><p class="muted">Pour chaque mot : l\'arabe, la prononciation à la française, la translittération, puis le sens.</p>';
  }

  /* ------------------------------------------------------------ données du Coran */
  var Q = null, OPT = null;
  function loadOpt() {
    if (OPT) return Promise.resolve(OPT);
    function get(f) { return fetch(f).then(function (r) { return r && r.ok ? r.json() : null; }).catch(function () { return null; }); }
    return Promise.all([get("phonetique.json"), get(TRF()), get("audio.json"), get("parcours.json"), get("quotidien.json"), get("config.json")]).then(function (a) {
      OPT = { phon: a[0], fr: a[1], audio: a[2], parcours: a[3], quot: a[4], conf: a[5] || {} }; return OPT;
    });
  }
  /* Nom de sourate écrit avec les conventions de la phonétique (â, î, oû, ou, ch, dj, ʿ). */
  function nomFr(s) {
    if (s.n === 22) return "Al-Ḥadj";
    var n = String(s.en).replace(/[‘`]/g, "ʿ").replace(/’/g, "'").replace(/au/g, "aw").replace(/ai/g, "ay")
      .replace(/ā/g, "â").replace(/Ā/g, "Â").replace(/ī/g, "î").replace(/Ī/g, "Î").replace(/ū/g, "oû").replace(/Ū/g, "Oû")
      .replace(/([^oO])u/g, "$1ou").replace(/^u/, "ou").replace(/\bU/g, "Ou").replace(/sh/g, "ch").replace(/Sh/g, "Ch").replace(/j/g, "dj").replace(/J/g, "Dj")
      .replace(/ah$/, "a");
    return n;
  }
  function loadQ() {
    if (Q) return Promise.resolve(Q);
    return fetch("quran.json").then(function (r) { if (!r.ok) throw new Error("data"); return r.json(); }).then(function (j) {
      j.byN = {}; j.suras.forEach(function (s) { j.byN[s.n] = s; s.fr = nomFr(s); }); Q = j; return Q;
    });
  }

  /* ------------------------------------------------------------ dates, lieu, prières */
  var CITIES = [
    ["Paris", 48.8566, 2.3522, "Europe/Paris"], ["Marseille", 43.2965, 5.3698, "Europe/Paris"], ["Lyon", 45.764, 4.8357, "Europe/Paris"],
    ["Nantes", 47.2184, -1.5536, "Europe/Paris"], ["Lille", 50.6292, 3.0573, "Europe/Paris"], ["Bordeaux", 44.8378, -0.5792, "Europe/Paris"],
    ["Toulouse", 43.6047, 1.4442, "Europe/Paris"], ["Strasbourg", 48.5734, 7.7521, "Europe/Paris"], ["Bruxelles", 50.8503, 4.3517, "Europe/Brussels"],
    ["Dakar", 14.7167, -17.4677, "Africa/Dakar"], ["Abidjan", 5.36, -4.0083, "Africa/Abidjan"], ["Bamako", 12.6392, -8.0029, "Africa/Bamako"],
    ["Conakry", 9.6412, -13.5784, "Africa/Conakry"], ["Nouakchott", 18.0735, -15.9582, "Africa/Nouakchott"], ["Niamey", 13.5117, 2.1251, "Africa/Niamey"],
    ["Ouagadougou", 12.3714, -1.5197, "Africa/Ouagadougou"], ["Lomé", 6.1725, 1.2314, "Africa/Lome"], ["Cotonou", 6.3703, 2.3912, "Africa/Porto-Novo"],
    ["Libreville", 0.4162, 9.4673, "Africa/Libreville"], ["Douala", 4.0511, 9.7679, "Africa/Douala"], ["Casablanca", 33.5731, -7.5898, "Africa/Casablanca"],
    ["Rabat", 34.0209, -6.8416, "Africa/Casablanca"], ["Alger", 36.7538, 3.0588, "Africa/Algiers"], ["Tunis", 36.8065, 10.1815, "Africa/Tunis"],
    ["Mamoudzou (Mayotte)", -12.7809, 45.2279, "Indian/Mayotte"], ["Moroni (Comores)", -11.7022, 43.2551, "Indian/Comoro"],
    ["Saint-Denis (La Réunion)", -20.8789, 55.4481, "Indian/Reunion"], ["Antananarivo", -18.8792, 47.5079, "Indian/Antananarivo"], ["Montréal", 45.5017, -73.5673, "America/Toronto"]
  ];
  function loc() { return S.settings.loc || { name: "Paris (lieu par défaut)", lat: 48.8566, lng: 2.3522, tz: "Europe/Paris", def: true }; }
  function ymd(ts, tz) {
    var p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(ts));
    var g = function (t) { return +p.filter(function (x) { return x.type === t; })[0].value; };
    return { y: g("year"), m: g("month"), d: g("day") };
  }
  function addDays(o, n) { var t = new Date(Date.UTC(o.y, o.m - 1, o.d + n)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
  function dayKey(o) { return o.y + "-" + String(o.m).padStart(2, "0") + "-" + String(o.d).padStart(2, "0"); }
  function fmtT(ts, tz) { if (!(ts === ts)) return "—"; return new Intl.DateTimeFormat(UIL(), { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(ts)); }
  function timesFor(L, o) { return P.compute(o.y, o.m, o.d, L.lat, L.lng, S.settings); }
  var ORDER = [["fajr", "Fajr"], ["dhuhr", "Dhuhr"], ["asr", "ʿAsr"], ["maghrib", "Maghrib"], ["isha", "ʿIshâʾ"]];
  function nextPrayer(now) {
    now = now || Date.now();
    var L = loc(), t0 = ymd(now, L.tz);
    for (var off = 0; off < 2; off++) {
      var T = timesFor(L, addDays(t0, off));
      for (var i = 0; i < ORDER.length; i++) if (T[ORDER[i][0]] > now) return { k: ORDER[i][0], name: ORDER[i][1], ts: T[ORDER[i][0]], tz: L.tz };
    }
    return null;
  }
  function countdown(ts) { var m = Math.max(0, Math.round((ts - Date.now()) / 60000)); return Math.floor(m / 60) + " h " + String(m % 60).padStart(2, "0"); }
  function hijriStr() {
    var L = loc(), now = Date.now(), shift = S.settings.hijriOffset || 0;
    try {
      var T = timesFor(L, ymd(now, L.tz));
      if (T.maghrib === T.maghrib && now >= T.maghrib) shift += 1; // le jour hégirien commence au coucher du soleil
      return new Intl.DateTimeFormat(UIL() + "-u-ca-islamic-umalqura", { timeZone: L.tz, day: "numeric", month: "long", year: "numeric" }).format(new Date(now + shift * 864e5));
    } catch (e) { return ""; }
  }
  function gregStr() { return new Intl.DateTimeFormat(UIL(), { timeZone: loc().tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()); }

  /* ------------------------------------------------------------ outils d'interface */
  var cleanups = [];
  function onLeave(fn) { cleanups.push(fn); }
  function surahLabel(s) { return s.n + ". " + s.fr; }
  function pinHash(pin) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode("nur:" + pin)).then(function (b) {
        return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, "0"); }).join("");
      });
    }
    return Promise.resolve("b64:" + btoa("nur:" + pin));
  }
  function download(name, text, type) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: type || "application/json" }));
    a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function share(title, text) {
    var url = location.href.split("#")[0];
    if (navigator.share) return navigator.share({ title: title, text: text, url: url }).catch(function () {});
    var all = text + " " + url;
    if (navigator.clipboard) return navigator.clipboard.writeText(all).then(function () { toast("Texte copié."); }, function () { toast("Copie impossible."); });
    toast("Partage non disponible sur cet appareil.");
  }
  var NOTE_VALIDATION = '<p class="muted">Contenu validé par l\'imam garant.</p>';

  /* ------------------------------------------------------------ vues */
  var routes = [];
  function route(re, fn) { routes.push([re, fn]); }

  /* ================================================================
     Structure reprise de MAARIFA (version Android 1.55.02, captures du commanditaire du 16 novembre 2026).
     Reprise fonctionnelle uniquement : textes, visuels et code sont propres à NÛR.
     Écartés : chat de questions et abonnement (décisions du commanditaire). Points à la place du Premium.
     ================================================================ */
  var NOMS_FR = ["Prologue", "La Vache", "La Famille d'Imrân", "Les Femmes", "La Table servie", "Les Bestiaux", "Les Murailles", "Le Butin", "Le Repentir", "Jonas",
    "Houd", "Joseph", "Le Tonnerre", "Abraham", "Al-Hijr", "Les Abeilles", "Le Voyage nocturne", "La Caverne", "Marie", "Ṭâ-Hâ",
    "Les Prophètes", "Le Pèlerinage", "Les Croyants", "La Lumière", "Le Discernement", "Les Poètes", "Les Fourmis", "Le Récit", "L'Araignée", "Les Romains",
    "Louqmân", "La Prosternation", "Les Coalisés", "Saba", "Le Créateur", "Yâ-Sîn", "Les Rangés", "Ṣâd", "Les Groupes", "Le Pardonneur",
    "Les Versets détaillés", "La Consultation", "L'Ornement", "La Fumée", "L'Agenouillée", "Al-Aḥqâf", "Mouḥammad", "La Victoire éclatante", "Les Appartements", "Qâf",
    "Qui éparpillent", "Le Mont", "L'Étoile", "La Lune", "Le Tout Miséricordieux", "L'Événement", "Le Fer", "La Discussion", "L'Exode", "L'Éprouvée",
    "Le Rang", "Le Vendredi", "Les Hypocrites", "La Grande Perte", "Le Divorce", "L'Interdiction", "La Royauté", "La Plume", "Celle qui montre la vérité", "Les Voies d'ascension",
    "Noé", "Les Djinns", "L'Enveloppé", "Le Revêtu d'un manteau", "La Résurrection", "L'Homme", "Les Envoyés", "La Nouvelle", "Les Anges qui arrachent les âmes", "Il s'est renfrogné",
    "L'Obscurcissement", "La Rupture", "Les Fraudeurs", "La Déchirure", "Les Constellations", "L'Astre nocturne", "Le Très-Haut", "L'Enveloppante", "L'Aube", "La Cité",
    "Le Soleil", "La Nuit", "Le Jour montant", "Le Réconfort", "Le Figuier", "L'Adhérence", "La Destinée", "La Preuve", "La Secousse", "Les Coursiers",
    "Le Fracas", "La Course aux richesses", "Le Temps", "Les Calomniateurs", "L'Éléphant", "Qouraych", "L'Ustensile", "L'Abondance", "Les Infidèles", "Le Secours",
    "Les Fibres", "Le Monothéisme pur", "L'Aube naissante", "Les Hommes"];
  function nomSens(n) { return NOMS_FR[n - 1] || ""; }
  function setDef(o, k, v) { if (o[k] === undefined || o[k] === null) o[k] = v; }
  function stt() {
    var s = S.settings;
    setDef(s, "routine", { hadith: true, dhikr: true, lecture: true });
    setDef(s, "alerts", { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true });
    setDef(s, "rappels", { prieres: false, routine: false, verset: false });
    setDef(s, "layers", { phon: true, fr: true });
    return s;
  }
  function appId() {
    if (!STORE.appId) {
      var u = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); });
      STORE.appId = u; save();
    }
    return STORE.appId;
  }
  var ICO = {
    bell: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0"/></svg>',
    belloff: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2h-15M10 20a2 2 0 0 0 4 0M4 4l16 16"/></svg>',
    gear: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="10" cy="17" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    bm: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M7 4h10v16l-5-4-5 4z"/></svg>',
    bmon: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M7 4h10v16l-5-4-5 4z"/></svg>',
    share: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M14 5l6 6-6 6M20 11H10a6 6 0 0 0-6 6v1"/></svg>',
    note: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M4 5h16v11H9l-5 4z"/></svg>',
    more: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="6" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18" cy="12" r="1.6" fill="currentColor"/></svg>',
    list: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="6" y="4" width="12" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 9h6M9 13h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    book: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M12 6c-2-1.5-5-2-8-1.5V19c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5C17 4 14 4.5 12 6zM12 6v14.5"/></svg>',
    pin: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10z"/><circle cx="12" cy="11" r="2" fill="currentColor"/></svg>',
    arrow: '<span class="arr" aria-hidden="true">→</span>'
  };

  /* ---------------------------------------------------------------- feuille modale (paramètres, actions) */
  function openSheet(title, html, bind) {
    closeSheet();
    var w = document.createElement("div"); w.className = "mwrap"; w.id = "mwrap";
    w.innerHTML = '<div class="msheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="row between"><h3 style="margin:0">' + esc(title) + '</h3><button class="iconbtn" id="mclose" aria-label="Fermer">×</button></div>' + html + '</div>';
    document.body.appendChild(w);
    w.addEventListener("click", function (e) { if (e.target === w) closeSheet(); });
    $("#mclose", w).onclick = function () { closeSheet(); };
    if (bind) bind(w);
    i18n(w);
    onLeave(function () { closeSheet(true); });
    return w;
  }
  var sheetDirty = false;
  function closeSheet(silent) { var w = document.getElementById("mwrap"); if (w) w.remove(); if (sheetDirty && silent !== true) { sheetDirty = false; render(); } else if (silent === true) sheetDirty = false; }

  /* ---------------------------------------------------------------- routine du jour, dans l'ordre de MAARIFA */
  var STEPS = [["verset", "Réfléchis sur ton verset du jour", 2], ["dhikr", "Souviens-toi de Dieu avec le dhikr", 3], ["hadith", "Médite sur un hadith", 4], ["lecture", "Lis ta dose quotidienne de Coran", 1]];
  function activeSteps() { var r = stt().routine; return STEPS.filter(function (s) { return s[0] === "verset" || r[s[0]] !== false; }); }
  function firstPos(d) { var A = activeSteps(); for (var i = 0; i < A.length; i++) if (!d.f[A[i][0]]) return i + 1; return A.length + 1; }
  function posOf(k) { var A = activeSteps(); for (var i = 0; i < A.length; i++) if (A[i][0] === k) return i + 1; return 1; }

  function chips3(T, L) {
    return '<div class="chips3"><div><span>Imsak</span><b>' + fmtT(T.fajr, L.tz) + '</b></div><div><span>Chourouq</span><b>' + fmtT(T.sunrise, L.tz) + '</b></div><div><span>Iftar</span><b>' + fmtT(T.maghrib, L.tz) + '</b></div></div>';
  }
  function initiale() { var p = prof(); return p && p.nom ? p.nom.charAt(0).toUpperCase() : "N"; }

  /* ---------------------------------------------------------------- QUOTIDIEN (accueil) */
  route(/^\/?$/, function () {
    return loadOpt().then(function (opt) {
      var st = stt(), p = prof(), L = loc(), np = nextPrayer(), d = dayRec(), T = timesFor(L, ymd(Date.now(), L.tz));
      var html = '<div class="qhead"><a class="avatar" href="#/profil" aria-label="Mon profil">' + esc(initiale()) + '</a><div><div class="salutM">Assalâmou ʿalaykoum' + (p && p.nom ? ', ' + esc(p.nom) : '') + '</div>' +
        '<a class="muted lieu" href="#/priere/reglages">' + ICO.pin + ' ' + esc(L.name) + '</a></div></div>';
      html += '<div class="hero"><div class="row between"><div><div class="hl">La prochaine prière est</div><div class="hn">' + (np ? np.name : "—") + '</div></div>' +
        '<div class="hr"><div class="hl">dans ' + (np ? countdown(np.ts) : "—") + '</div><div class="ht">' + (np ? fmtT(np.ts, np.tz) : "") + '</div></div></div>' + chips3(T, L) + '</div>';
      if (!isChild() || st.prayerTrack) {
        var n5 = 0; ORDER.forEach(function (o) { if (d.pr[o[0]]) n5++; });
        html += '<div class="card"><a class="row between plain-link" href="#/priere"><div><strong>Horaires de prière</strong><div class="muted">Marque tes prières ' + n5 + ' / 5</div></div>' + ICO.arrow + '</a>' +
          '<div class="pchips">' + ORDER.map(function (o) {
            return '<button class="pchip' + (d.pr[o[0]] ? " on" : "") + '" data-pr="' + o[0] + '" aria-pressed="' + !!d.pr[o[0]] + '"><span>' + o[1] + '</span><i aria-hidden="true"></i></button>';
          }).join("") + '</div><p class="muted" style="margin:.4rem 0 0">' + PRI + ' points par prière marquée. Suivi privé, sur cet appareil.</p></div>';
      }
      html += '<div class="card"><strong>Explorer NÛR</strong><div class="muted">Rapproche-toi de Dieu, pas à pas</div><div class="tiles3">' +
        '<a class="t3" href="#/apprendre"><b>Cours / Quiz</b><span>Lancer ' + ICO.arrow + '</span></a>' +
        '<a class="t3" href="#/tafsir"><b>Tafsir</b><span>Lancer ' + ICO.arrow + '</span></a>' +
        '<a class="t3" href="#/khatm"><b>Khatm Coran</b><span>Lancer ' + ICO.arrow + '</span></a></div></div>';
      var A = activeSteps(), fp = firstPos(d), alldone = fp > A.length;
      html += '<div class="card objM"><div class="row between"><div><strong>Objectifs du jour</strong><div class="muted">Quelques minutes pour te rapprocher de Dieu</div></div><span class="pill">' + d.p + ' / ' + CAP + ' pts</span></div>' +
        '<ol class="stepsM">' + A.map(function (s, i) {
          return '<li class="' + (d.f[s[0]] ? "done" : "") + '"><a href="#/jour?e=' + (i + 1) + '"><span class="nb">' + (d.f[s[0]] ? "✓" : (i + 1)) + '</span><span>' + s[1] + '</span><span class="pt">+' + PTS[s[0]] + '</span></a></li>';
        }).join("") + '</ol>' +
        '<div class="row between"><a class="btn" href="#/jour?e=' + Math.min(fp, A.length + 1) + '">' + (alldone ? "Voir mon bilan" : (fp > 1 ? "Continuer" : "Commencer")) + '</a><a class="btn alt" href="#/routine">Personnaliser</a></div></div>';
      var wd = new Intl.DateTimeFormat("en-US", { timeZone: L.tz, weekday: "short" }).format(new Date());
      if (wd === "Fri" && opt.quot && opt.quot.vendredi) html += '<div class="callout">' + esc(opt.quot.vendredi) + '</div>';
      var nev = nextEvents(2);
      html += '<h3>Fil d\'actualités</h3>' + nev.map(function (x) { return '<a class="card plain-link" href="#/evenements"><strong>' + esc(x[1]) + '</strong><div class="muted">' + (x[2] === 0 ? "Aujourd'hui" : "Dans " + x[2] + " jours") + ' · ' + esc(x[3]) + '</div></a>'; }).join("") +
        '<a class="card plain-link" href="#/cartes"><strong>Cartes de vœux</strong><div class="muted">Envoie une carte à tes proches, par WhatsApp ou par lien.</div></a>';
      return { title: "NÛR", html: html, tab: "#/", bind: function (r) {
        $$("[data-pr]", r).forEach(function (b) { b.onclick = function () { togglePrayer(b.dataset.pr); render(); }; });
      } };
    });
  });

  /* ---------------------------------------------------------------- personnalisation de la routine */
  route(/^\/routine$/, function () {
    var st = stt(), R = st.routine;
    function row(k, t, sub) { return '<label class="tcard"><span><b>' + t + '</b><small>' + sub + '</small></span><input type="checkbox" class="sw" data-rt="' + k + '"' + (R[k] !== false ? " checked" : "") + '></label>'; }
    var html = '<h2>Personnalisation de la routine</h2>' +
      '<div class="tcard fixed"><span><b>Verset du jour</b><small>Toujours présent : c\'est le cœur de la routine.</small></span><span class="pill">actif</span></div>' +
      row("hadith", "Hadith du jour", "Un hadith des Quarante d\'an-Nawawî, avec sa source.") +
      row("dhikr", "Dhikr du jour", "Une formule à répéter, avec compteur.") +
      row("lecture", "Lecture du Coran (khatm)", "Quelques versets chaque jour, jusqu\'à la lecture complète.") +
      '<label class="f" for="dose">Versets par jour</label><select id="dose">' + [3, 5, 10, 20].map(function (n) { return '<option value="' + n + '"' + ((st.dose || 5) === n ? " selected" : "") + '>' + n + ' versets</option>'; }).join("") + '</select>' +
      '<div class="tcard soon"><span><b>Journal religieux</b><small>Disponible bientôt dans la routine. Le journal existe déjà dans « Méditer ».</small></span></div>' +
      '<div class="tcard soon"><span><b>Quiz</b><small>Disponible bientôt dans la routine. Les quiz existent déjà dans « Apprendre ».</small></span></div>' +
      '<label class="tcard"><span><b>Rappel de la routine</b><small>Une notification à 9 h, si l\'application est ouverte.</small></span><input type="checkbox" class="sw" id="rapr"' + (st.rappels.routine ? " checked" : "") + '></label>';
    return { title: "Routine", html: html, back: "#/", tab: "#/", bind: function (r) {
      $$("[data-rt]", r).forEach(function (c) { c.onchange = function () { st.routine[c.dataset.rt] = c.checked; save(); }; });
      $("#dose", r).onchange = function (e) { st.dose = +e.target.value; save(); toast("Enregistré."); };
      $("#rapr", r).onchange = function (e) { st.rappels.routine = e.target.checked; save(); if (e.target.checked) askNotif(); scheduleNotifs(); };
    } };
  });
  function askNotif() {
    if (!("Notification" in window)) { toast("Notifications indisponibles sur ce navigateur."); return; }
    if (Notification.permission === "default") Notification.requestPermission().then(function () { scheduleNotifs(); });
    else if (Notification.permission === "denied") toast("Notifications refusées dans le navigateur.");
  }

  /* ---------------------------------------------------------------- PRIÈRE */
  var FICHES = {
    fajr: { d: "La prière du Fajr s'accomplit entre l'apparition de l'aube véritable et le lever du soleil.", fard: "2 rakʿa", sun: [["2 rakʿa (Raghîbat al-fajr)", "Avant la prière"]] },
    dhuhr: { d: "La prière du Dhuhr s'accomplit après le passage du soleil au zénith, jusqu'à ce que l'ombre d'un objet égale sa hauteur.", fard: "4 rakʿa", sun: [["Nâfila : 2 rakʿa ou plus", "Avant et après la prière"]] },
    asr: { d: "La prière du ʿAsr commence quand l'ombre d'un objet égale sa hauteur ; elle s'accomplit avant le coucher du soleil, de préférence avant que sa lumière ne jaunisse.", fard: "4 rakʿa", sun: [["Nâfila : 2 rakʿa ou plus", "Avant la prière"]] },
    maghrib: { d: "La prière du Maghrib s'accomplit juste après le coucher du soleil.", fard: "3 rakʿa", sun: [["Nâfila : 2 rakʿa ou plus", "Après la prière"]] },
    isha: { d: "La prière du ʿIshâʾ s'accomplit après la disparition complète du crépuscule rougeâtre à l'ouest, au début de la nuit.", fard: "4 rakʿa", sun: [["2 rakʿa (Chafʿ)", "Après la prière"], ["1 rakʿa (Witr)", "Après le Chafʿ"]] }
  };
  var dayOffP = 0, prTab = null;
  function hijriOf(o) {
    try { return new Intl.DateTimeFormat(UIL() + "-u-ca-islamic-umalqura", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(Date.UTC(o.y, o.m - 1, o.d, 12) + (S.settings.hijriOffset || 0) * 864e5)); } catch (e) { return ""; }
  }
  route(/^\/priere$/, function () {
    var st = stt(), L = loc(), base = ymd(Date.now(), L.tz), t0 = addDays(base, dayOffP), T = timesFor(L, t0), Tt = timesFor(L, base), np = nextPrayer();
    var dl = new Intl.DateTimeFormat(UIL(), { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(Date.UTC(t0.y, t0.m - 1, t0.d, 12)));
    if (dayOffP === 0) dl = "Aujourd'hui, " + dl.replace(/^\S+\s/, "");
    var html = '<div class="row between phead"><h2 style="margin:0">Prière</h2><div class="row" style="margin:0"><a class="btn alt" href="#/qibla">Trouver la qibla</a><a class="iconbtn" href="#/priere/reglages" aria-label="Réglages des horaires">' + ICO.gear + '</a></div></div>';
    html += '<div class="hero center"><div class="hl">La prochaine prière est</div><div class="hn">' + (np ? np.name : "—") + '</div><div class="hbig">' + (np ? fmtT(np.ts, np.tz) : "") + '</div>' +
      '<div class="row" style="justify-content:center;margin:.5rem 0 0"><span class="hchip">dans ' + (np ? countdown(np.ts) : "—") + '</span><a class="hchip" href="#/priere/reglages">' + ICO.pin + ' ' + esc(L.name) + '</a></div></div>' + chips3(Tt, L);
    if (L.def) html += '<div class="callout warn">Lieu par défaut. Pour des horaires exacts, indiquez votre position ou votre ville.</div>';
    html += '<div class="datenav"><button class="iconbtn" id="dm" aria-label="Jour précédent">‹</button><div><strong>' + esc(dl) + '</strong><div class="muted">' + esc(hijriOf(t0)) + '</div></div><button class="iconbtn" id="dp" aria-label="Jour suivant">›</button></div>';
    html += '<div class="plist">' + ORDER.map(function (p) {
      var on = st.alerts[p[0]] !== false, nx = dayOffP === 0 && np && np.k === p[0] && np.ts === T[p[0]];
      return '<div class="prow' + (nx ? " next" : "") + '"><button class="bell' + (on ? " on" : "") + '" data-al="' + p[0] + '" aria-pressed="' + on + '" aria-label="Alerte pour ' + p[1] + '">' + (on ? ICO.bell : ICO.belloff) + '</button><span class="pn">' + p[1] + '</span><span class="t">' + fmtT(T[p[0]], L.tz) + '</span></div>';
    }).join("") + '</div>';
    html += '<a class="card linkcard" href="#/priere/reglages"><span>Les heures de prière te semblent incorrectes ?</span><b>Explications ' + ICO.arrow + '</b></a>';
    var k = prTab || (np ? np.k : "fajr"), F = FICHES[k], nm = ORDER.filter(function (o) { return o[0] === k; })[0][1];
    html += '<h3>En savoir plus sur les prières</h3><div class="seg" role="tablist">' + ORDER.map(function (o) { return '<button role="tab" data-tab="' + o[0] + '" aria-selected="' + (o[0] === k) + '">' + o[1] + '</button>'; }).join("") + '</div>' +
      '<div class="fiche"><p>' + esc(F.d) + '</p><h4>Fardh (obligatoire)</h4><div class="rk"><b>' + F.fard + '</b><span>Pendant la prière</span></div>' +
      '<h4>Sunna (recommandé)</h4>' + F.sun.map(function (x) { return '<div class="rk"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join("") + '<p class="muted" style="margin:.5rem 0 0">Selon le rite malikite.</p></div>' +
      '<div class="card reco"><strong>Recommandations à faire après la prière</strong><p>Une fois la prière du ' + nm + ' terminée, prends le temps de rester à ta place et de te souvenir de Dieu quelques instants.</p><a href="#/priere/apres">Suivre les recommandations ' + ICO.arrow + '</a></div>' +
      '<h3>Hadiths sur la prière du ' + nm + '</h3>' + hadithCard(HADP[k]) + hadithCard(HADP.tous);
    html += '<details class="card" id="md"><summary><strong>Les 30 prochains jours</strong></summary><div class="scroll" id="mt"></div></details>';
    return { title: "Prière", html: html, tab: "#/priere", bind: function (r) {
      $("#dm", r).onclick = function () { dayOffP--; render(); };
      $("#dp", r).onclick = function () { dayOffP++; render(); };
      $$("[data-al]", r).forEach(function (b) { b.onclick = function () { st.alerts[b.dataset.al] = !(st.alerts[b.dataset.al] !== false); save(); if (st.alerts[b.dataset.al]) { st.rappels.prieres = true; st.notif = true; save(); askNotif(); } scheduleNotifs(); render(); }; });
      $$("[data-tab]", r).forEach(function (b) { b.onclick = function () { prTab = b.dataset.tab; render(); }; });
      $("#md", r).addEventListener("toggle", function (e) {
        if (!e.target.open) return;
        var rows = "";
        for (var i = 0; i < 30; i++) {
          var dd = addDays(base, i), X = timesFor(L, dd);
          rows += '<tr' + (i === 0 ? ' class="today"' : "") + '><td>' + String(dd.d).padStart(2, "0") + '/' + String(dd.m).padStart(2, "0") + '</td>' + ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"].map(function (kk) { return '<td>' + fmtT(X[kk], L.tz) + '</td>'; }).join("") + '</tr>';
        }
        $("#mt", r).innerHTML = '<table class="month"><thead><tr><th>Jour</th><th>Fajr</th><th>Chrq</th><th>Dhr</th><th>ʿAsr</th><th>Mgb</th><th>ʿIchâʾ</th></tr></thead><tbody>' + rows + '</tbody></table>';
      });
    } };
  });
  route(/^\/prieres$/, function () { location.hash = "#/priere"; return { title: "Prière", html: "" }; });

  /* après la prière : invocations et Âyat al-Koursî */
  var aCount = {};
  route(/^\/priere\/apres$/, function () {
    return Promise.all([loadQ(), loadOpt()]).then(function (res) {
      var q = res[0], opt = res[1], D = (opt.quot && opt.quot.dhikr) || [];
      var INV = [[D[1], 33], [D[0], 33], [D[2], 33], [D[3], 3]].filter(function (x) { return x[0]; });
      var html = '<h2>Recommandations</h2><p>Après chaque prière, il est recommandé de faire quelques invocations et de lire Âyat al-Koursî.</p><h3>Invocations</h3>' +
        INV.map(function (x, i) {
          var c = aCount[i] || 0, pct = Math.min(100, Math.round(100 * c / x[1]));
          return '<div class="invrow"><div><b>' + esc(x[0].ph) + '</b> <span class="muted">' + x[1] + ' fois</span><div class="ar small" lang="ar" dir="rtl">' + esc(x[0].ar) + '</div><div class="muted">' + esc(x[0].fr) + '</div></div>' +
            '<button class="ring" data-inv="' + i + '" style="--p:' + pct + '" aria-label="Compter ' + esc(x[0].ph) + '"><span>' + (c ? c + '/' + x[1] : 'Toucher') + '</span></button></div>';
        }).join("") +
        '<p><button class="btn alt" id="raz">Remettre les compteurs à zéro</button></p>';
      var s2 = q.byN[2], ak = s2.v.filter(function (v) { return v[0] === 253 || v[0] === 254; });
      html += '<h3>Âyat al-Koursî</h3><div class="card">' + ak.map(function (v) { return '<div class="ar-line mushaf" lang="ar" dir="rtl">' + esc(v[1]) + '</div>' + phonLine(2, v[0], q); }).join("") +
        '<p class="muted">Sourate Al-Baqara, versets 253 et 254 dans la numérotation de Warsh (verset 255 dans la numérotation de Ḥafṣ).</p><p class="row"><button class="btn" id="akp">▶ Écouter</button><a class="btn alt" href="#/reciter/2?a=253">Ouvrir dans le Coran</a></p></div>';
      return { title: "Après la prière", html: html, back: "#/priere", tab: "#/priere", bind: function (r) {
        $$("[data-inv]", r).forEach(function (b) { b.onclick = function () { var i = +b.dataset.inv; aCount[i] = (aCount[i] || 0) + 1; if (navigator.vibrate) navigator.vibrate(10); render(); }; });
        $("#raz", r).onclick = function () { aCount = {}; render(); };
        $("#akp", r).onclick = function () { playVerse(2, 254); };
        onLeave(function () { if (location.hash !== "#/priere/apres") plStop(); });
      } };
    });
  });

  /* réglages des horaires (doute, calcul, localisation) */
  route(/^\/priere\/reglages$/, function () {
    var st = stt(), L = loc();
    var html = '<div class="card soft"><strong>Tu as un doute sur les horaires ?</strong><p>Les horaires varient souvent d\'une mosquée à l\'autre, même dans une ville : chaque mosquée retient sa méthode de calcul et ses ajustements. NÛR calcule les horaires sur votre appareil, selon la méthode choisie ci-dessous et le ʿAsr malikite.</p><a href="#/reglages">Ajuster les minutes prière par prière ' + ICO.arrow + '</a></div>' +
      '<h3>Calcul des horaires de prière</h3><label class="f" for="meth">Méthode de calcul</label><select id="meth">' + Object.keys(P.METHODS).map(function (k) { return '<option value="' + k + '"' + (st.method === k ? " selected" : "") + '>' + esc(P.METHODS[k].name) + '</option>'; }).join("") + '</select>' +
      '<h3>Localisation</h3>' + lieuHTML() +
      '<h3>Ma mosquée sur Mawaqit</h3><div class="card"><p style="margin-top:0">Pour prier aux horaires exacts de votre mosquée, enregistrez sa page Mawaqit : NÛR l\'ouvre en un geste. Les ajustements à la minute (« Tous les réglages ») alignent ensuite les horaires calculés sur ceux de la mosquée.</p>' +
      '<label class="f" for="mwq">Adresse de la page de la mosquée</label><input type="url" id="mwq" placeholder="https://mawaqit.net/fr/…" value="' + esc(st.mawaqit || "") + '">' +
      '<p class="row"><button class="btn alt" id="mwqs">Enregistrer</button>' + (st.mawaqit ? '<a class="btn" href="' + esc(st.mawaqit) + '" target="_blank" rel="noopener">Ouvrir ma mosquée</a>' : '') + '<a class="btn alt" href="https://mawaqit.net/fr" target="_blank" rel="noopener">Trouver une mosquée</a></p></div>';
    return { title: "Horaires", html: html, back: "#/priere", tab: "#/priere", bind: function (r) {
      $("#meth", r).onchange = function (e) { st.method = e.target.value; save(); scheduleNotifs(); toast("Méthode enregistrée."); };
      bindLieu(r);
      $("#mwqs", r).onclick = function () { var u = $("#mwq", r).value.trim(); if (u && !/^https:\/\/(www\.)?mawaqit\.net\//.test(u)) return toast("Collez l'adresse d'une page mawaqit.net."); st.mawaqit = u || null; save(); toast(u ? "Mosquée enregistrée." : "Mosquée retirée."); render(); };
    } };
  });

  /* qibla : boussole */
  route(/^\/qibla$/, function () {
    var L = loc(), qb = P.qibla(L.lat, L.lng), b = qb.bearing, sun = sunAzEl(L.lat, L.lng, Date.now()), rel = ((b - sun.az + 540) % 360) - 180;
    var ticks = ""; for (var t = 0; t < 360; t += 30) ticks += '<span class="tk" style="transform:rotate(' + t + 'deg)"><i>' + ({ 0: "N", 90: "E", 180: "S", 270: "O" }[t] || t) + '</i></span>';
    var html = '<h2>Trouver la qibla</h2><div class="card center"><div class="qdeg">' + b.toFixed(0) + '°</div><p style="margin:.2rem 0">depuis le nord, vers ' + versC(b) + '</p><p class="muted" style="margin:0">' + esc(L.name) + ' · Kaaba à ' + Math.round(qb.distanceKm).toLocaleString("fr-FR") + ' km · <a href="#/priere/reglages">changer de lieu</a></p>' +
      '<div class="rose" id="rose" aria-label="Boussole de la qibla">' + ticks + '<div class="qneedle" style="transform:rotate(' + b + 'deg)"><b>Kaaba</b></div><div class="dot"></div></div>' +
      '<p class="row" style="justify-content:center"><button class="btn" id="cb">Activer la boussole</button></p><p class="muted" id="cs">Tenez le téléphone à plat, loin des objets métalliques.</p></div>' +
      '<div class="card"><h3>Sur ordinateur ou sans boussole</h3>' + (sun.el > 0 ? '<p>Le soleil est en ce moment à <b>' + Math.round(sun.az) + '°</b> (' + cardinal(sun.az) + '). Placez-vous face au soleil, puis tournez de <b>' + Math.abs(Math.round(rel)) + '°</b> vers la ' + (rel > 0 ? "droite" : "gauche") + ' : vous faites face à la qibla.</p>' :
        '<p>Le soleil est couché. Repérez le nord (étoile Polaire, plan ou boussole) : la qibla est à <b>' + b.toFixed(0) + '°</b> dans le sens des aiguilles d\'une montre depuis le nord.</p>') +
      '<p class="muted">Sur un plan orienté nord en haut, la qibla part de votre position vers ' + versC(b) + '. Elle change selon la ville : environ 119° à Paris, 351° à Dzaoudzi, 74° à Dakar.</p></div>';
    return { title: "Qibla", html: html, back: "#/priere", tab: "#/priere", bind: function (r) {
      var rose = $("#rose", r), got = false;
      function onOrient(e) {
        var h = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.absolute && e.alpha != null ? 360 - e.alpha : null);
        if (h == null) return; got = true;
        rose.style.transform = "rotate(" + (-h) + "deg)";
        var off = ((b - h + 540) % 360) - 180;
        $("#cs", r).textContent = Math.abs(off) < 5 ? "Vous faites face à la qibla." : "Tournez de " + Math.abs(Math.round(off)) + "° vers la " + (off > 0 ? "droite" : "gauche") + ".";
      }
      function start() {
        window.addEventListener("deviceorientationabsolute", onOrient, true); window.addEventListener("deviceorientation", onOrient, true);
        setTimeout(function () { if (!got) $("#cs", r).textContent = "Aucune boussole détectée sur cet appareil (cas des ordinateurs) : utilisez la méthode du soleil ci-dessous, ou orientez le haut de l'écran vers le nord."; }, 3000);
      }
      $("#cb", r).onclick = function () {
        if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") DeviceOrientationEvent.requestPermission().then(function (st) { if (st === "granted") start(); else toast("Accès aux capteurs refusé."); }).catch(function () { toast("Capteur indisponible."); });
        else start();
      };
      start();
      onLeave(function () { window.removeEventListener("deviceorientationabsolute", onOrient, true); window.removeEventListener("deviceorientation", onOrient, true); });
    } };
  });

  /* ---------------------------------------------------------------- CORAN : liste des 114 sourates */
  var coranQ = "", coranSearch = false;
  route(/^\/reciter$/, function () {
    return loadQ().then(function (q) {
      var last = S.last && q.byN[S.last.s] ? S.last : { s: 1, a: 1 }, s0 = q.byN[last.s], st = kStats(q);
      var nr = Math.min(kRead(s0.n).length, s0.v.length);
      var html = '<div class="row between phead"><h2 style="margin:0">Le Saint Coran</h2><div class="row" style="margin:0"><button class="iconbtn" id="srch" aria-label="Rechercher une sourate" aria-pressed="' + coranSearch + '">' + ICO.search + '</button><a class="iconbtn" href="#/signets" aria-label="Mes signets">' + ICO.bm + '</a><button class="iconbtn" id="cset" aria-label="Paramètres de lecture">' + ICO.gear + '</button></div></div>';
      if (coranSearch) html += '<input type="search" id="q" placeholder="Nom ou numéro de sourate" value="' + esc(coranQ) + '" aria-label="Rechercher une sourate" style="margin:.5rem 0">';
      html += '<a class="hero cont" href="#/reciter/' + s0.n + '?a=' + last.a + '"><div class="row between"><b>' + esc(s0.fr) + '</b><span class="ar">' + esc(s0.ar) + '</span></div><div class="hl">Continuer la lecture ' + ICO.arrow + '</div>' +
        '<div class="two"><div><b>' + nr + '</b> / ' + s0.v.length + ' versets<div class="bar"><i style="width:' + Math.round(100 * nr / s0.v.length) + '%"></i></div></div><div><b>' + String(st.s).padStart(2, "0") + '</b> / 114 sourates<div class="bar"><i style="width:' + Math.round(100 * st.s / 114) + '%"></i></div></div></div></a>';
      html += '<div class="sgrid" id="sg">' + q.suras.map(function (s) {
        var n = Math.min(kRead(s.n).length, s.v.length), full = n >= s.v.length;
        return '<a class="scard' + (full ? " done" : "") + '" href="#/reciter/' + s.n + '" data-k="' + esc((s.n + " " + s.en + " " + s.fr + " " + nomSens(s.n) + " " + s.ar).toLowerCase()) + '"><span class="ck" aria-hidden="true">' + (full ? "✓" : "") + '</span><b>' + s.n + '. ' + esc(s.fr) + '</b><small>' + esc(nomSens(s.n)) + '</small><span class="nv">' + s.v.length + (n && !full ? ' · ' + n + ' lus' : '') + '</span></a>';
      }).join("") + '</div>';
      return { title: "Coran", html: html, tab: "#/reciter", bind: function (r) {
        $("#srch", r).onclick = function () { coranSearch = !coranSearch; render(); setTimeout(function () { var i = $("#q"); if (i) i.focus(); }, 50); };
        $("#cset", r).onclick = function () { coranSettings(q, null); };
        var inp = $("#q", r);
        function filt() { var v = inp.value.trim().toLowerCase(); coranQ = inp.value; $$(".scard", r).forEach(function (a) { a.hidden = v && a.dataset.k.indexOf(v) < 0; }); }
        if (inp) { inp.oninput = filt; filt(); }
      } };
    });
  });
  route(/^\/signets$/, function () {
    return loadQ().then(function (q) {
      var L = S.bookmarks.slice().reverse();
      var html = '<h2>Mes signets</h2>' + (L.length ? '<ul class="list">' + L.map(function (k) { var p = k.split(":"), s = q.byN[+p[0]]; return s ? '<li><a href="#/reciter/' + s.n + '?a=' + p[1] + '"><span class="badge">' + s.n + '</span><span class="nm">' + esc(s.fr) + '<small>Verset ' + p[1] + '</small></span></a></li>' : ''; }).join("") + '</ul>' : '<p class="muted">Aucun signet. Dans le lecteur, touchez l\'icône du signet sous un verset.</p>');
      return { title: "Signets", html: html, back: "#/reciter", tab: "#/reciter" };
    });
  });

  /* paramètres de lecture : onglets Récitateur et Khatm (affichage, taille, remise à zéro) */
  var setTab = "khatm";
  function coranSettings(q, sn) {
    var st = stt(), Lr = st.layers;
    function body() {
      var b = '<div class="seg2"><button data-st="recit" aria-selected="' + (setTab === "recit") + '">Récitateur</button><button data-st="khatm" aria-selected="' + (setTab === "khatm") + '">Khatm</button></div>';
      if (setTab === "recit") b += RECITERS.map(function (x) { var on = reciter()[0] === x[0]; return '<button class="tcard" data-rec="' + x[0] + '" aria-pressed="' + on + '"><span><b>' + esc(x[1]) + '</b><small>Arabe · riwaya de Warsh · lecture guidée verset par verset</small></span>' + (on ? '<span class="pill">choisi</span>' : '') + '</button>'; }).join("") +
        '<p class="muted">Lecture guidée : le verset récité est mis en évidence et suivi à l\'écran. Récitations : EveryAyah.com.</p>';
      else b += '<button class="tcard" id="kraz"><span><b>Réinitialiser la progression du khatm</b></span>' + ICO.arrow + '</button>' +
        '<label class="tcard"><span><b>Arabe</b></span><input type="checkbox" class="sw" id="lar"' + (Lr.ar !== false ? " checked" : "") + '></label>' +
        '<label class="tcard"><span><b>Phonétique</b></span><input type="checkbox" class="sw" id="lph"' + (Lr.phon !== false ? " checked" : "") + '></label>' +
        '<label class="tcard"><span><b>Traduction</b><small>Français, Muhammad Hamidullah (QuranEnc.com)</small></span><input type="checkbox" class="sw" id="lfr"' + (Lr.fr !== false ? " checked" : "") + '></label>' +
        '<div class="tcard"><span><b>Taille de la police</b></span><span class="seg3"><button data-fs="1" aria-pressed="' + ((S.settings.fs || 1) < 1.15) + '">Petit</button><button data-fs="1.3" aria-pressed="' + ((S.settings.fs || 1) >= 1.15) + '">Grand</button></span></div>';
      return b;
    }
    function bind(w) {
      $$("[data-st]", w).forEach(function (b) { b.onclick = function () { setTab = b.dataset.st; $(".msheet", w).lastChild.remove(); refresh(w); }; });
      var kr = $("#kraz", w); if (kr) kr.onclick = function () {
        if (!confirm("Remettre la progression du khatm à zéro ? Les points acquis sont conservés.")) return;
        (isChild() ? askPin("Code parental") : Promise.resolve(true)).then(function (ok) { if (!ok) return; S.khatm = { read: {}, since: null }; save(); toast("Progression remise à zéro."); closeSheet(); render(); });
      };
      var la = $("#lar", w), lp = $("#lph", w);
      if (la) la.onchange = function () { if (!la.checked && lp && !lp.checked) { la.checked = true; return toast("Gardez au moins l'arabe ou la phonétique."); } Lr.ar = la.checked; save(); sheetDirty = true; };
      if (lp) lp.onchange = function () { if (!lp.checked && la && !la.checked) { lp.checked = true; return toast("Gardez au moins l'arabe ou la phonétique."); } Lr.phon = lp.checked; save(); sheetDirty = true; };
      var lf = $("#lfr", w); if (lf) lf.onchange = function () { Lr.fr = lf.checked; save(); sheetDirty = true; };
      $$("[data-rec]", w).forEach(function (b) { b.onclick = function () { S.settings.reciter = b.dataset.rec; save(); if (PL.q.length) plBar(); $(".msheet", w).lastChild.remove(); refresh(w); }; });
      $$("[data-fs]", w).forEach(function (b) { b.onclick = function () { S.settings.fs = +b.dataset.fs; save(); applyTheme(); $$("[data-fs]", w).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); }; });
    }
    function refresh(w) { var d = document.createElement("div"); d.innerHTML = body(); $(".msheet", w).appendChild(d); bind(w); i18n(d); }
    var w = openSheet("Paramètres", "", null); refresh(w);
  }

  /* ---------------------------------------------------------------- lecteur de sourate */
  var readView = "liste";
  route(/^\/reciter\/(\d+)$/, function (m, params) {
    var sn = +m[1];
    return Promise.all([loadQ(), loadOpt()]).then(function (res) {
      var q = res[0], s = q.byN[sn]; if (!s) return { title: "Introuvable", html: '<p>Sourate introuvable.</p>', back: "#/reciter" };
      var st = stt(), showAr = st.layers.ar !== false, N = s.v.length, rd = kRead(sn), mem = S.hifz[sn] || [];
      var html = '<div class="row between phead"><h2 style="margin:0">' + sn + '. ' + esc(s.fr) + '</h2><button class="iconbtn" id="rset" aria-label="Paramètres de lecture">' + ICO.gear + '</button></div>' +
        '<p class="muted" style="margin:.2rem 0 .4rem">' + esc(nomSens(sn)) + ' · ' + N + ' versets · ' + Math.min(rd.length, N) + ' lus</p>' +
        '<div class="row between" style="margin:0 0 .4rem">' + arSeulHTML() + '<button class="btn alt small" id="plays">▶ Écouter la sourate</button></div>' + readingLine();
      if (readView === "page") {
        html += '<div class="row" style="justify-content:flex-end;margin:.4rem 0"><button class="btn alt" id="fm" aria-label="Réduire la taille du texte">A−</button><button class="btn alt" id="fp" aria-label="Augmenter la taille du texte">A+</button></div>' + readerHTML(s, q, "lecture", false);
      } else {
        html += (sn !== 9 ? '<article class="vcard bsm">' + (showAr ? '<div class="ar-line mushaf" lang="ar" dir="rtl">' + esc(q.basmala) + '</div>' : '') + (phonOn() && window.NUR_PHON ? '<div class="ph" lang="ar-Latn">' + esc(window.NUR_PHON(q.basmala, 0, 0)) + '</div>' : '') + (frOn() && OPT.fr && OPT.fr.basmala ? '<div class="trfr" lang="fr">' + esc(OPT.fr.basmala) + '</div>' : '') + (sn === 1 ? '<div class="vrow"><span class="sp"></span><button class="ib" data-play="0" aria-label="Écouter la basmala">▶</button></div>' : '') + '</article>' : '');
        html += s.v.map(function (v) {
          var a = v[0], lu = rd.indexOf(a) >= 0, bm = S.bookmarks.indexOf(sn + ":" + a) >= 0, mm = mem.indexOf(a) >= 0;
          return '<article class="vcard' + (lu ? " lu" : "") + '" id="v' + a + '" data-a="' + a + '">' + (showAr ? '<div class="ar-line mushaf" lang="ar" dir="rtl">' + esc(v[1]) + '</div>' : '') + phonLine(sn, a, q) +
            '<div class="vrow"><button class="vpill' + (lu ? " on" : "") + '" data-read="' + a + '" aria-pressed="' + lu + '" aria-label="Verset ' + a + ' sur ' + N + ', marquer comme lu">' + a + '/' + N + ' <span aria-hidden="true">✓</span></button>' + (mm ? '<span class="pill">mémorisé</span>' : '') + '<span class="sp"></span>' +
            '<button class="ib" data-play="' + a + '" aria-label="Écouter le verset ' + a + '">▶</button>' +
            '<a class="ib" href="#/mediter/' + sn + '/' + a + '" aria-label="Méditer ce verset">' + ICO.note + '</a>' +
            '<button class="ib" data-bm="' + a + '" aria-pressed="' + bm + '" aria-label="' + (bm ? "Retirer le signet" : "Poser un signet") + '">' + (bm ? ICO.bmon : ICO.bm) + '</button>' +
            '<button class="ib" data-sh="' + a + '" aria-label="Partager ce verset">' + ICO.share + '</button>' +
            '<button class="ib" data-more="' + a + '" aria-label="Mémoriser, répéter">' + ICO.more + '</button></div></article>';
        }).join("");
      }
      html += '<div class="viewtog" role="group" aria-label="Affichage"><button data-view="liste" aria-pressed="' + (readView === "liste") + '" aria-label="Verset par verset">' + ICO.list + '</button><button data-view="page" aria-pressed="' + (readView === "page") + '" aria-label="Page en arabe">' + ICO.book + '</button></div>';
      html += '<div class="row between" style="margin-top:1rem">' + (sn > 1 ? '<a class="btn alt" href="#/reciter/' + (sn - 1) + '">Sourate précédente</a>' : '<span></span>') + (sn < 114 ? '<a class="btn alt" href="#/reciter/' + (sn + 1) + '">Sourate suivante</a>' : '<span></span>') + '</div>' +
        '<p class="muted">Texte : complexe du Roi Fahd (KFGQPC), riwaya de Warsh ʿan Nâfiʿ. ' + NOTE_PHON + ' ' + noteFr() + ' Récitation : ' + esc(reciter()[1]) + ', riwaya de Warsh, EveryAyah.com.</p>';
      return { title: s.fr, html: html, back: "#/reciter", tab: "#/reciter", bind: function (r) {
        bindArSeul(r);
        $$("[data-play]", r).forEach(function (b) { b.onclick = function () { playVerse(sn, +b.dataset.play); }; });
        $("#plays", r).onclick = function () { playFrom(sn, 1); };
        onLeave(function () { if (!/^#\/reciter\/\d+/.test(location.hash)) plStop(); });
        if (PL.sn === sn) setTimeout(plMark, 50);
        $("#rset", r).onclick = function () { coranSettings(q, sn); };
        $$("[data-view]", r).forEach(function (b) { b.onclick = function () { readView = b.dataset.view; render(); }; });
        var fm = $("#fm", r), fp = $("#fp", r);
        if (fm) fm.onclick = function () { S.settings.fs = Math.max(.8, +((S.settings.fs || 1) - .1).toFixed(1)); save(); applyTheme(); };
        if (fp) fp.onclick = function () { S.settings.fs = Math.min(1.8, +((S.settings.fs || 1) + .1).toFixed(1)); save(); applyTheme(); };
        $$("[data-read]", r).forEach(function (b) { b.onclick = function () { var a = +b.dataset.read; kMark(sn, a); S.last = { s: sn, a: a }; save(); creditReading(); render(); }; });
        $$("[data-bm]", r).forEach(function (b) { b.onclick = function () { var k = sn + ":" + b.dataset.bm, i = S.bookmarks.indexOf(k); if (i >= 0) S.bookmarks.splice(i, 1); else S.bookmarks.push(k); save(); toast(i >= 0 ? "Signet retiré." : "Signet posé."); render(); }; });
        $$("[data-sh]", r).forEach(function (b) { b.onclick = function () { var a = +b.dataset.sh, v = s.v.filter(function (x) { return x[0] === a; })[0]; share("NÛR", "Sourate " + s.fr + " (" + sn + "), verset " + a + "\n" + (v ? v[1] : "") + "\n" + (phonOf(OPT, sn, a, q) || "")); }; });
        $$("[data-more]", r).forEach(function (b) { b.onclick = function () {
          var a = +b.dataset.more, mm = (S.hifz[sn] || []).indexOf(a) >= 0, rep = 0;
          openSheet("Verset " + a, '<button class="tcard" id="mmem"><span><b>' + (mm ? "Retirer de mes versets mémorisés" : "Marquer comme mémorisé") + '</b></span></button>' +
            '<button class="tcard" id="mrep"><span><b>Répéter</b><small>Comptez vos répétitions avant de réciter de mémoire.</small></span><span class="pill" id="rc">0 / 3</span></button>' +
            '<button class="tcard" id="mlu"><span><b>Marquer lus les versets 1 à ' + a + '</b></span></button>', function (w) {
            $("#mmem", w).onclick = function () { var L2 = S.hifz[sn] || [], i = L2.indexOf(a); if (i >= 0) L2.splice(i, 1); else L2.push(a); S.hifz[sn] = L2; save(); closeSheet(); render(); };
            $("#mrep", w).onclick = function () { rep++; $("#rc", w).textContent = rep + " / 3"; if (rep === 3) toast("Trois répétitions : essayez de mémoire."); };
            $("#mlu", w).onclick = function () { s.v.forEach(function (v) { if (v[0] <= a) kMark(sn, v[0], true); }); S.last = { s: sn, a: a }; save(); creditReading(); closeSheet(); render(); };
          });
        }; });
        if (params.a) { var el = document.getElementById("v" + params.a); if (el) setTimeout(function () { el.scrollIntoView({ block: "center" }); }, 30); }
      } };
    });
  });

  /* ---------------------------------------------------------------- APPRENDRE (catalogue) */
  function dureeEtape(et) {
    var w = 0; et.lecons.forEach(function (l) { w += (l.texte || []).join(" ").split(/\s+/).length + 40; }); w += et.quiz.length * 30;
    return Math.max(5, Math.round(w / 120 / 5) * 5);
  }
  route(/^\/apprendre$/, function () {
    return loadOpt().then(function (opt) {
      var pal = opt.parcours ? palById(opt, "initie") : null, E = pal ? pal.etapes : [];
      var cur = null; E.forEach(function (et) { if (!cur && etapeOpen(pal, et.n) && !etapeState(pal.id, et).complete) cur = et; });
      var html = '<div class="row between phead"><h2 style="margin:0">Apprendre</h2><a class="pill gold" href="#/parcours">' + (opt.parcours ? totalPts(opt) : 0) + ' pts</a></div>' +
        '<p class="lead2">Je souhaite étudier…</p><p class="muted" style="margin-top:0">Les thèmes de mon parcours, de l\'Étincelle à l\'Étoile.</p>' +
        '<div class="chipsH">' + E.map(function (et) { return '<a class="chip" href="#/parcours/initie/' + et.n + '">' + esc(et.titre) + '</a>'; }).join("") + '<a class="chip" href="#/alphabet">Alphabet</a><a class="chip" href="#/tajwid">Tajwid</a></div>';
      if (cur) html += '<h3>Pour continuer</h3><a class="ccard cbig" href="#/parcours/initie/' + cur.n + '"><span class="dur">≈ ' + dureeEtape(cur) + ' min</span><b>' + esc(cur.titre) + '</b><span>' + esc(cur.resume || "") + '</span><span class="muted2">Étape ' + cur.n + ' · ' + etapeState(pal.id, cur).lec + ' / 4 leçons ' + ICO.arrow + '</span></a>';
      html += '<div class="row between"><h3>Mon parcours : ' + esc(pal ? pal.nom : "") + '</h3><a href="#/parcours">Tout afficher</a></div><div class="hscroll">' + E.map(function (et) {
        var stt2 = etapeState(pal.id, et), open = etapeOpen(pal, et.n);
        return '<a class="ccard' + (open ? "" : " locked") + (stt2.complete ? " done" : "") + '" href="#/parcours/initie/' + et.n + '"><span class="dur">≈ ' + dureeEtape(et) + ' min</span><b>' + esc(et.titre) + '</b><span class="muted2">' + (stt2.complete ? "Terminé ✓" : (open ? stt2.lec + " / 4 leçons" : "S'ouvre après l'étape " + (et.n - 1))) + '</span></a>';
      }).join("") + '</div>';
      html += '<h3>Lire et réciter</h3><div class="hscroll">' +
        '<a class="ccard" href="#/alphabet"><b>Alphabet et lecture</b><span class="muted2">Les lettres, les voyelles, la phonétique</span></a>' +
        '<a class="ccard" href="#/tajwid"><b>Tajwid</b><span class="muted2">Les règles de la récitation</span></a>' +
        '<a class="ccard" href="#/niveaux"><b>Repères de mémorisation</b><span class="muted2">Sourate par sourate</span></a></div>';
      return { title: "Apprendre", html: html, tab: "#/apprendre" };
    });
  });
  route(/^\/tajwid$/, function () {
    var html = '<h2>Tajwid</h2>' + NOTE_VALIDATION + TAJWID.map(function (t) { return '<details class="card"><summary><strong>' + esc(t[0]) + '</strong></summary>' + t[1] + '</details>'; }).join("");
    return { title: "Tajwid", html: html, back: "#/apprendre", tab: "#/apprendre" };
  });

  /* ---------------------------------------------------------------- PLUS */
  route(/^\/plus$/, function () {
    return loadOpt().then(function (opt) {
      var kid = isChild(), don = opt.conf && opt.conf.don_url;
      function fc(href, t, d, tag) { return '<a class="fcard" href="' + href + '"><div class="row between"><b>' + t + (tag ? ' <span class="pill">' + tag + '</span>' : '') + '</b>' + ICO.arrow + '</div><span>' + d + '</span></a>'; }
      var html = '<h2>Plus de fonctionnalités</h2>' +
        fc("#/tafsir", "Tafsir (exégèse du Coran)", "Le contexte et le sens des versets, expliqués simplement.", "en construction") +
        fc("#/cartes", "Cartes de vœux", "Crée une carte avec un verset ou une invocation, et envoie-la à tes proches.") +
        fc("#/apprendre", "Apprendre", "Les leçons, les quiz et les fiches de ton parcours.") +
        fc("#/dhikr", "Les dhikr", "Les invocations quotidiennes, avec compteur.") +
        fc("#/scanner", "Scanner halal", "Vérifie le label halal déclaré d'un produit par son code-barres.", "bêta") +
        fc("#/evenements", "Événements à venir", "Les prochaines dates du calendrier hégirien.") +
        fc("#/qibla", "Trouver la qibla", "La boussole pour trouver la direction de la Kaaba où que tu sois.") +
        '<h3>NÛR</h3>' +
        fc("#/parcours", "Mon parcours et mes points", "Paliers, étapes, leçons et quiz.") +
        fc("#/khatm", "Ma lecture complète du Coran", "Khatm et lecture du jour.") +
        fc("#/mediter", "Méditer", "Verset du jour et journal.") +
        fc("#/aimer", "Aimer", "Gratitude, invocations, partage.") +
        (kid ? '' : fc("#/tidjaniya", "Tidjaniya", "Compteurs de dhikr ; contenus à fournir par votre mouqaddam.")) +
        fc("#/enfant", "Espace enfant", "Sourates courtes et étoiles.") +
        fc("#/profil", "Profil et paramètres", "Prénom, lieu, horaires, profils, à propos.") +
        (kid ? '' : '<div class="card"><h3>Soutenir NÛR' + (don ? '' : ' (en construction)') + '</h3><p>NÛR est gratuite et le restera. Un don libre, à partir de ' + (opt.conf.don_min_eur || 2) + ' euros, aidera à la faire vivre. Aucun accès ne dépend du don.</p>' + (don ? '<p><a class="btn" href="' + esc(don) + '" target="_blank" rel="noopener">Faire un don</a></p>' : '<p class="muted">Le lien de don de l\'association sera ajouté ici dès qu\'il sera ouvert.</p>') + '</div>') +
        '<div id="install" class="card" hidden><p>Installer NÛR sur cet appareil pour l\'utiliser hors ligne.</p><button class="btn" id="doInstall">Installer l\'application</button></div>';
      return { title: "Plus", html: html, tab: "#/plus", bind: function (r) {
        if (deferredPrompt) { $("#install", r).hidden = false; $("#doInstall", r).onclick = function () { deferredPrompt.prompt(); deferredPrompt = null; $("#install", r).hidden = true; }; }
      } };
    });
  });

  /* ---------------------------------------------------------------- PROFIL */
  route(/^\/profil$/, function () {
    return loadOpt().then(function (opt) {
      var p = prof(), L = loc(), st2 = opt.parcours ? parcoursNow(opt) : null;
      function lc(href, t, id) { return '<a class="lcardM" href="' + href + '"' + (id ? ' id="' + id + '"' : '') + '><span>' + t + '</span>' + ICO.arrow + '</a>'; }
      var html = '<div class="qhead"><span class="avatar big">' + esc(initiale()) + '</span><div><div class="salutM">' + esc(p && p.nom ? p.nom : "Mon profil") + '</div><a class="hchip light" href="#/priere/reglages">' + ICO.pin + ' ' + esc(L.name) + '</a></div></div>' +
        '<div class="card gold"><strong>Le rappel profite au croyant</strong><p>Tu penses que NÛR pourrait aider un proche à se rapprocher de Dieu ? Partage-lui l\'application, gratuite et sans publicité.</p><button class="btn alt" id="shapp">Partager à un proche ' + ICO.arrow + '</button></div>' +
        '<h3>Mes points</h3><a class="card plain-link" href="#/parcours"><div class="row between"><strong>' + (opt.parcours ? totalPts(opt) : 0) + ' points</strong><span class="pill">' + esc(st2 ? st2.pal.nom : "") + '</span></div>' + (st2 && st2.pal.seuil ? '<div class="bar"><i style="width:' + Math.min(100, Math.round(100 * st2.pts / st2.pal.seuil)) + '%"></i></div><div class="muted">' + st2.pts + ' / ' + st2.pal.seuil + ' pour le palier suivant</div>' : '') + '</a>' +
        '<h3>Paramètres</h3>' + lc("#/priere/reglages", "Horaires de prière") + '<div class="card"><strong>Langue</strong>' + langChips() + '<p class="muted" style="margin:0">' + (LK() === "fr" ? "" : "Les leçons, quiz et hadiths restent en français pour l\'instant ; la traduction du Coran suit la langue choisie.") + '</p></div>' +
        lc("#/profils", "Profils de l\'appareil") + lc("#/reglages", "Tous les réglages") +
        '<h3>À propos</h3><a class="lcardM" href="#" id="shapp2"><span>Partager NÛR</span>' + ICO.arrow + '</a>' +
        '<div class="lcardM"><span>Nous contacter</span><span class="muted">en construction</span></div>' +
        lc("#/conditions", "Conditions d\'utilisation") + lc("#/confidentialite", "Politique de confidentialité") + lc("#/apropos", "Sources et licences") +
        '<a class="lcardM danger" href="#/reglages"><span>Supprimer mes données</span>' + ICO.arrow + '</a>' +
        '<p class="muted center">Version : ' + VERSION + '</p><p class="muted center appid">Identifiant d\'installation<br><code id="aid">' + esc(appId()) + '</code> <button class="btn alt" id="cpid">Copier</button></p>';
      return { title: "Profil", html: html, back: "#/", tab: null, bind: function (r) {
        bindLang(r);
        function sh(e) { if (e) e.preventDefault(); share("NÛR", "NÛR : apprendre le Coran et les bases de la foi, pas à pas. Gratuit, sans publicité. " + location.origin + location.pathname); }
        $("#shapp", r).onclick = sh; $("#shapp2", r).onclick = sh;
        $("#cpid", r).onclick = function () { var t = appId(); if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast("Identifiant copié."); }, function () { toast(t); }); else toast(t); };
      } };
    });
  });
  route(/^\/conditions$/, function () {
    var html = '<h2>Conditions d\'utilisation</h2><div class="card"><p>NÛR est une application gratuite, sans publicité et sans abonnement, destinée à l\'apprentissage du Coran et des bases de la foi.</p><p>Le texte du Coran est celui du complexe du Roi Fahd (KFGQPC), riwaya de Warsh ʿan Nâfiʿ. Les contenus pédagogiques sont validés par l\'imam garant du projet ; la phonétique est une aide à la lecture qui ne remplace pas un enseignant.</p><p>Les horaires de prière sont calculés sur l\'appareil ; ils peuvent différer de ceux de votre mosquée. Le scanner halal indique seulement le label déclaré dans une base publique et ne constitue pas un avis religieux.</p><p>Les profils enfants sont créés et contrôlés par un adulte responsable.</p></div>';
    return { title: "Conditions", html: html, back: "#/profil" };
  });
  route(/^\/confidentialite$/, function () {
    var html = '<h2>Politique de confidentialité</h2><div class="card"><p>NÛR ne crée pas de compte et ne collecte aucune donnée personnelle. Prénoms, profils, points, lecture, prières marquées et journal restent sur votre appareil, dans le stockage du navigateur.</p><p>La position, si vous l\'autorisez, sert uniquement à calculer les horaires et la qibla sur l\'appareil ; elle n\'est transmise à personne.</p><p>Le scanner halal envoie seulement le code-barres saisi ou lu à la base publique Open Food Facts pour obtenir la fiche du produit.</p><p>« Supprimer mes données » efface tout ce que NÛR a enregistré sur cet appareil.</p></div>';
    return { title: "Confidentialité", html: html, back: "#/profil" };
  });

  /* ---------------------------------------------------------------- Les dhikr */
  route(/^\/dhikr$/, function () {
    return loadOpt().then(function (opt) {
      var D = (opt.quot && opt.quot.dhikr) || [], k = today();
      if (!S.dhk || S.dhk.k !== k) S.dhk = { k: k, c: {} };
      var html = '<h2>Les dhikr</h2><p class="muted">Touchez la formule pour compter. Les compteurs repartent à zéro chaque jour.</p>' + D.map(function (x, i) {
        var c = S.dhk.c[i] || 0, pct = Math.min(100, Math.round(100 * c / x.cible));
        return '<div class="invrow"><div><b>' + esc(x.ph) + '</b> <span class="muted">' + x.cible + ' fois</span><div class="ar small" lang="ar" dir="rtl">' + esc(x.ar) + '</div><div class="muted">' + esc(x.fr) + '</div></div><button class="ring" data-dk="' + i + '" style="--p:' + pct + '" aria-label="Compter"><span>' + c + '/' + x.cible + '</span></button></div>';
      }).join("") + NOTE_VALIDATION;
      return { title: "Dhikr", html: html, back: "#/plus", tab: "#/plus", bind: function (r) {
        $$("[data-dk]", r).forEach(function (b) { b.onclick = function () { var i = +b.dataset.dk; S.dhk.c[i] = (S.dhk.c[i] || 0) + 1; save(); if (navigator.vibrate) navigator.vibrate(10); render(); }; });
      } };
    });
  });

  /* ---------------------------------------------------------------- Événements à venir (calendrier Umm al-Qurâ) */
  var EVTS = [[1, 1, "Nouvel an de l'hégire"], [1, 10, "ʿÂchoûrâʾ"], [3, 12, "Mawlid, naissance du Prophète"], [7, 27, "Isrâʾ et Miʿrâj"], [8, 15, "Nuit du milieu de Chaʿbân"], [9, 1, "Début du Ramadân"],
    [9, 27, "Laylat al-Qadr (27e nuit)"], [10, 1, "ʿÎd al-Fitr"], [12, 9, "Jour de ʿArafa"], [12, 10, "ʿÎd al-Adhâ"]];
  function nextEvents(n) {
    var L = loc(), base = ymd(Date.now(), L.tz), out = [], fmt;
    try { fmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { timeZone: "UTC", day: "numeric", month: "numeric" }); } catch (e) { return out; }
    for (var i = 0; i < 400 && out.length < n; i++) {
      var d = addDays(base, i), hm = 0, hd = 0;
      fmt.formatToParts(new Date(Date.UTC(d.y, d.m - 1, d.d, 12) + (S.settings.hijriOffset || 0) * 864e5)).forEach(function (p) { if (p.type === "month") hm = +p.value; if (p.type === "day") hd = +p.value; });
      EVTS.forEach(function (e) { if (e[0] === hm && e[1] === hd && out.length < n) out.push([d, e[2], i, new Intl.DateTimeFormat(UIL(), { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(Date.UTC(d.y, d.m - 1, d.d, 12)))]); });
    }
    return out;
  }
  route(/^\/evenements$/, function () {
    var L = loc(), base = ymd(Date.now(), L.tz), out = [], fmt;
    try { fmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { timeZone: "UTC", day: "numeric", month: "numeric" }); } catch (e) { fmt = null; }
    if (fmt) for (var i = 0; i < 400 && out.length < 12; i++) {
      var d = addDays(base, i), parts = fmt.formatToParts(new Date(Date.UTC(d.y, d.m - 1, d.d, 12) + (S.settings.hijriOffset || 0) * 864e5)), hm = 0, hd = 0;
      parts.forEach(function (p) { if (p.type === "month") hm = +p.value; if (p.type === "day") hd = +p.value; });
      EVTS.forEach(function (e) { if (e[0] === hm && e[1] === hd) out.push([d, e[2], i]); });
    }
    var html = '<h2>Événements à venir</h2>' + (out.length ? '<ul class="list">' + out.map(function (x) {
      var dl = new Intl.DateTimeFormat(UIL(), { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(Date.UTC(x[0].y, x[0].m - 1, x[0].d, 12)));
      return '<li><div class="card" style="margin:0"><strong>' + esc(x[1]) + '</strong><div class="muted">' + esc(dl) + ' · ' + esc(hijriOf(x[0])) + (x[2] === 0 ? " · aujourd'hui" : " · dans " + x[2] + " jours") + '</div></div></li>';
    }).join("") + '</ul>' : '<p>Calendrier hégirien indisponible sur ce navigateur.</p>') +
      '<p class="muted">Dates calculées selon le calendrier Umm al-Qurâ ; elles peuvent varier d\'un jour selon l\'observation de la lune et les annonces de votre mosquée. Le décalage se règle dans les réglages. Les nuits commencent au coucher du soleil de la veille.</p>';
    return { title: "Événements", html: html, back: "#/plus", tab: "#/plus" };
  });

  /* ---------------------------------------------------------------- Tafsir (en construction) */
  route(/^\/tafsir$/, function () {
    var html = '<h2>Tafsir (exégèse du Coran)</h2><div class="callout">En construction. Le tafsir sera ajouté à partir d\'une source dont les droits sont établis. En attendant, chaque verset peut être médité et annoté dans « Méditer ».</div><p class="row"><a class="btn" href="#/mediter">Méditer le verset du jour</a><a class="btn alt" href="#/reciter">Ouvrir le Coran</a></p>';
    return { title: "Tafsir", html: html, back: "#/plus", tab: "#/plus" };
  });

  /* ---------------------------------------------------------------- Cartes de vœux (texte seul, sans représentation d'être vivant) */
  var CARTES = [["ʿÎd moubârak", "عيد مبارك"], ["Ramadân moubârak", "رمضان مبارك"], ["Djoumouʿa moubâraka", "جمعة مباركة"], ["Bârak Allâhou fîk", "بارك الله فيك"], ["Jazâk Allâhou khayran", "جزاك الله خيرا"]];
  route(/^\/cartes$/, function () {
    var html = '<h2>Cartes de vœux</h2><label class="f" for="cv">Formule</label><select id="cv">' + CARTES.map(function (c, i) { return '<option value="' + i + '">' + esc(c[0]) + '</option>'; }).join("") + '</select>' +
      '<label class="f" for="cm">Message (facultatif)</label><textarea id="cm" rows="3" maxlength="160" placeholder="Que Dieu accepte nos prières."></textarea>' +
      '<label class="f" for="cs2">Signature (facultatif)</label><input type="text" id="cs2" maxlength="40">' +
      '<canvas id="cvs" width="1080" height="1080" class="cardprev" aria-label="Aperçu de la carte"></canvas><p class="row"><button class="btn" id="cwa">Envoyer par WhatsApp</button><button class="btn alt" id="csh">Partager l\'image</button><button class="btn alt" id="clk">Copier le lien</button><button class="btn alt" id="cdl">Télécharger</button></p><p class="muted">WhatsApp s\'ouvre sur le téléphone, ou sur l\'ordinateur avec WhatsApp Web : le destinataire reçoit un lien qui affiche la carte.</p>';
    return { title: "Cartes", html: html, back: "#/plus", tab: "#/plus", bind: function (r) {
      var cv = $("#cvs", r);
      function cur() { return [+$("#cv", r).value, $("#cm", r).value.trim(), $("#cs2", r).value.trim()]; }
      function draw() { var c = cur(); drawCard(cv, CARTES[c[0]], c[1], c[2]); }
      ["#cv", "#cm", "#cs2"].forEach(function (s2) { $(s2, r).oninput = draw; $(s2, r).onchange = draw; });
      draw();
      $("#cwa", r).onclick = function () { var c = cur(), url = cardLink(c[0], c[1], c[2]); window.open("https://wa.me/?text=" + encodeURIComponent(CARTES[c[0]][0] + (c[1] ? "\n" + c[1] : "") + "\n" + url), "_blank", "noopener"); };
      $("#clk", r).onclick = function () { var c = cur(), url = cardLink(c[0], c[1], c[2]); if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast("Lien de la carte copié."); }, function () { toast(url); }); else toast(url); };
      $("#cdl", r).onclick = function () { var a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = "carte-nur.png"; a.click(); };
      $("#csh", r).onclick = function () {
        cv.toBlob(function (b) {
          var f = window.File ? new File([b], "carte-nur.png", { type: "image/png" }) : null;
          if (f && navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: "NÛR" }).catch(function () {});
          else $("#cdl", r).click();
        }, "image/png");
      };
    } };
  });

  /* ---------------------------------------------------------------- Scanner halal (bêta) : label déclaré dans Open Food Facts */
  route(/^\/scanner$/, function () {
    var html = '<h2>Scanner halal <span class="pill">bêta</span></h2><div class="callout">Le scanner indique seulement si le label halal est déclaré pour ce produit dans la base publique Open Food Facts. Ce n\'est pas un avis religieux : en cas de doute, renseignez-vous auprès de votre imam.</div>' +
      '<video id="vid" playsinline muted class="scanv" hidden></video><p class="row"><button class="btn" id="cam">Scanner avec la caméra</button></p>' +
      '<label class="f" for="ean">Ou saisir le code-barres</label><div class="row"><input type="text" id="ean" inputmode="numeric" pattern="[0-9]*" maxlength="14" style="flex:1"><button class="btn alt" id="go">Vérifier</button></div><div id="res" aria-live="polite"></div>';
    return { title: "Scanner halal", html: html, back: "#/plus", tab: "#/plus", bind: function (r) {
      var stream = null, timer = null;
      function stop() { if (timer) clearInterval(timer); timer = null; if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; $("#vid", r).hidden = true; }
      onLeave(stop);
      function look(code) {
        code = String(code || "").replace(/\D/g, ""); if (code.length < 8) return toast("Code-barres incomplet.");
        $("#res", r).innerHTML = '<p class="muted">Recherche du produit ' + esc(code) + '…</p>';
        fetch("https://world.openfoodfacts.org/api/v2/product/" + code + ".json?fields=product_name,brands,labels_tags").then(function (x) { return x.json(); }).then(function (j) {
          if (!j || j.status !== 1 || !j.product) { $("#res", r).innerHTML = '<div class="card"><strong>Produit introuvable</strong><p class="muted">Le code ' + esc(code) + ' n\'est pas dans Open Food Facts.</p></div>'; return; }
          var p = j.product, h = (p.labels_tags || []).some(function (t) { return /halal/.test(t); });
          $("#res", r).innerHTML = '<div class="card"><strong>' + esc(p.product_name || "Produit sans nom") + '</strong><div class="muted">' + esc(p.brands || "") + ' · ' + esc(code) + '</div><p class="big" style="font-size:1.2rem;margin:.6rem 0 0">' + (h ? "Label halal déclaré" : "Aucun label halal déclaré") + '</p><p class="muted">Source : Open Food Facts, données déclarées par les contributeurs.</p></div>';
        }).catch(function () { $("#res", r).innerHTML = '<p class="callout warn">Connexion nécessaire pour interroger Open Food Facts.</p>'; });
      }
      $("#go", r).onclick = function () { look($("#ean", r).value); };
      $("#cam", r).onclick = function () {
        if (!("BarcodeDetector" in window) || !navigator.mediaDevices) return toast("Lecture par caméra indisponible sur ce navigateur : saisissez le code.");
        var det = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] }), v = $("#vid", r);
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function (s) {
          stream = s; v.srcObject = s; v.hidden = false; v.play();
          timer = setInterval(function () { det.detect(v).then(function (c) { if (c && c.length) { var code = c[0].rawValue; stop(); $("#ean", r).value = code; look(code); } }).catch(function () {}); }, 400);
        }).catch(function () { toast("Accès à la caméra refusé."); });
      };
    } };
  });

  /* ---------------------------------------------------------------- premier lancement, sur le modèle de MAARIFA */
  var obR = { prieres: true, routine: true, verset: true };
  route(/^\/bienvenue$/, function (m, params) {
    var e = Math.max(1, Math.min(10, +params.e || 1)), html, N = 10;
    if (e >= 7 && STORE.profiles.length) e = 10;
    var bar = '<div class="prog"><div class="bar"><i style="width:' + Math.round(e * 100 / N) + '%"></i></div>' + (e > 1 && e < 10 ? '<a class="btn alt small" href="#/bienvenue?e=' + (e === 6 ? 7 : e + 1) + '" id="pass">Passer</a>' : '') + '</div>';
    function slide(t, s, glyph) { return '<div class="obGlyph" aria-hidden="true">' + glyph + '</div><h2>' + t + '</h2><p class="lead">' + s + '</p><p><a class="btn big" href="#/bienvenue?e=' + (e + 1) + '">Suivant</a></p>'; }
    if (e === 1) html = '<p class="muted" style="margin:0">Choisis ta langue</p>' + langChips() + '<div class="obLogo ar" lang="ar" aria-hidden="true">نور</div><h2>Ton compagnon pour apprendre le Coran</h2><p class="lead">Apprends, prie et progresse dans la foi, pas à pas.</p>' +
      '<p><a class="btn big" href="#/bienvenue?e=2">Commencer</a></p><p><button class="btn alt" id="skip">Plus d\'options : passer l\'introduction</button></p>';
    else if (e === 2) html = slide("Construis ta routine", "Quelques minutes par jour : un verset, un dhikr, un hadith et ta lecture du Coran.", "☾");
    else if (e === 3) html = slide("Suivi des prières", "Les horaires selon ton lieu, la qibla, et tes prières marquées chaque jour.", "◎");
    else if (e === 4) html = slide("Apprendre pas à pas", "Des leçons courtes, des quiz et des points, de l\'Étincelle à l\'Étoile.", "✦");
    else if (e === 5) html = '<h2>Dans 21 jours, tu auras :</h2><ul class="proj"><li>Marqué <b>105</b> prières</li><li>Lu <b>105</b> versets du Coran</li><li>Répété <b>21</b> dhikr du jour</li><li>Médité <b>21</b> hadiths</li><li>Gagné jusqu\'à <b>' + (21 * CAP) + '</b> points</li></ul><p class="muted">Si tu suis ta routine chaque jour, avec 5 versets par jour.</p><p><a class="btn big" href="#/bienvenue?e=6">C\'est parti !</a></p>';
    else if (e === 6) html = '<div class="obGlyph" aria-hidden="true">◌</div><h2>Ne manque aucun rendez-vous avec Dieu</h2><div style="text-align:left">' +
      [["prieres", "Heures des prières", "Une alerte pour chaque prière"], ["routine", "Routine quotidienne", "Un rappel pour tes objectifs du jour"], ["verset", "Verset du jour", "Un verset chaque jour"]].map(function (x) {
        return '<label class="tcard"><span><b>' + x[1] + '</b><small>' + x[2] + '</small></span><input type="checkbox" class="sw" data-rp="' + x[0] + '"' + (obR[x[0]] ? " checked" : "") + '></label>';
      }).join("") + '<p class="muted">Sur une application web, les notifications arrivent lorsque NÛR est ouverte ou installée.</p></div><p><button class="btn big" id="go6">Continuer</button></p>';
    else if (e === 7) html = '<h2>Comment devons-nous t\'appeler ?</h2><input type="text" id="pn" maxlength="24" autocomplete="off" placeholder="Prénom" value="' + esc(pf.nom) + '" class="bigin"><p><button class="btn big" id="go7">Continuer</button></p>';
    else if (e === 8) html = '<h2>Qui utilise ce profil ?</h2><div class="who" role="group" aria-label="Qui utilise ce profil">' +
      '<button type="button" data-t="homme" aria-pressed="' + (pf.type === "homme") + '">Homme</button><button type="button" data-t="femme" aria-pressed="' + (pf.type === "femme") + '">Femme</button>' +
      '<button type="button" class="sub" data-t="garcon" aria-pressed="' + (pf.type === "garcon") + '">Enfant (garçon)</button><button type="button" class="sub" data-t="fille" aria-pressed="' + (pf.type === "fille") + '">Enfant (fille)</button></div><p class="muted">Un profil enfant reste sous la responsabilité d\'un adulte.</p><p><button class="btn big" id="go8">Continuer</button></p>';
    else if (e === 9) {
      var kid = pf.type === "garcon" || pf.type === "fille";
      html = '<h2>Indique ton âge</h2><p class="muted">Cela permet de proposer un contenu adapté.</p><input type="number" id="pa" min="7" max="120" inputmode="numeric" placeholder="Âge" value="' + esc(pf.age) + '" class="bigin">' +
        (kid ? '<div class="card" style="text-align:left"><h3>Profil enfant : accord de l\'adulte</h3><p class="muted">Un profil enfant se crée sous la responsabilité d\'un adulte, à partir de 7 ans.</p><label class="chk"><input type="checkbox" id="pok"> Je suis l\'adulte responsable de cet enfant et j\'autorise ce profil.</label>' +
          '<label class="f" for="pc">' + (STORE.pin ? "Code parental" : "Choisir un code parental (4 chiffres)") + '</label><input type="password" id="pc" inputmode="numeric" maxlength="4" pattern="[0-9]*" autocomplete="off"><p class="muted">Ce code sera demandé pour quitter le profil enfant, ouvrir ses réglages et valider ses paliers.</p></div>' : '') +
        '<p><button class="btn big" id="go9">Continuer</button></p>';
    } else html = '<h2>Ton lieu</h2><p>Le lieu sert à calculer les heures de prière et la qibla, partout dans le monde. Il reste sur ton appareil.</p><div style="text-align:left">' + lieuHTML() + '</div><p style="margin-top:1rem"><button class="btn alt" id="later">Plus tard</button></p>';
    return { title: "Bienvenue", html: '<div class="ob">' + bar + html + '</div>', bare: true, tab: null, bind: function (r) {
      var sk = $("#skip", r); if (sk) sk.onclick = finishOb;
      if (typeof bindLang === "function") bindLang(r);
      var ps = $("#pass", r);
      if (ps && e === 9) ps.onclick = function (ev) { ev.preventDefault(); if (pf.type === "garcon" || pf.type === "fille") return toast("Pour un profil enfant, l'âge et l'accord de l'adulte sont nécessaires."); createAndGo(); };
      if (ps && e === 8) ps.onclick = function (ev) { ev.preventDefault(); pf.type = "adulte"; location.hash = "#/bienvenue?e=9"; };
      $$("[data-rp]", r).forEach(function (c) { c.onchange = function () { obR[c.dataset.rp] = c.checked; }; });
      var g6 = $("#go6", r); if (g6) g6.onclick = function () { location.hash = "#/bienvenue?e=7"; if (obR.prieres || obR.routine || obR.verset) askNotif(); };
      var g7 = $("#go7", r); if (g7) g7.onclick = function () { pf.nom = $("#pn", r).value.trim().slice(0, 24); location.hash = "#/bienvenue?e=8"; };
      $$(".who button", r).forEach(function (b) { b.onclick = function () { pf.type = b.dataset.t; $$(".who button", r).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); }; });
      var g8 = $("#go8", r); if (g8) g8.onclick = function () { if (!pf.type) pf.type = "adulte"; location.hash = "#/bienvenue?e=9"; };
      function createAndGo() {
        var kid = pf.type === "garcon" || pf.type === "fille", age = Math.round(+($("#pa", r) && $("#pa", r).value)), pr;
        if (kid) {
          var code = $("#pc", r).value;
          if (!(age >= 7 && age <= 17)) return toast("L'âge d'un enfant doit être compris entre 7 et 17 ans.");
          if (!$("#pok", r).checked) return toast("L'accord de l'adulte responsable est nécessaire.");
          if (!/^\d{4}$/.test(code)) return toast("Le code parental doit comporter 4 chiffres.");
          pr = pinHash(code).then(function (h) { if (STORE.pin && STORE.pin !== h) { toast("Code parental incorrect."); return null; } STORE.pin = h; return addProfile({ nom: pf.nom, type: pf.type, age: age }); });
        } else pr = Promise.resolve(addProfile({ nom: pf.nom, type: pf.type || "adulte", age: age >= 7 ? age : undefined }));
        pr.then(function (id) {
          if (!id) return; switchProfile(id); var s2 = stt(); s2.lang = STORE.lang || "fr";
          s2.rappels = { prieres: !!obR.prieres, routine: !!obR.routine, verset: !!obR.verset }; s2.notif = !!obR.prieres;
          if (kid) s2.prayerTrack = false; save(); location.hash = "#/bienvenue?e=10";
        });
      }
      var g9 = $("#go9", r); if (g9) g9.onclick = createAndGo;
      if (e === 10) {
        if (!STORE.profiles.length) switchProfile(addProfile({ nom: pf.nom, type: "adulte" }));
        bindLieu(r, function () { finishOb(); });
        $("#later", r).onclick = finishOb;
      }
    } };
  });
  /* ================================================================ fin de la structure MAARIFA */
  /* ================================================================ v1.4 : audio, traduction, qibla, lieu mondial, cartes */
  function frOn() { var L = S.settings.layers; return !L || L.fr !== false; }
  function frOf(sn, a, q) {
    var F = OPT && OPT.fr && OPT.fr.suras && OPT.fr.suras[sn], s = q.byN[sn]; if (!F || !s) return null;
    for (var i = 0; i < s.v.length; i++) if (s.v[i][0] === a) return F[i] || "";
    return null;
  }
  function frLine(sn, a, q) {
    if (!frOn()) return "";
    var t = frOf(sn, a, q); if (t === null) return "";
    return t ? '<div class="trfr" lang="fr">' + esc(t) + '</div>' : '<div class="trfr muted">Le sens de ce verset est donné avec le verset suivant.</div>';
  }
  var NOTE_FR = 'Traduction du sens : Muhammad Hamidullah, QuranEnc.com (french_hameedullah v1.0.0), reproduite sans modification.';

  /* ---------------------------------------------------------------- audio verset par verset (Warsh, EveryAyah.com) */
  var RECITERS = [["warsh_ibrahim_aldosary_128kbps", "Ibrahim Al-Dosary"], ["warsh_yassin_al_jazaery_64kbps", "Yassin Al-Jazaery"], ["warsh_Abdul_Basit_128kbps", "Abdul Basit Abdul Samad"]];
  function reciter() { var k = S.settings.reciter, r = RECITERS.filter(function (x) { return x[0] === k; })[0]; return r || RECITERS[0]; }
  var HAFS = null;
  function loadHafs() { if (HAFS) return Promise.resolve(HAFS); return fetch("hafs.json").then(function (r) { return r.json(); }).then(function (j) { HAFS = j.suras; return HAFS; }); }
  function p3(n) { return String(n).padStart(3, "0"); }
  function hafsCover(sn, w) { var A = HAFS[sn] || [], out = []; A.forEach(function (fl, i) { if (fl[0] <= w && w <= fl[1]) out.push(i + 1); }); return out; }
  var PL = { a: null, sn: 0, q: [], i: 0, on: false };
  function plUrl(sn, h) { return "https://everyayah.com/data/warsh/" + reciter()[0] + "/" + p3(sn) + p3(h) + ".mp3"; }
  function plMark() {
    $$(".vcard.playing").forEach(function (e) { e.classList.remove("playing"); });
    var it = PL.q[PL.i]; if (!it || !PL.on) return;
    var el = it[1] === 0 ? document.querySelector(".vcard.bsm") : document.getElementById("v" + it[1]);
    if (el) { el.classList.add("playing"); el.scrollIntoView({ block: "center", behavior: "smooth" }); }
  }
  function plBar() {
    var b = document.getElementById("pbar");
    if (!PL.q.length) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement("div"); b.id = "pbar"; b.className = "pbar"; document.body.appendChild(b); }
    var it = PL.q[PL.i] || PL.q[0];
    b.innerHTML = '<div class="pinfo"><b>' + esc(reciter()[1]) + '</b><span>Sourate ' + PL.sn + (it ? (it[1] ? ', verset ' + it[1] : ', basmala') : '') + '</span></div>' +
      '<button class="ib" id="pprev" aria-label="Verset précédent">⏮</button><button class="ib big" id="pplay" aria-label="' + (PL.on ? "Pause" : "Lecture") + '">' + (PL.on ? "❚❚" : "▶") + '</button><button class="ib" id="pnext" aria-label="Verset suivant">⏭</button><button class="ib" id="pstop" aria-label="Fermer le lecteur">×</button>';
    $("#pprev", b).onclick = function () { plGo(Math.max(0, PL.i - 1)); };
    $("#pnext", b).onclick = function () { plGo(Math.min(PL.q.length - 1, PL.i + 1)); };
    $("#pplay", b).onclick = function () { if (PL.on) { PL.a.pause(); PL.on = false; plBar(); plMark(); } else plGo(PL.i); };
    $("#pstop", b).onclick = plStop;
  }
  function plGo(i) {
    PL.i = i; var it = PL.q[i]; if (!it) return plStop();
    if (!PL.a) { PL.a = new Audio(); PL.a.onended = function () { if (PL.i + 1 < PL.q.length) plGo(PL.i + 1); else { PL.on = false; plBar(); plMark(); } }; PL.a.onerror = function () { toast("Récitation indisponible : vérifiez la connexion."); PL.on = false; plBar(); }; }
    PL.a.src = plUrl(PL.sn, it[0]); PL.a.playbackRate = S.settings.speed || 1;
    PL.a.play().then(function () { PL.on = true; plBar(); plMark(); }).catch(function () { PL.on = false; plBar(); });
  }
  function plStop() { if (PL.a) PL.a.pause(); PL.on = false; PL.q = []; plBar(); plMark(); }
  function playVerse(sn, w) { return loadHafs().then(function () { PL.sn = sn; PL.q = (w === 0 ? [1] : hafsCover(sn, w)).map(function (h) { return [h, w]; }); plGo(0); }); }
  function playFrom(sn, w) {
    return loadHafs().then(function () {
      var A = HAFS[sn] || []; PL.sn = sn; PL.q = [];
      A.forEach(function (fl, i) { if (fl[0] >= w || (fl[1] >= w && fl[0] < w)) PL.q.push([i + 1, Math.max(fl[0], w)]); });
      plGo(0);
    });
  }

  /* ---------------------------------------------------------------- hadiths sur la prière (vérifiés sur sunnah.com le 18 novembre 2026) */
  var HADP = {
    fajr: ["Les deux rakʿa de l'aube valent mieux que ce monde et tout ce qu'il contient.", "ʿÂʾicha", "Ṣaḥîḥ Muslim, n° 725a"],
    dhuhr: ["Si les gens savaient la récompense de la prière du Dhuhr accomplie au début de son temps, ils s'y précipiteraient.", "Abû Hurayra", "Ṣaḥîḥ al-Boukhârî, n° 615 (extrait)"],
    asr: ["Celui qui manque la prière du ʿAsr, c'est comme s'il avait perdu sa famille et ses biens.", "Ibn ʿOmar", "Ṣaḥîḥ al-Boukhârî, n° 552"],
    maghrib: ["Ma communauté restera dans le bien tant qu'elle ne retardera pas la prière du Maghrib jusqu'à ce que les étoiles apparaissent en nombre.", "Abû Ayyoûb", "Sunan Abî Dâwoud, n° 418, jugé ḥasan ṣaḥîḥ par al-Albânî"],
    isha: ["Celui qui accomplit la prière du ʿIshâʾ en groupe, c'est comme s'il avait prié la moitié de la nuit ; et celui qui accomplit la prière de l'aube en groupe, c'est comme s'il avait prié toute la nuit.", "ʿOthmân ibn ʿAffân", "Ṣaḥîḥ Muslim, n° 656a"],
    tous: ["Les cinq prières sont comme une rivière à la porte de l'un de vous, où il se laverait cinq fois par jour : il ne lui resterait aucune saleté. Ainsi Dieu efface par elles les fautes.", "Abû Hurayra", "Ṣaḥîḥ al-Boukhârî, n° 528"]
  };
  function hadithCard(h) { return '<div class="card hadp"><blockquote class="hq">' + esc(h[0]) + '</blockquote><p class="muted" style="margin:0">Sens rapporté par ' + esc(h[1]) + '. ' + esc(h[2]) + '.</p></div>'; }

  /* ---------------------------------------------------------------- lieu : recherche mondiale, GPS précis, mise à jour automatique */
  function geoSearch(qs) {
    return fetch("https://geocoding-api.open-meteo.com/v1/search?count=8&language=fr&format=json&name=" + encodeURIComponent(qs)).then(function (r) { return r.json(); }).then(function (j) {
      return (j.results || []).map(function (x) { return { name: x.name + (x.admin1 && x.admin1 !== x.name ? ", " + x.admin1 : "") + (x.country ? ", " + x.country : ""), lat: +x.latitude.toFixed(4), lng: +x.longitude.toFixed(4), tz: x.timezone || "UTC" }; });
    });
  }
  function revGeo(lat, lng) {
    return fetch("https://nominatim.openstreetmap.org/reverse?format=json&zoom=12&accept-language=fr&lat=" + lat + "&lon=" + lng).then(function (r) { return r.json(); }).then(function (j) {
      var a = j.address || {}; return [a.city || a.town || a.village || a.municipality || a.suburb || a.county, a.country].filter(Boolean).join(", ");
    }).catch(function () { return ""; });
  }
  function distKm(a, b) { var R = 6371, t = Math.PI / 180, dl = (b.lat - a.lat) * t, dg = (b.lng - a.lng) * t, x = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dg / 2) * Math.sin(dg / 2); return 2 * R * Math.asin(Math.sqrt(x)); }
  function gpsLocate(silent) {
    return new Promise(function (res) {
      if (!navigator.geolocation) { if (!silent) toast("Géolocalisation indisponible sur cet appareil."); return res(null); }
      navigator.geolocation.getCurrentPosition(function (p) {
        var l = { name: "Ma position", lat: +p.coords.latitude.toFixed(4), lng: +p.coords.longitude.toFixed(4), tz: Intl.DateTimeFormat().resolvedOptions().timeZone, gps: true, acc: Math.round(p.coords.accuracy) };
        revGeo(l.lat, l.lng).then(function (n) { if (n) l.name = n; res(l); });
      }, function () { if (!silent) toast("Position refusée ou indisponible."); res(null); }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 300000 });
    });
  }
  function autoLocate() {
    if (!STORE.active || !S.settings.autoLoc || !navigator.geolocation) return;
    var go = function () { gpsLocate(true).then(function (l) { if (!l) return; var cur = S.settings.loc; if (!cur || distKm(cur, l) > 3) { S.settings.loc = l; save(); scheduleNotifs(); toast("Lieu mis à jour : " + l.name); render(); } }); };
    if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: "geolocation" }).then(function (st) { if (st.state === "granted") go(); }).catch(function () {});
  }
  function lieuHTML() {
    var L = loc(), st = S.settings;
    return '<div class="card"><p style="margin-top:0"><strong>' + esc(L.name) + '</strong><br><span class="muted">' + L.lat.toFixed(4) + ', ' + L.lng.toFixed(4) + ' · ' + esc(L.tz) + (L.acc ? ' · précision ' + L.acc + ' m' : '') + '</span></p>' +
      '<label class="tcard"><span><b>Localisation automatique</b><small>NÛR suit votre position à chaque ouverture, dans n\'importe quelle ville du monde.</small></span><input type="checkbox" class="sw" id="autol"' + (st.autoLoc ? " checked" : "") + '></label>' +
      '<p class="row" style="margin:0"><button class="btn" id="gps">Me localiser maintenant</button></p>' +
      '<label class="f" for="gq">Rechercher une ville, partout dans le monde</label><div class="row" style="margin:0"><input type="search" id="gq" placeholder="Ex. Dzaoudzi, Dakar, Lyon" style="flex:1"><button class="btn alt" id="gqb">Rechercher</button></div><ul class="list" id="gres"></ul></div>';
  }
  function bindLieu(r, done) {
    var st = S.settings;
    function set(l) { st.loc = l; save(); scheduleNotifs(); toast("Lieu enregistré : " + l.name); if (done) done(l); else render(); }
    $("#autol", r).onchange = function (e) { st.autoLoc = e.target.checked; save(); if (st.autoLoc) gpsLocate(false).then(function (l) { if (l) set(l); }); };
    $("#gps", r).onclick = function () { gpsLocate(false).then(function (l) { if (l) { st.autoLoc = true; set(l); } }); };
    function search() {
      var v = $("#gq", r).value.trim(); if (v.length < 2) return;
      $("#gres", r).innerHTML = '<li class="muted">Recherche…</li>';
      geoSearch(v).then(function (L2) {
        $("#gres", r).innerHTML = L2.length ? L2.map(function (l, i) { return '<li><a href="#" data-gi="' + i + '"><span class="nm">' + esc(l.name) + '<small>' + esc(l.tz) + '</small></span></a></li>'; }).join("") : '<li class="muted">Aucune ville trouvée.</li>';
        $$("[data-gi]", r).forEach(function (a) { a.onclick = function (ev) { ev.preventDefault(); st.autoLoc = false; set(L2[+a.dataset.gi]); }; });
      }).catch(function () { $("#gres", r).innerHTML = '<li class="callout warn">Connexion nécessaire pour la recherche.</li>'; });
    }
    $("#gqb", r).onclick = search; $("#gq", r).onkeydown = function (e) { if (e.key === "Enter") search(); };
  }

  /* ---------------------------------------------------------------- qibla : direction, soleil, boussole */
  function cardinal(b) { var N = ["nord", "nord-nord-est", "nord-est", "est-nord-est", "est", "est-sud-est", "sud-est", "sud-sud-est", "sud", "sud-sud-ouest", "sud-ouest", "ouest-sud-ouest", "ouest", "ouest-nord-ouest", "nord-ouest", "nord-nord-ouest"]; return N[Math.round(((b % 360) + 360) % 360 / 22.5) % 16]; }
  function versC(b) { var c = cardinal(b); return (/^[eo]/.test(c) ? "l'" : "le ") + c; }
  function sunAzEl(lat, lng, t) {
    var jd = t / 864e5 + 2440587.5, sp = P.sunPosition(jd), R = Math.PI / 180;
    var d = new Date(t), utcMin = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
    var H = ((utcMin + sp.eqt * 60 + 4 * lng) / 4 - 180) * R, la = lat * R, de = sp.decl * R;
    var el = Math.asin(Math.sin(la) * Math.sin(de) + Math.cos(la) * Math.cos(de) * Math.cos(H));
    var az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(la) - Math.tan(de) * Math.cos(la)) / R + 180;
    return { az: (az + 360) % 360, el: el / R };
  }

  /* ---------------------------------------------------------------- cartes de vœux : rendu partagé */
  function drawCard(cv, c, msg, sg) {
    var x = cv.getContext("2d");
    function wrap(t, maxW) { var w = t.split(" "), L = [], cur = ""; w.forEach(function (s) { var tt = cur ? cur + " " + s : s; if (x.measureText(tt).width > maxW && cur) { L.push(cur); cur = s; } else cur = tt; }); if (cur) L.push(cur); return L; }
    x.fillStyle = "#0F4C3A"; x.fillRect(0, 0, 1080, 1080);
    x.strokeStyle = "#C9A24B"; x.lineWidth = 6; x.strokeRect(50, 50, 980, 980); x.lineWidth = 2; x.strokeRect(74, 74, 932, 932);
    x.save(); x.translate(540, 210); x.rotate(Math.PI / 4); x.strokeStyle = "#C9A24B"; x.lineWidth = 4; x.strokeRect(-40, -40, 80, 80); x.restore();
    x.save(); x.translate(540, 210); x.strokeStyle = "#C9A24B"; x.lineWidth = 4; x.strokeRect(-40, -40, 80, 80); x.restore();
    x.fillStyle = "#F5F0E1"; x.textAlign = "center"; x.direction = "rtl"; x.font = "120px 'Amiri', 'Traditional Arabic', serif"; x.fillText(c[1], 540, 470); x.direction = "ltr";
    x.fillStyle = "#C9A24B"; x.font = "600 64px Georgia, serif"; x.fillText(c[0], 540, 590);
    x.fillStyle = "#F5F0E1"; x.font = "44px Georgia, serif"; wrap(msg || "", 820).slice(0, 4).forEach(function (l, i) { x.fillText(l, 540, 700 + i * 60); });
    if (sg) { x.font = "italic 40px Georgia, serif"; x.fillText(sg, 540, 960); }
    x.fillStyle = "rgba(245,240,225,.6)"; x.font = "28px Georgia, serif"; x.fillText("NÛR", 540, 1010);
  }
  function cardLink(f, m, s) { return location.origin + location.pathname + "#/carte?f=" + f + "&m=" + encodeURIComponent(m || "") + "&s=" + encodeURIComponent(s || ""); }
  route(/^\/carte$/, function (m, params) {
    var f = Math.max(0, Math.min(CARTES.length - 1, +params.f || 0)), msg = (params.m || "").slice(0, 160), sg = (params.s || "").slice(0, 40);
    var html = '<h2>Une carte pour vous</h2><canvas id="cvs" width="1080" height="1080" class="cardprev" aria-label="' + esc(CARTES[f][0] + (msg ? ". " + msg : "")) + '"></canvas>' +
      '<p class="row"><a class="btn" href="#/cartes">Créer ma carte</a><a class="btn alt" href="#/">Découvrir NÛR</a></p>';
    return { title: "Carte de vœux", html: html, back: STORE.onboarded ? "#/plus" : null, tab: STORE.onboarded ? "#/plus" : null, bare: !STORE.onboarded, bind: function (r) { drawCard($("#cvs", r), CARTES[f], msg, sg); } };
  });
  /* ================================================================ fin v1.4 */
  /* ================================================================ v1.5 : langue de l'interface (fr, en-US, en-GB, zh, ar) */
  var LANGS = [["fr", "Français"], ["en-US", "English (US)"], ["en-GB", "English (UK)"], ["zh", "中文"], ["ar", "العربية"]];
  function LANG() { return (STORE.active && S.settings.lang) || STORE.lang || "fr"; }
  function LK() { var l = LANG(); return l.indexOf("en") === 0 ? "en" : l; }
  function UIL() { var l = LANG(); return l === "fr" ? "fr-FR" : l === "zh" ? "zh-CN" : l === "ar" ? "ar" : l; }
  function TRF() { var k = LK(); return k === "en" ? "traduction-en.json" : k === "zh" ? "traduction-zh.json" : k === "ar" ? "tafsir-ar.json" : "traduction-fr.json"; }
  function noteFr() { var f = OPT && OPT.fr; return f ? (LK() === "ar" ? "التفسير : " : LK() === "fr" ? "Traduction du sens : " : LK() === "zh" ? "译文：" : "Translation: ") + f.source + "." : ""; }
  function setLang(l) { if (STORE.active) S.settings.lang = l; STORE.lang = l; OPT = null; save(); applyLang(); }
  function applyLang() { var k = LK(); document.documentElement.lang = k === "zh" ? "zh-CN" : LANG(); document.documentElement.dir = k === "ar" ? "rtl" : "ltr"; }
  var D = [
    ["Apprendre", "Learn", "学习", "تعلّم"], ["Prière", "Prayer", "礼拜", "الصلاة"], ["Quotidien", "Daily", "每日", "يومي"], ["Coran", "Quran", "古兰经", "القرآن"], ["Plus", "More", "更多", "المزيد"],
    ["Le Saint Coran", "The Holy Quran", "尊贵的古兰经", "القرآن الكريم"], ["Plus de fonctionnalités", "More features", "更多功能", "مزيد من الميزات"], ["Profil", "Profile", "个人资料", "الملف الشخصي"], ["Bienvenue", "Welcome", "欢迎", "مرحبًا"],
    ["La prochaine prière est", "The next prayer is", "下一次礼拜是", "الصلاة القادمة هي"], ["Imsak", "Imsak", "斋戒开始", "الإمساك"], ["Chourouq", "Sunrise", "日出", "الشروق"], ["Iftar", "Iftar", "开斋", "الإفطار"],
    ["Horaires de prière", "Prayer times", "礼拜时间", "مواقيت الصلاة"], ["Explorer NÛR", "Explore NÛR", "探索 NÛR", "استكشف نور"], ["Rapproche-toi de Dieu, pas à pas", "Draw closer to God, step by step", "一步一步接近真主", "تقرّب إلى الله خطوة بخطوة"],
    ["Cours / Quiz", "Lessons / Quiz", "课程 / 测验", "دروس / اختبار"], ["Tafsir", "Tafsir", "经注", "التفسير"], ["Khatm Coran", "Quran khatm", "通读古兰经", "ختم القرآن"], ["Lancer", "Open", "进入", "افتح"],
    ["Objectifs du jour", "Today's goals", "今日目标", "أهداف اليوم"], ["Quelques minutes pour te rapprocher de Dieu", "A few minutes to draw closer to God", "几分钟，接近真主", "دقائق قليلة للتقرّب إلى الله"],
    ["Réfléchis sur ton verset du jour", "Reflect on your verse of the day", "思考今日经文", "تدبّر آية اليوم"], ["Souviens-toi de Dieu avec le dhikr", "Remember God with dhikr", "以记主纪念真主", "اذكر الله بالذكر"],
    ["Médite sur un hadith", "Meditate on a hadith", "沉思一段圣训", "تأمّل حديثًا"], ["Lis ta dose quotidienne de Coran", "Read your daily portion of the Quran", "诵读每日古兰经", "اقرأ وِردك اليومي من القرآن"],
    ["Commencer", "Start", "开始", "ابدأ"], ["Continuer", "Continue", "继续", "متابعة"], ["Personnaliser", "Customize", "自定义", "تخصيص"], ["Voir mon bilan", "See my summary", "查看总结", "عرض الحصيلة"],
    ["Fil d'actualités", "News feed", "动态", "آخر الأخبار"], ["Cartes de vœux", "Greeting cards", "贺卡", "بطاقات التهنئة"], ["Envoie une carte à tes proches, par WhatsApp ou par lien.", "Send a card to your loved ones, by WhatsApp or by link.", "通过 WhatsApp 或链接给亲人发送贺卡。", "أرسل بطاقة إلى أحبّائك عبر واتساب أو برابط."],
    ["Trouver la qibla", "Find the qibla", "寻找朝向", "تحديد القبلة"], ["Les heures de prière te semblent incorrectes ?", "Do the prayer times seem wrong?", "礼拜时间似乎不对？", "هل تبدو مواقيت الصلاة غير صحيحة؟"], ["Explications", "Explanations", "说明", "توضيحات"],
    ["En savoir plus sur les prières", "Learn more about the prayers", "了解礼拜", "اعرف المزيد عن الصلوات"], ["Fardh (obligatoire)", "Fard (obligatory)", "主命", "الفرض"], ["Sunna (recommandé)", "Sunna (recommended)", "圣行", "السنة"],
    ["Pendant la prière", "During the prayer", "礼拜中", "في الصلاة"], ["Avant la prière", "Before the prayer", "礼拜前", "قبل الصلاة"], ["Après la prière", "After the prayer", "礼拜后", "بعد الصلاة"], ["Avant et après la prière", "Before and after the prayer", "礼拜前后", "قبل الصلاة وبعدها"],
    ["Après le Chafʿ", "After the Shafʿ", "双拜之后", "بعد الشفع"], ["Selon le rite malikite.", "According to the Maliki school.", "依据马立克学派。", "وفق المذهب المالكي."], ["Recommandations à faire après la prière", "Recommended after the prayer", "礼拜后的建议", "ما يُستحب بعد الصلاة"],
    ["Suivre les recommandations", "Follow the recommendations", "遵循建议", "اتّبع التوصيات"], ["Les 30 prochains jours", "The next 30 days", "未来 30 天", "الأيام الثلاثون القادمة"], ["Recommandations", "Recommendations", "建议", "التوصيات"],
    ["Invocations", "Invocations", "祈祷词", "الأذكار"], ["Remettre les compteurs à zéro", "Reset the counters", "计数归零", "تصفير العدّادات"], ["Âyat al-Koursî", "Ayat al-Kursi", "宝座经文", "آية الكرسي"], ["▶ Écouter", "▶ Listen", "▶ 收听", "▶ استمع"],
    ["Ouvrir dans le Coran", "Open in the Quran", "在古兰经中打开", "افتح في المصحف"], ["Toucher", "Tap", "点击", "اضغط"], ["Activer la boussole", "Enable the compass", "启用指南针", "تفعيل البوصلة"], ["Sur ordinateur ou sans boussole", "On a computer or without a compass", "电脑或无指南针时", "على الحاسوب أو بدون بوصلة"],
    ["changer de lieu", "change location", "更改地点", "غيّر الموقع"], ["Calcul des horaires de prière", "Prayer time calculation", "礼拜时间计算", "حساب مواقيت الصلاة"], ["Méthode de calcul", "Calculation method", "计算方法", "طريقة الحساب"], ["Localisation", "Location", "位置", "الموقع"],
    ["Localisation automatique", "Automatic location", "自动定位", "تحديد الموقع تلقائيًا"], ["Me localiser maintenant", "Locate me now", "立即定位", "حدّد موقعي الآن"], ["Rechercher une ville, partout dans le monde", "Search for a city anywhere in the world", "搜索世界任何城市", "ابحث عن مدينة في أي مكان من العالم"],
    ["Rechercher", "Search", "搜索", "بحث"], ["Ma mosquée sur Mawaqit", "My mosque on Mawaqit", "我的清真寺（Mawaqit）", "مسجدي على مواقيت"], ["Enregistrer", "Save", "保存", "حفظ"], ["Ouvrir ma mosquée", "Open my mosque", "打开我的清真寺", "افتح مسجدي"],
    ["Trouver une mosquée", "Find a mosque", "查找清真寺", "ابحث عن مسجد"], ["Tu as un doute sur les horaires ?", "Unsure about the times?", "对时间有疑问？", "هل لديك شك في المواقيت؟"], ["Continuer la lecture", "Continue reading", "继续阅读", "متابعة القراءة"],
    ["Mes signets", "My bookmarks", "我的书签", "علاماتي"], ["Signets", "Bookmarks", "书签", "العلامات"], ["Paramètres", "Settings", "设置", "الإعدادات"], ["Récitateur", "Reciter", "诵读者", "القارئ"], ["Khatm", "Khatm", "通读", "الختم"],
    ["Réinitialiser la progression du khatm", "Reset khatm progress", "重置通读进度", "إعادة ضبط تقدّم الختم"], ["Arabe", "Arabic", "阿拉伯语", "العربية"], ["Phonétique", "Phonetics", "音译", "النطق اللاتيني"], ["Traduction", "Translation", "译文", "التفسير"],
    ["Taille de la police", "Font size", "字体大小", "حجم الخط"], ["Petit", "Small", "小", "صغير"], ["Grand", "Large", "大", "كبير"], ["Français", "Translation", "译文", "التفسير"], ["▶ Écouter la sourate", "▶ Listen to the surah", "▶ 收听本章", "▶ استمع إلى السورة"],
    ["Sourate précédente", "Previous surah", "上一章", "السورة السابقة"], ["Sourate suivante", "Next surah", "下一章", "السورة التالية"], ["Lecture du jour", "Daily reading", "每日诵读", "ورد اليوم"],
    ["Le sens de ce verset est donné avec le verset suivant.", "The meaning of this verse is given with the next verse.", "本节经文的意义与下一节一并给出。", "معنى هذه الآية مذكور مع الآية التالية."],
    ["Marquer comme mémorisé", "Mark as memorized", "标记为已背诵", "تحديد كمحفوظة"], ["Répéter", "Repeat", "重复", "كرّر"], ["Je souhaite étudier…", "I want to study…", "我想学习……", "أريد أن أتعلّم…"], ["Pour continuer", "To continue", "继续学习", "للمتابعة"],
    ["Tout afficher", "Show all", "全部显示", "عرض الكل"], ["Lire et réciter", "Read and recite", "阅读与诵读", "القراءة والتلاوة"], ["Alphabet et lecture", "Alphabet and reading", "字母与阅读", "الحروف والقراءة"], ["Tajwid", "Tajwid", "诵读规则", "التجويد"],
    ["Repères de mémorisation", "Memorization milestones", "背诵进度", "مراحل الحفظ"], ["Les règles de la récitation", "The rules of recitation", "诵读规则", "أحكام التلاوة"], ["Sourate par sourate", "Surah by surah", "逐章", "سورة سورة"],
    ["Les lettres, les voyelles, la phonétique", "Letters, vowels, phonetics", "字母、元音、音译", "الحروف والحركات والنطق"], ["Tafsir (exégèse du Coran)", "Tafsir (Quran exegesis)", "经注（古兰经注释）", "التفسير"], ["Les dhikr", "Dhikr", "记主词", "الأذكار"],
    ["Scanner halal", "Halal scanner", "清真扫描", "ماسح الحلال"], ["Événements à venir", "Upcoming events", "即将到来的节日", "المناسبات القادمة"], ["Mon parcours et mes points", "My path and points", "我的学习路径与积分", "مساري ونقاطي"],
    ["Ma lecture complète du Coran", "My complete Quran reading", "我的古兰经通读", "ختمتي للقرآن"], ["Méditer", "Meditate", "沉思", "تدبّر"], ["Aimer", "Love", "爱", "المحبّة"], ["Espace enfant", "Children's area", "儿童空间", "ركن الأطفال"],
    ["Profil et paramètres", "Profile and settings", "个人资料与设置", "الملف والإعدادات"], ["Le rappel profite au croyant", "The reminder benefits the believer", "提醒有益于信士", "الذكرى تنفع المؤمنين"], ["Partager à un proche", "Share with a loved one", "分享给亲人", "شاركه مع قريب"],
    ["Mes points", "My points", "我的积分", "نقاطي"], ["Langue", "Language", "语言", "اللغة"], ["Profils de l'appareil", "Device profiles", "设备上的个人资料", "ملفات الجهاز"], ["Tous les réglages", "All settings", "全部设置", "كل الإعدادات"], ["À propos", "About", "关于", "حول"],
    ["Partager NÛR", "Share NÛR", "分享 NÛR", "شارك نور"], ["Nous contacter", "Contact us", "联系我们", "اتصل بنا"], ["en construction", "under construction", "建设中", "قيد الإنشاء"], ["Conditions d'utilisation", "Terms of use", "使用条款", "شروط الاستخدام"],
    ["Politique de confidentialité", "Privacy policy", "隐私政策", "سياسة الخصوصية"], ["Sources et licences", "Sources and licences", "来源与许可", "المصادر والتراخيص"], ["Supprimer mes données", "Delete my data", "删除我的数据", "حذف بياناتي"], ["Copier", "Copy", "复制", "نسخ"],
    ["Personnalisation de la routine", "Customize the routine", "自定义日常", "تخصيص الروتين"], ["Verset du jour", "Verse of the day", "今日经文", "آية اليوم"], ["Hadith du jour", "Hadith of the day", "今日圣训", "حديث اليوم"], ["Dhikr du jour", "Dhikr of the day", "今日记主", "ذكر اليوم"],
    ["Lecture du Coran (khatm)", "Quran reading (khatm)", "诵读古兰经（通读）", "قراءة القرآن (الختم)"], ["Versets par jour", "Verses per day", "每日经文数", "آيات في اليوم"], ["Journal religieux", "Religious journal", "宗教日记", "اليوميات الإيمانية"], ["Quiz", "Quiz", "测验", "اختبار"],
    ["Rappel de la routine", "Routine reminder", "日常提醒", "تذكير الروتين"], ["actif", "active", "已启用", "مفعّل"], ["Ton compagnon pour apprendre le Coran", "Your companion for learning the Quran", "学习古兰经的伙伴", "رفيقك لتعلّم القرآن"],
    ["Apprends, prie et progresse dans la foi, pas à pas.", "Learn, pray and grow in faith, step by step.", "学习、礼拜，在信仰中一步步成长。", "تعلّم، وصلِّ، وتقدّم في الإيمان خطوة بخطوة."], ["Plus d'options : passer l'introduction", "More options: skip the introduction", "更多选项：跳过介绍", "خيارات أخرى: تخطَّ المقدمة"],
    ["Passer", "Skip", "跳过", "تخطَّ"], ["Suivant", "Next", "下一步", "التالي"], ["Construis ta routine", "Build your routine", "建立你的日常", "ابنِ روتينك"], ["Suivi des prières", "Prayer tracking", "礼拜记录", "متابعة الصلوات"], ["Apprendre pas à pas", "Learn step by step", "循序渐进地学习", "تعلّم خطوة بخطوة"],
    ["Quelques minutes par jour : un verset, un dhikr, un hadith et ta lecture du Coran.", "A few minutes a day: a verse, a dhikr, a hadith and your Quran reading.", "每天几分钟：一节经文、一句记主词、一段圣训和你的古兰经诵读。", "دقائق كل يوم: آية وذكر وحديث وورد من القرآن."],
    ["Les horaires selon ton lieu, la qibla, et tes prières marquées chaque jour.", "Prayer times for your location, the qibla, and your prayers marked every day.", "依据你所在地的礼拜时间、朝向，以及每天的礼拜记录。", "مواقيت مدينتك، والقبلة، وتسجيل صلواتك كل يوم."],
    ["Des leçons courtes, des quiz et des points, de l'Étincelle à l'Étoile.", "Short lessons, quizzes and points, from Spark to Star.", "简短的课程、测验和积分，从火花到星辰。", "دروس قصيرة واختبارات ونقاط، من الشرارة إلى النجمة."],
    ["Dans 21 jours, tu auras :", "In 21 days, you will have:", "21 天后，你将：", "بعد 21 يومًا ستكون قد:"], ["C'est parti !", "Let's go!", "出发！", "هيا بنا!"], ["Ne manque aucun rendez-vous avec Dieu", "Never miss a meeting with God", "不错过与真主的每一次约会", "لا تفوّت أي موعد مع الله"],
    ["Heures des prières", "Prayer times", "礼拜时间", "مواقيت الصلاة"], ["Une alerte pour chaque prière", "An alert for each prayer", "每次礼拜提醒", "تنبيه لكل صلاة"], ["Routine quotidienne", "Daily routine", "日常", "الروتين اليومي"],
    ["Un rappel pour tes objectifs du jour", "A reminder for today's goals", "今日目标提醒", "تذكير بأهداف اليوم"], ["Un verset chaque jour", "A verse every day", "每日一节经文", "آية كل يوم"], ["Comment devons-nous t'appeler ?", "What should we call you?", "我们该如何称呼你？", "بماذا نناديك؟"],
    ["Qui utilise ce profil ?", "Who uses this profile?", "谁使用此个人资料？", "من يستخدم هذا الملف؟"], ["Homme", "Man", "男", "رجل"], ["Femme", "Woman", "女", "امرأة"], ["Enfant (garçon)", "Child (boy)", "儿童（男孩）", "طفل (ولد)"], ["Enfant (fille)", "Child (girl)", "儿童（女孩）", "طفلة (بنت)"],
    ["Un profil enfant reste sous la responsabilité d'un adulte.", "A child profile remains under an adult's responsibility.", "儿童资料由成年人负责。", "يبقى ملف الطفل تحت مسؤولية شخص بالغ."], ["Indique ton âge", "Enter your age", "输入你的年龄", "أدخل عمرك"],
    ["Cela permet de proposer un contenu adapté.", "This helps us suggest suitable content.", "以便提供合适的内容。", "يساعدنا ذلك على اقتراح محتوى مناسب."], ["Ton lieu", "Your location", "你的位置", "موقعك"], ["Plus tard", "Later", "稍后", "لاحقًا"], ["Choisis ta langue", "Choose your language", "选择语言", "اختر لغتك"],
    ["Mon parcours", "My path", "我的学习路径", "مساري"], ["Les étapes", "Steps", "步骤", "المراحل"], ["Les paliers", "Levels", "等级", "المستويات"], ["Les leçons", "Lessons", "课程", "الدروس"], ["Le quiz", "The quiz", "测验", "الاختبار"], ["Fiches de révision", "Flashcards", "复习卡片", "بطاقات المراجعة"],
    ["Bilan du jour", "Today's summary", "今日总结", "حصيلة اليوم"], ["Retour à l'accueil", "Back to home", "返回首页", "العودة إلى الرئيسية"], ["Continuer mon parcours", "Continue my path", "继续我的学习路径", "تابع مساري"], ["Suivant ", "Next", "下一步", "التالي"],
    ["Créer ma carte", "Create my card", "制作我的贺卡", "أنشئ بطاقتي"], ["Découvrir NÛR", "Discover NÛR", "了解 NÛR", "اكتشف نور"], ["Envoyer par WhatsApp", "Send by WhatsApp", "通过 WhatsApp 发送", "أرسل عبر واتساب"], ["Copier le lien", "Copy link", "复制链接", "انسخ الرابط"],
    ["Télécharger", "Download", "下载", "تنزيل"], ["Formule", "Greeting", "祝福语", "العبارة"], ["Soutenir NÛR (en construction)", "Support NÛR (under construction)", "支持 NÛR（建设中）", "ادعم نور (قيد الإنشاء)"], ["Une carte pour vous", "A card for you", "给你的贺卡", "بطاقة لك"]
  ];
  var DI = { en: {}, zh: {}, ar: {} };
  D.forEach(function (r) { DI.en[r[0]] = r[1]; DI.zh[r[0]] = r[2]; DI.ar[r[0]] = r[3]; });
  var DP = [
    [/^Assalâmou ʿalaykoum(.*)$/, ["As-salamu alaykum$1", "愿你平安$1", "السلام عليكم$1"]],
    [/^Marque tes prières (\d+) \/ 5$/, ["Mark your prayers $1 / 5", "记录礼拜 $1 / 5", "سجّل صلواتك $1 / 5"]],
    [/^dans (\d+) h (\d+)$/, ["in $1 h $2", "$1 小时 $2 分后", "بعد $1 س $2 د"]],
    [/^(\d+) \/ (\d+) pts$/, ["$1 / $2 pts", "$1 / $2 分", "$1 / $2 نقطة"]],
    [/^(\d+) pts · (.+)$/, ["$1 pts · $2", "$1 分 · $2", "$1 نقطة · $2"]], [/^(\d+) pts$/, ["$1 pts", "$1 分", "$1 نقطة"]],
    [/^Aujourd'hui, (.+)$/, ["Today, $1", "今天，$1", "اليوم، $1"]],
    [/^Hadiths sur la prière du (.+)$/, ["Hadiths on the $1 prayer", "关于$1礼拜的圣训", "أحاديث عن صلاة $1"]],
    [/^Mon parcours : (.+)$/, ["My path: $1", "我的学习路径：$1", "مساري: $1"]],
    [/^(.+) · (\d+) versets · (\d+) lus$/, ["$1 · $2 verses · $3 read", "$1 · $2 节 · 已读 $3", "$1 · $2 آية · قُرئ $3"]],
    [/^: (\d+) \/ (\d+) versets marqués « lu » aujourd'hui ; à (\d+), \+(\d+) points\.$/, [": $1 / $2 verses marked as read today; at $3, +$4 points.", "：今天已标记 $1 / $2 节；满 $3 节得 +$4 分。", ": $1 / $2 آيات مقروءة اليوم؛ عند $3 تحصل على +$4 نقاط."]],
    [/^: validée aujourd'hui \(\+(\d+) points\)\.$/, [": done today (+$1 points).", "：今日已完成（+$1 分）。", ": أُنجز اليوم (+$1 نقاط)."]],
    [/^(.+) \(lieu par défaut\)$/, ["$1 (default location)", "$1（默认地点）", "$1 (الموقع الافتراضي)"]],
    [/^(\d+) points par prière marquée\. Suivi privé, sur cet appareil\.$/, ["$1 points per prayer marked. Private, on this device.", "每记录一次礼拜得 $1 分。仅保存在本设备。", "$1 نقاط لكل صلاة مسجّلة. متابعة خاصة على هذا الجهاز."]],
    [/^C'est l'heure de la prière\.$/, ["It is time for prayer.", "礼拜时间到了。", "حان وقت الصلاة."]],
    [/^Tes objectifs du jour t'attendent\.$/, ["Today's goals are waiting for you.", "今日目标在等你。", "أهداف اليوم في انتظارك."]],
    [/^Ton verset du jour t'attend\.$/, ["Your verse of the day is waiting.", "今日经文在等你。", "آية اليوم في انتظارك."]],
    [/^(\d+) \/ (\d+) versets$/, ["$1 / $2 verses", "$1 / $2 节", "$1 / $2 آية"]], [/^(\d+) \/ 114 sourates$/, ["$1 / 114 surahs", "$1 / 114 章", "$1 / 114 سورة"]]
  ];
  function tr(t) {
    var k = LK(); if (k === "fr" || !t) return t;
    var s = t.trim(); if (!s) return t;
    var hit = DI[k][s];
    if (hit === undefined) for (var i = 0; i < DP.length; i++) { var m = DP[i][0]; if (m.test(s)) { hit = s.replace(m, DP[i][1][k === "en" ? 0 : k === "zh" ? 1 : 2]); break; } }
    return hit === undefined ? t : t.replace(s, hit);
  }
  function i18n(root) {
    if (LK() === "fr" || !root) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, L = [];
    while ((n = w.nextNode())) L.push(n);
    L.forEach(function (x) { var p = x.parentNode; if (p && (p.closest(".mushaf,.ar-line,.ph,.trfr,.lesson,.hq,.fiche p,.nt") )) return; var v = tr(x.nodeValue); if (v !== x.nodeValue) x.nodeValue = v; });
    $$("[aria-label],[placeholder]", root).forEach(function (e) { ["aria-label", "placeholder"].forEach(function (a) { var v = e.getAttribute(a); if (v) { var t2 = tr(v); if (t2 !== v) e.setAttribute(a, t2); } }); });
  }
  function langChips() {
    return '<div class="chipsH langs nt" role="group" aria-label="Langue">' + LANGS.map(function (l) { return '<button class="chip' + (LANG() === l[0] ? " on" : "") + '" data-lang="' + l[0] + '" aria-pressed="' + (LANG() === l[0]) + '">' + l[1] + '</button>'; }).join("") + '</div>';
  }
  function bindLang(r) { $$("[data-lang]", r).forEach(function (b) { b.onclick = function () { setLang(b.dataset.lang); render(); }; }); }
  /* ================================================================ fin v1.5 */




  // Accueil
  function objectifsHTML(d) {
    var n = 0; OBJ.forEach(function (o) { if (d.f[o[0]]) n++; });
    var lab = n === 0 ? "Commencer" : (n < OBJ.length ? "Continuer" : "Revoir mes objectifs");
    return '<div class="card"><div class="row between"><h3 style="margin:0">Objectifs du jour</h3><span class="pill">' + d.p + ' / ' + CAP + ' points</span></div>' +
      '<p class="muted">Quelques minutes par jour, à votre rythme.</p><ol class="steps">' + OBJ.map(function (o, i) {
        return '<li class="' + (d.f[o[0]] ? "done" : "") + '"><a href="#/jour?e=' + (i + 1) + '"><span>' + o[1] + '</span><span class="pt">' + (d.f[o[0]] ? "fait" : "+" + PTS[o[0]]) + '</span></a></li>';
      }).join("") + '</ol><p class="row"><a class="btn" href="#/jour">' + lab + '</a></p>' + weekHTML() + '</div>';
  }
  function parcoursTileHTML(opt) {
    var st = parcoursNow(opt); if (!st) return "";
    var seuil = st.pal.seuil || 0, pct = seuil ? Math.min(100, Math.round(100 * st.pts / seuil)) : 0;
    var line = st.cur ? "Étape " + st.cur.n + " sur " + st.tot + " : " + st.cur.titre : (st.tot ? "Toutes les étapes sont terminées" : (st.pal.etat || ""));
    return '<a class="tile wide" href="#/parcours"><strong>Mon parcours : ' + esc(st.pal.nom) + '</strong><span>' + esc(line) + '</span>' +
      (seuil ? '<div class="bar"><i style="width:' + pct + '%"></i></div><span>' + st.pts + ' / ' + seuil + ' points</span>' : '') + '</a>';
  }
  route(/^\/?$/, function () {
    return loadOpt().then(function (opt) {
      var np = nextPrayer(), L = loc(), p = prof(), d = dayRec(), last = S.last, html = "";
      if (p && p.nom) html += '<p class="salut">Assalâmou ʿalaykoum, ' + esc(p.nom) + '</p>';
      html += '<div class="card"><div class="muted">' + esc(gregStr()) + '</div><div class="big" style="margin:.2rem 0">' + esc(hijriStr()) + '</div>';
      if (np) html += '<p style="margin:.4rem 0 0"><strong>' + np.name + ' à ' + fmtT(np.ts, np.tz) + '</strong> <span class="muted">(dans ' + countdown(np.ts) + ' — ' + esc(L.name) + ')</span></p>';
      html += '<p class="row" style="margin:.6rem 0 0"><a class="btn alt" href="#/prieres">Heures de prière et qibla</a></p></div>';
      var wd = new Intl.DateTimeFormat("en-US", { timeZone: L.tz, weekday: "short" }).format(new Date());
      if (wd === "Fri" && opt.quot && opt.quot.vendredi) html += '<div class="callout">' + esc(opt.quot.vendredi) + '</div>';
      if (S.settings.prayerTrack) {
        var np5 = 0; ORDER.forEach(function (o) { if (d.pr[o[0]]) np5++; });
        html += '<div class="card"><div class="row between"><strong>Mes prières du jour</strong><span class="pill">' + np5 + ' / 5</span></div><div class="chips">' + ORDER.map(function (o) {
          return '<button class="chip' + (d.pr[o[0]] ? " on" : "") + '" data-pr="' + o[0] + '" aria-pressed="' + !!d.pr[o[0]] + '">' + o[1] + '</button>';
        }).join("") + '</div><p class="muted" style="margin:0">Suivi privé, conservé sur cet appareil. ' + PRI + ' points par prière.</p></div>';
      }
      html += objectifsHTML(d) + parcoursTileHTML(opt);
      html += '<div class="grid keep">' +
        '<a class="tile" href="#/apprendre"><strong>Apprendre</strong><span>Parcours, alphabet, tajwid</span></a>' +
        '<a class="tile" href="#/reciter"><strong>Réciter</strong><span>Coran en Warsh ʿan Nâfiʿ</span></a>' +
        '<a class="tile" href="#/mediter"><strong>Méditer</strong><span>Verset du jour, journal</span></a>' +
        '<a class="tile" href="#/aimer"><strong>Aimer</strong><span>Gratitude, invocations, partage</span></a></div>';
      if (last) html += '<p style="margin-top:1rem"><a class="btn alt" href="#/reciter/' + last.s + '?a=' + last.a + '">Reprendre ma lecture</a></p>';
      html += '<p class="muted" style="margin-top:1.2rem">Gratuit, sans publicité, sans traceur. Vos données restent sur votre appareil. <a href="#/plus">Plus d\'options</a>.</p>';
      return { title: "NÛR", html: html, tab: "#/", bind: function (r) {
        $$("[data-pr]", r).forEach(function (b) { b.onclick = function () { togglePrayer(b.dataset.pr); render(); }; });
      } };
    });
  });

  // Plus (menu secondaire)
  route(/^\/plus$/, function () {
    return loadOpt().then(function (opt) {
      var kid = isChild(), don = opt.conf && opt.conf.don_url;
      var html = '<ul class="list">' +
        '<li><a href="#/parcours"><span class="nm">Mon parcours et mes points<small>Paliers, étapes, leçons, quiz</small></span></a></li>' +
        '<li><a href="#/khatm"><span class="nm">Ma lecture complète du Coran<small>Khatm et lecture du jour</small></span></a></li>' +
        '<li><a href="#/prieres"><span class="nm">Heures de prière et qibla</span></a></li>' +
        '<li><a href="#/alphabet"><span class="nm">Alphabet et lecture<small>Pour débuter</small></span></a></li>' +
        '<li><a href="#/niveaux"><span class="nm">Repères de mémorisation</span></a></li>' +
        '<li><a href="#/profils"><span class="nm">Profils<small>Jusqu\'à cinq sur cet appareil, adultes et enfants</small></span></a></li>' +
        (kid ? '' : '<li><a href="#/tidjaniya"><span class="nm">Tidjaniya — compteurs de dhikr<small>Contenus à fournir par votre mouqaddam</small></span></a></li>') +
        '<li><a href="#/enfant"><span class="nm">Espace enfant<small>Sourates courtes, étoiles</small></span></a></li>' +
        '<li><a href="#/reglages"><span class="nm">Réglages</span></a></li>' +
        '<li><a href="#/apropos"><span class="nm">À propos, sources et licences</span></a></li></ul>' +
        (kid ? '' : '<div class="card"><h3>Soutenir NÛR' + (don ? '' : ' (en construction)') + '</h3><p>NÛR est gratuite et le restera. Un don libre, à partir de ' + (opt.conf.don_min_eur || 2) + ' euros, aidera à la faire vivre. Aucun accès ne dépend du don.</p>' +
          (don ? '<p><a class="btn" href="' + esc(don) + '" target="_blank" rel="noopener">Faire un don</a></p>' : '<p class="muted">Le lien de don de l\'association sera ajouté ici dès qu\'il sera ouvert.</p>') + '</div>') +
        '<div id="install" class="card" hidden><p>Installer NÛR sur cet appareil pour l\'utiliser hors ligne.</p><button class="btn" id="doInstall">Installer l\'application</button></div>' +
        '<div class="callout">Sur iPhone ou iPad : ouvrez ce site dans Safari, touchez « Partager », puis « Sur l\'écran d\'accueil ».</div>';
      return { title: "Plus", html: html, back: "#/", bind: function (r) {
        if (deferredPrompt) { $("#install", r).hidden = false; $("#doInstall", r).onclick = function () { deferredPrompt.prompt(); deferredPrompt = null; $("#install", r).hidden = true; }; }
      } };
    });
  });

  // Réciter : liste
  route(/^\/reciter$/, function () {
    return loadQ().then(function (q) {
      var ks = kStats(q);
      var html = '<h2>Réciter</h2><div class="card"><div class="row between"><strong>Ma lecture complète</strong><span class="pill">' + ks.s + ' / 114 sourates</span></div><div class="bar"><i style="width:' + ks.pct + '%"></i></div><p class="muted" style="margin:.5rem 0 .6rem">' + ks.v.toLocaleString("fr-FR") + ' / ' + ks.tot.toLocaleString("fr-FR") + ' versets lus</p><p class="row" style="margin:0"><a class="btn" href="#/jour?k=lecture">Lecture du jour</a><a class="btn alt" href="#/khatm">Détail du khatm</a></p></div><label class="f" for="q">Rechercher une sourate (nom ou numéro)</label><input type="search" id="q" placeholder="Ex. 18, Al-Kahf, الكهف" autocomplete="off">' +
        (S.last ? '<p style="margin-top:.8rem"><a class="btn" href="#/reciter/' + S.last.s + '?a=' + S.last.a + '">Reprendre : ' + esc(q.byN[S.last.s].fr) + ', verset ' + S.last.a + '</a></p>' : '') +
        '<ul class="list" id="sl" style="margin-top:1rem">' + q.suras.map(function (s) {
          return '<li data-k="' + esc((s.n + " " + s.en + " " + s.fr + " " + s.ar).toLowerCase()) + '"><a href="#/reciter/' + s.n + '"><span class="badge">' + s.n + '</span><span class="nm">' + esc(s.fr) + '<small>' + s.v.length + ' versets' + (kRead(s.n).length ? ' · ' + Math.min(kRead(s.n).length, s.v.length) + ' lus' : '') + '</small></span><span class="ar">' + esc(s.ar) + '</span></a></li>';
        }).join("") + '</ul>';
      return { title: "Réciter", html: html, tab: "#/reciter", bind: function (r) {
        $("#q", r).addEventListener("input", function (e) {
          var v = e.target.value.trim().toLowerCase();
          $$("#sl li", r).forEach(function (li) { li.hidden = v && li.dataset.k.indexOf(v) < 0; });
        });
      } };
    });
  });

  // Lecteur (Réciter / Apprendre)
  var readMode = null;
  function readerHTML(s, q, mode, withPh) {
    var mem = S.hifz[s.n] || [], bms = S.bookmarks;
    var out = '<div class="suraHead">' + esc(s.ar) + '</div>';
    out += basmalaHTML(q, s.n);
    out += '<div class="mushaf" id="mush">';
    var lastPage = null;
    s.v.forEach(function (v) {
      if (v[2] !== lastPage) { out += '<span class="pageTag">Page ' + v[2] + '</span>'; lastPage = v[2]; }
      var cls = "v" + (mem.indexOf(v[0]) >= 0 ? " mem" : "") + (bms.indexOf(s.n + ":" + v[0]) >= 0 ? " bm" : "");
      var txt = esc(v[1]);
      if (mode === "premier" || mode === "masque") {
        var words = v[1].split(" "), first = esc(words[0]), rest = esc(words.slice(1).join(" "));
        txt = mode === "premier" ? '<span class="first">' + first + '</span> <span class="hide">' + rest + '</span>' : '<span class="hide">' + txt + '</span>';
      }
      out += '<span class="' + cls + '" role="button" tabindex="0" data-a="' + v[0] + '" aria-label="Verset ' + v[0] + '">' + txt + '</span> ' + (withPh ? '<span class="ph phx" lang="ar-Latn">' + esc(phonOf(OPT, s.n, v[0], q) || "") + '</span>' : '');
    });
    return out + '</div>';
  }

  function layersHTML(opt) {
    var L = S.settings.layers || {};
    return '<div class="row" style="margin:.2rem 0 .6rem">' + arSeulHTML() +
      (opt.audio ? '<label class="f" for="spd" style="margin:0">Vitesse</label><select id="spd" style="max-width:110px">' + [0.75, 1, 1.25].map(function (x) { return '<option value="' + x + '"' + ((S.settings.speed || 1) === x ? " selected" : "") + '>' + x + '×</option>'; }).join("") + '</select>' : "") + '</div>';
  }
  function audioUrl(opt, kind, sn, a) {
    var t = opt.audio && opt.audio[kind]; if (!t) return null;
    var p3 = function (n) { return String(n).padStart(3, "0"); };
    return t.replace("{n3}", p3(sn)).replace("{n}", sn).replace("{a3}", p3(a || 0)).replace("{a}", a || 0);
  }
  function versesHTML(s, q, opt) {
    var ph = opt.phon && opt.phon.suras && opt.phon.suras[s.n], fr = opt.fr && opt.fr.suras && opt.fr.suras[s.n], L = S.settings.layers || {};
    var mem = S.hifz[s.n] || [], out = '';
    out += basmalaHTML(q, s.n);
    if (opt.audio && audioUrl(opt, "sura", s.n)) out += '<p><button class="btn" id="playS">Écouter la sourate</button> <button class="btn alt" id="stopA">Arrêter</button></p>';
    var pg0 = null;
    s.v.forEach(function (v, i) {
      var isMem = mem.indexOf(v[0]) >= 0, isBm = S.bookmarks.indexOf(s.n + ":" + v[0]) >= 0, isRead = kRead(s.n).indexOf(v[0]) >= 0;
      if (v[2] !== pg0) { out += '<span class="pageTag">Page ' + v[2] + ' du moushaf</span>'; pg0 = v[2]; }
      out += '<article class="vcard' + (isMem ? " done" : "") + (isRead ? " lu" : "") + '" data-a="' + v[0] + '"><div class="row between"><span class="badge">' + v[0] + '</span>' + (isRead ? '<span class="pill">lu</span>' : '') + '</div>' +
        '<div class="ar-line mushaf" lang="ar" dir="rtl">' + esc(v[1]) + '</div>';
      out += phonLine(s.n, v[0], q);
      if (L.fr && fr && fr[i]) out += '<div class="trfr">' + esc(fr[i]) + '</div>';
      out += '<div class="row">' + (opt.audio && audioUrl(opt, "verse", s.n, v[0]) ? '<button class="btn alt" data-play="' + v[0] + '">Écouter</button>' : '') +
        '<button class="btn alt" data-rep="' + v[0] + '">Répéter <span class="rc">0</span>/3</button>' +
        '<button class="btn alt" data-read="' + v[0] + '" aria-pressed="' + isRead + '">' + (isRead ? "Lu ✓" : "Marquer lu") + '</button>' +
        '<button class="btn alt" data-mem="' + v[0] + '" aria-pressed="' + isMem + '">' + (isMem ? "Mémorisé" : "Marquer mémorisé") + '</button>' +
        '<button class="btn alt" data-bm="' + v[0] + '" aria-pressed="' + isBm + '">' + (isBm ? "Signet posé" : "Signet") + '</button></div></article>';
    });
    return out;
  }
  var curAudio = null;
  function bindVerses(r, s, opt) {
    var lp = $("#lp", r), lt = $("#lt", r), spd = $("#spd", r);
    bindArSeul(r);
    if (lt) lt.onchange = function () { S.settings.layers.fr = lt.checked; save(); render(); };
    if (spd) spd.onchange = function () { S.settings.speed = +spd.value; save(); if (curAudio) curAudio.playbackRate = S.settings.speed; };
    function play(url) {
      if (curAudio) { curAudio.pause(); }
      curAudio = new Audio(url); curAudio.playbackRate = S.settings.speed || 1;
      curAudio.play().catch(function () { toast("Lecture audio impossible (connexion ou fichier indisponible)."); });
    }
    onLeave(function () { if (curAudio) { curAudio.pause(); curAudio = null; } });
    var ps = $("#playS", r); if (ps) ps.onclick = function () { play(audioUrl(opt, "sura", s.n)); };
    var sa = $("#stopA", r); if (sa) sa.onclick = function () { if (curAudio) curAudio.pause(); };
    $$("[data-play]", r).forEach(function (b) { b.onclick = function () { play(audioUrl(opt, "verse", s.n, +b.dataset.play)); }; });
    $$("[data-rep]", r).forEach(function (b) { b.onclick = function () {
      var rc = $(".rc", b), n = (+rc.textContent + 1); rc.textContent = n > 3 ? 1 : n; if (n === 3) toast("Bien : verset répété trois fois."); S.last = { s: s.n, a: +b.dataset.rep }; save();
    }; });
    $$("[data-mem]", r).forEach(function (b) { b.onclick = function () {
      var a = +b.dataset.mem, m = S.hifz[s.n] || [], i = m.indexOf(a); if (i >= 0) m.splice(i, 1); else m.push(a); S.hifz[s.n] = m; save(); render();
    }; });
    $$("[data-read]", r).forEach(function (b) { b.onclick = function () { kMark(s.n, +b.dataset.read); S.last = { s: s.n, a: +b.dataset.read }; save(); creditReading(); render(); }; });
    $$("[data-bm]", r).forEach(function (b) { b.onclick = function () {
      var k = s.n + ":" + b.dataset.bm, i = S.bookmarks.indexOf(k); if (i >= 0) S.bookmarks.splice(i, 1); else S.bookmarks.push(k); save(); render();
    }; });
  }
  function readerView(sn, params, kid) {
    return Promise.all([loadQ(), loadOpt()]).then(function (res) {
      var q = res[0], opt = res[1];
      var s = q.byN[sn]; if (!s) return { title: "Introuvable", html: '<p>Sourate introuvable.</p>', back: "#/reciter" };
      var mode = kid ? "lecture" : (readMode || (phonOn() || s.v.length <= 30 ? "verset" : "lecture"));
      var mem = (S.hifz[sn] || []).length;
      var html = '<div class="row between"><h2 style="margin:0">' + esc(surahLabel(s)) + '</h2><span class="pill">' + s.v.length + ' versets</span></div>';
      if (!kid) {
        var nLus = Math.min(kRead(sn).length, s.v.length);
        html += '<div class="modeRow"><select id="mode" aria-label="Mode de lecture">' +
          '<option value="verset"' + (mode === "verset" ? " selected" : "") + '>Verset par verset</option>' +
          '<option value="lecture"' + (mode === "lecture" ? " selected" : "") + '>Lecture continue</option>' +
          '<option value="premier"' + (mode === "premier" ? " selected" : "") + '>Réciter : premier mot visible</option>' +
          '<option value="masque"' + (mode === "masque" ? " selected" : "") + '>Réciter : texte masqué</option></select>' +
          '<button class="btn alt" id="fm" aria-label="Réduire la taille du texte">A−</button><button class="btn alt" id="fp" aria-label="Augmenter la taille du texte">A+</button></div>' +
          (mode === "verset" ? layersHTML(opt) : (mode === "lecture" ? arSeulHTML() : '<p class="muted">Mode récitation : la phonétique est masquée avec le texte ; touchez un verset pour le révéler.</p>')) +
          '<div class="card prog2"><div class="row between"><span><strong>' + nLus + ' / ' + s.v.length + '</strong> versets lus · <strong>' + mem + ' / ' + s.v.length + '</strong> mémorisés</span></div>' +
          '<div class="bar"><i style="width:' + Math.round(100 * nLus / s.v.length) + '%"></i></div>' + readingLine() +
          '<p style="margin:.6rem 0 0"><button class="btn alt" id="readAll">' + (nLus >= s.v.length ? "Marquer la sourate non lue" : "Marquer toute la sourate comme lue") + '</button></p></div>';
      } else html += '<p class="muted">Touchez un verset après l\'avoir répété pour gagner une étoile.</p>' + arSeulHTML();
      html += (mode === "verset" && !kid ? versesHTML(s, q, opt) : readerHTML(s, q, mode, phonOn() && (kid || mode === "lecture"))) + '<div id="sheetBox"></div>';
      if (!kid) {
        html += '<div class="row between" style="margin-top:1rem">' + (sn > 1 ? '<a class="btn alt" href="#/reciter/' + (sn - 1) + '">Sourate précédente</a>' : '<span></span>') +
          (sn < 114 ? '<a class="btn alt" href="#/reciter/' + (sn + 1) + '">Sourate suivante</a>' : '<span></span>') + '</div>';
        html += '<p class="muted">Texte : complexe du Roi Fahd (KFGQPC), riwaya de Warsh ʿan Nâfiʿ. ' + NOTE_PHON + ' Traduction française et récitations audio : à venir.</p>';
      }
      return { title: s.fr, html: html, back: kid ? "#/enfant" : "#/reciter", tab: kid ? null : "#/reciter", kid: kid, bind: function (r) {
        var sel = null; bindArSeul(r);
        if (!kid) {
          $("#mode", r).onchange = function (e) { readMode = e.target.value; render(); };
          $("#fm", r).onclick = function () { S.settings.fs = Math.max(.8, +(S.settings.fs - .1).toFixed(1)); save(); applyTheme(); };
          $("#fp", r).onclick = function () { S.settings.fs = Math.min(1.8, +(S.settings.fs + .1).toFixed(1)); save(); applyTheme(); };
          $("#readAll", r).onclick = function () { var all = kRead(sn).length >= s.v.length; s.v.forEach(function (v) { kMark(sn, v[0], !all); }); save(); creditReading(); render(); };
        }
        if (kid) { document.body.classList.add("kid"); onLeave(function () { document.body.classList.remove("kid"); }); }
        if (mode === "verset" && !kid) bindVerses(r, s, opt);
        var startA = params && +params.a;
        function pick(el) {
          var a = +el.dataset.a;
          if (sel) sel.classList.remove("sel");
          sel = el; el.classList.add("sel");
          if (!kid) { S.last = { s: sn, a: a }; save(); }
          $$(".hide", el).forEach(function (h) { h.classList.toggle("first"); });
          var box = $("#sheetBox", r);
          if (kid) {
            S.stars += 1; save(); toast("Une étoile de plus : " + S.stars);
            box.innerHTML = '<div class="stars" aria-live="polite">' + "★".repeat(Math.min(S.stars, 20)) + '</div>';
            return;
          }
          var isMem = (S.hifz[sn] || []).indexOf(a) >= 0, isBm = S.bookmarks.indexOf(sn + ":" + a) >= 0;
          box.innerHTML = '<div class="sheet"><strong>' + esc(s.fr) + ', verset ' + a + '</strong>' +
            '<button class="btn alt" id="aMem">' + (isMem ? "Retirer des mémorisés" : "Marquer mémorisé") + '</button>' +
            '<button class="btn alt" id="aBm">' + (isBm ? "Retirer le signet" : "Signet") + '</button>' +
            '<button class="btn alt" id="aRd">Lu jusqu\'ici</button>' +
            '<a class="btn alt" href="#/mediter/' + sn + '/' + a + '">Méditer</a>' +
            '<button class="btn alt" id="aSh">Partager la référence</button></div>';
          $("#aMem", box).onclick = function () {
            var m = S.hifz[sn] || []; var i = m.indexOf(a); if (i >= 0) m.splice(i, 1); else m.push(a); S.hifz[sn] = m; save(); render();
          };
          $("#aBm", box).onclick = function () { var i = S.bookmarks.indexOf(sn + ":" + a); if (i >= 0) S.bookmarks.splice(i, 1); else S.bookmarks.push(sn + ":" + a); save(); render(); };
          $("#aRd", box).onclick = function () { s.v.forEach(function (v) { if (v[0] <= a) kMark(sn, v[0], true); }); save(); toast("Versets 1 à " + a + " marqués comme lus."); creditReading(); render(); };
          $("#aSh", box).onclick = function () { share("NÛR", "Sourate " + s.fr + " (" + sn + "), verset " + a + " — à lire dans NÛR."); };
        }
        $$(".v", r).forEach(function (el) {
          el.addEventListener("click", function () { pick(el); });
          el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(el); } });
        });
        if (startA) { var t = $('.v[data-a="' + startA + '"], .vcard[data-a="' + startA + '"]', r); if (t) { if (t.scrollIntoView) t.scrollIntoView({ block: "center" }); t.classList.add("sel"); } }
      } };
    });
  }
  route(/^\/reciter\/(\d+)$/, function (m, params) { return readerView(+m[1], params, false); });

  // Apprendre
  var TAJWID = [
    ["Les points d'articulation (makhârij)", "<p>Les lettres sortent de cinq zones générales : la cavité de la bouche et de la gorge (<em>al-jawf</em>, siège des prolongations), la gorge (<em>al-halq</em>), la langue (<em>al-lisân</em>), les lèvres (<em>ash-shafatân</em>) et la cavité nasale (<em>al-khayshûm</em>, siège de la <em>ghunna</em>).</p>"],
    ["Nûn sâkina et tanwîn", "<p>Cinq règles selon la lettre qui suit : <strong>izhâr</strong> (net) devant les lettres de la gorge ء ه ع ح غ خ ; <strong>idghâm avec ghunna</strong> devant ي ن م و ; <strong>idghâm sans ghunna</strong> devant ل ر ; <strong>iqlâb</strong> (changement en mîm) devant ب ; <strong>ikhfâʾ</strong> (dissimulation) devant les quinze lettres restantes.</p>"],
    ["Mîm sâkina", "<p><strong>Ikhfâʾ shafawî</strong> devant ب ; <strong>idghâm mithlayn</strong> devant م ; <strong>izhâr shafawî</strong> devant toutes les autres lettres.</p>"],
    ["Les prolongations (madd)", "<p>Le <em>madd ṭabîʿî</em> (naturel) dure deux temps. Les prolongations secondaires (<em>muttasil</em>, <em>munfasil</em>, <em>lâzim</em>, <em>ʿâriḍ lil-sukûn</em>, <em>lîn</em>, <em>badal</em>) allongent selon la cause. <strong>Les mesures varient d'une riwaya à l'autre : on n'applique pas à Warsh les mesures de Hafs.</strong></p>"],
    ["La qalqala et la ghunna", "<p>La <em>qalqala</em> est un léger rebondissement sur les lettres ق ط ب ج د lorsqu'elles sont muettes. La <em>ghunna</em> est la nasalisation de la nûn et de la mîm portant une chadda.</p>"],
    ["Particularités de la riwaya de Warsh", "<p>La riwaya de Warsh ʿan Nâfiʿ comporte des règles propres (mesure des prolongations, transfert de la hamza, prononciation pleine ou amincie de certaines lettres, lecture de la mîm du pluriel). Ces points doivent être enseignés <strong>avec l'imam garant</strong> ; ils ne sont pas détaillés ici pour éviter toute approximation.</p>"]
  ];
  route(/^\/apprendre$/, function () {
    return loadQ().then(function (q) {
      var started = q.suras.filter(function (s) { return (S.hifz[s.n] || []).length; });
      var html = '<h2>Apprendre</h2><a class="tile wide" href="#/parcours"><strong>Mon parcours, pas à pas</strong><span>Leçons courtes, quiz, fiches de révision, points et paliers</span></a><div class="grid keep" style="margin-bottom:1rem"><a class="tile" href="#/alphabet"><strong>Alphabet et lecture</strong><span>Lettres, voyelles, signes</span></a><a class="tile" href="#/niveaux"><strong>Mémorisation</strong><span>Mes repères, sourate par sourate</span></a></div><div class="card"><h3>Parcours de mémorisation</h3><p>Commencez par les dernières sourates, courtes et fréquemment récitées, puis remontez progressivement. Ouvrez une sourate, choisissez le mode « premier mot visible » ou « texte masqué », puis marquez chaque verset mémorisé.</p>' +
        '<ul class="list">' + [114, 113, 112, 111, 110, 109, 108, 107, 106, 105].map(function (n) {
          var s = q.byN[n], m = (S.hifz[n] || []).length;
          return '<li><a href="#/reciter/' + n + '"><span class="badge">' + n + '</span><span class="nm">' + esc(s.fr) + '<small>' + m + ' / ' + s.v.length + ' mémorisés</small></span><span class="ar">' + esc(s.ar) + '</span></a></li>';
        }).join("") + '</ul></div>';
      if (started.length) html += '<div class="card"><h3>Mon suivi</h3><ul class="list">' + started.map(function (s) {
        var m = S.hifz[s.n].length;
        return '<li><a href="#/reciter/' + s.n + '"><span class="badge">' + s.n + '</span><span class="nm">' + esc(s.fr) + '<small>' + m + ' / ' + s.v.length + '</small></span></a></li>';
      }).join("") + '</ul></div>';
      html += '<h3>Tajwid</h3>' + NOTE_VALIDATION + TAJWID.map(function (t) { return '<details class="card"><summary><strong>' + esc(t[0]) + '</strong></summary>' + t[1] + '</details>'; }).join("");
      return { title: "Apprendre", html: html, tab: "#/apprendre" };
    });
  });

  // Méditer
  function versePool(q) {
    var pool = []; q.suras.forEach(function (s) { if (s.n >= 91) s.v.forEach(function (v) { pool.push([s.n, v[0]]); }); }); return pool;
  }
  function verseHTML(q, sn, a) {
    var s = q.byN[sn], v = s.v.filter(function (x) { return x[0] === a; })[0];
    if (!v) return "";
    return '<div class="card"><div class="muted">' + esc(s.fr) + ', verset ' + a + '</div><div class="mushaf" style="margin-top:.5rem">' + esc(v[1]) + '</div>' + phonLine(sn, a, q) + '</div>';
  }
  route(/^\/mediter(?:\/(\d+)\/(\d+))?$/, function (m) {
    return Promise.all([loadQ(), loadOpt()]).then(function (res0) {
      var q = res0[0], sn, a, daily = false;
      if (m[1]) { sn = +m[1]; a = +m[2]; }
      else { var pool = versePool(q), L = loc(), t = ymd(Date.now(), L.tz); var idx = Math.floor(Date.UTC(t.y, t.m - 1, t.d) / 864e5) % pool.length; sn = pool[idx][0]; a = pool[idx][1]; daily = true; }
      var html = '<h2>Méditer</h2><h3 style="margin-top:0">' + (daily ? "Verset du jour" : "Verset choisi") + '</h3>' + verseHTML(q, sn, a) + arSeulHTML() +
        '<p class="muted">Ce verset est tiré des sourates courtes (91 à 114). Pour méditer un autre verset, ouvrez-le dans « Réciter » puis touchez « Méditer ».</p>' +
        '<label class="f" for="note">Ma méditation (enregistrée sur cet appareil)</label><textarea id="note" rows="5"></textarea>' +
        '<p><button class="btn" id="saveNote">Enregistrer</button></p><h3>Mon journal</h3><ul class="list" id="jl"></ul>';
      return { title: "Méditer", html: html, tab: "#/mediter", bind: function (r) {
        bindArSeul(r);
        function drawJ() {
          $("#jl", r).innerHTML = S.journal.slice().reverse().slice(0, 30).map(function (e) {
            var s = q.byN[e.s];
            return '<li><div class="card"><div class="muted">' + esc(e.date) + ' — ' + esc(s ? s.fr : "") + ', verset ' + e.a + '</div><div>' + esc(e.text).replace(/\n/g, "<br>") + '</div><button class="btn danger" data-id="' + e.id + '" style="margin-top:.5rem">Supprimer</button></div></li>';
          }).join("") || '<li class="muted">Aucune entrée.</li>';
          $$("button[data-id]", r).forEach(function (b) { b.onclick = function () { S.journal = S.journal.filter(function (x) { return String(x.id) !== b.dataset.id; }); save(); drawJ(); }; });
        }
        $("#saveNote", r).onclick = function () {
          var v = $("#note", r).value.trim(); if (!v) return toast("Écrivez d'abord quelques mots.");
          S.journal.push({ id: Date.now(), date: dayKey(ymd(Date.now(), loc().tz)), s: sn, a: a, text: v }); save(); $("#note", r).value = ""; toast("Enregistré."); drawJ();
        };
        drawJ();
      } };
    });
  });

  // Aimer
  route(/^\/aimer$/, function () {
    var html = '<h2>Aimer</h2><div class="card"><h3>Carnet de gratitude</h3><div class="row"><input type="text" id="gi" placeholder="Une gratitude…" style="flex:1;min-width:180px"><button class="btn" id="ga">Ajouter</button></div><ul class="list" id="gl" style="margin-top:.8rem"></ul></div>' +
      '<div class="card"><h3>Mes invocations et intentions</h3><p class="muted">Écrivez vos propres invocations pour vos proches ou vos intentions. Elles restent privées sur votre appareil.</p><div class="row"><input type="text" id="ii" placeholder="Une invocation, une intention…" style="flex:1;min-width:180px"><button class="btn" id="ia">Ajouter</button></div><ul class="list" id="il" style="margin-top:.8rem"></ul></div>' +
      '<div class="card"><h3>Transmettre</h3><p>Invitez un proche à découvrir NÛR : sans publicité, hors ligne, en Warsh.</p><button class="btn" id="sh">Partager NÛR</button></div>';
    return { title: "Aimer", html: html, tab: "#/aimer", bind: function (r) {
      function list(key, ul) {
        $(ul, r).innerHTML = S[key].slice().reverse().map(function (t, i) { return '<li><div class="card" style="margin:0 0 .45rem"><span>' + esc(t) + '</span> <button class="btn danger" data-k="' + key + '" data-i="' + (S[key].length - 1 - i) + '" style="float:right">Supprimer</button></div></li>'; }).join("") || '<li class="muted">Aucune entrée.</li>';
        $$('button[data-k="' + key + '"]', r).forEach(function (b) { b.onclick = function () { S[key].splice(+b.dataset.i, 1); save(); list(key, ul); }; });
      }
      function add(inp, key, ul) { var v = $(inp, r).value.trim(); if (!v) return; S[key].push(v); save(); $(inp, r).value = ""; list(key, ul); }
      $("#ga", r).onclick = function () { add("#gi", "gratitudes", "#gl"); };
      $("#ia", r).onclick = function () { add("#ii", "intentions", "#il"); };
      $("#sh", r).onclick = function () { share("NÛR", "Je vous invite à découvrir NÛR, une application sans publicité pour lire le Coran et suivre les heures de prière."); };
      list("gratitudes", "#gl"); list("intentions", "#il");
    } };
  });

  // Prières et qibla
  var monthOpen = false, dayOff = 0, compassOn = false;
  route(/^\/prieres$/, function () {
    var L = loc(), t0 = addDays(ymd(Date.now(), L.tz), dayOff), T = timesFor(L, t0), np = nextPrayer();
    var method = P.METHODS[S.settings.method] || P.METHODS.MWL;
    var html = '<h2>Heures de prière</h2><div class="card"><div class="row between"><div><strong>' + esc(L.name) + '</strong><div class="muted">' + L.lat.toFixed(3) + ', ' + L.lng.toFixed(3) + ' — ' + esc(L.tz) + '</div></div><a class="btn alt" href="#/reglages">Changer</a></div>' +
      (L.def ? '<div class="callout warn">Lieu par défaut. Pour des horaires exacts, utilisez votre position ou choisissez votre ville dans les réglages.</div>' : "") + '</div>' +
      '<div class="row between" style="margin:.4rem 0"><button class="btn alt" id="dm">Jour précédent</button><strong>' + dayKey(t0) + '</strong><button class="btn alt" id="dp">Jour suivant</button></div>' +
      '<div class="prayers">' + ORDER.slice(0, 1).concat([["sunrise", "Chourouq (lever du soleil)"]]).concat(ORDER.slice(1)).map(function (p) {
        var nx = dayOff === 0 && np && np.k === p[0] && np.ts === T[p[0]];
        return '<div class="prayer' + (nx ? " next" : "") + '"><span>' + p[1] + (nx ? ' <span class="muted">(dans ' + countdown(np.ts) + ')</span>' : "") + '</span><span class="t">' + fmtT(T[p[0]], L.tz) + '</span></div>';
      }).join("") + '</div>';
    if (T.flags && (T.flags.fajrAdjusted || T.flags.ishaAdjusted)) html += '<div class="callout">Nuit courte à cette latitude : l\'angle choisi n\'est pas atteint ; ' + (T.flags.fajrAdjusted ? "Fajr " : "") + (T.flags.ishaAdjusted ? "Ichâʾ " : "") + 'est calculé selon la portion de la nuit (règle des hautes latitudes). Consultez l\'imam garant sur la convention à retenir.</div>';
    html += '<p class="muted">Méthode : ' + esc(method.name) + '. Asr : ombre égale à la hauteur de l\'objet (rite malikite). Les horaires sont calculés sur votre appareil, sans connexion. Les mosquées locales peuvent retenir d\'autres conventions : ajustez les minutes dans les réglages.</p>' +
      '<details class="card" id="md"' + (monthOpen ? " open" : "") + '><summary><strong>Les 30 prochains jours</strong></summary><div class="scroll" id="mt"></div></details>';
    var qb = P.qibla(L.lat, L.lng);
    html += '<div class="card"><h3>Qibla</h3><p>Direction de la Kaaba : <strong>' + qb.bearing.toFixed(1) + '°</strong> depuis le nord (à ' + Math.round(qb.distanceKm).toLocaleString("fr-FR") + ' km).</p>' +
      '<div class="compass" id="cp" aria-label="Boussole de la qibla"><span class="n">N</span><div class="needle" id="nd"></div><div class="dot"></div></div>' +
      '<p class="row" style="justify-content:center"><button class="btn alt" id="cb">Activer la boussole</button></p>' +
      '<p class="muted" id="cs">Sans capteur, l\'aiguille indique la qibla lorsque le haut de l\'écran est orienté vers le nord.</p></div>';
    return { title: "Prières", html: html, back: "#/", tab: null, bind: function (r) {
      $("#dm", r).onclick = function () { dayOff--; render(); };
      $("#dp", r).onclick = function () { dayOff++; render(); };
      $("#md", r).addEventListener("toggle", function (e) { monthOpen = e.target.open; if (monthOpen) drawMonth(); });
      function drawMonth() {
        var base = ymd(Date.now(), L.tz), rows = "";
        for (var i = 0; i < 30; i++) {
          var d = addDays(base, i), X = timesFor(L, d);
          rows += '<tr' + (i === 0 ? ' class="today"' : "") + '><td>' + String(d.d).padStart(2, "0") + '/' + String(d.m).padStart(2, "0") + '</td>' + ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"].map(function (k) { return '<td>' + fmtT(X[k], L.tz) + '</td>'; }).join("") + '</tr>';
        }
        $("#mt", r).innerHTML = '<table class="month"><thead><tr><th>Jour</th><th>Fajr</th><th>Chrq</th><th>Dhr</th><th>Asr</th><th>Mgb</th><th>Ichâʾ</th></tr></thead><tbody>' + rows + '</tbody></table>';
      }
      if (monthOpen) drawMonth();
      var needle = $("#nd", r), q = qb.bearing;
      needle.style.transform = "rotate(" + q + "deg)";
      function onOrient(e) {
        var h = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.absolute && e.alpha != null ? 360 - e.alpha : null);
        if (h == null) return;
        needle.style.transform = "rotate(" + ((q - h + 360) % 360) + "deg)";
        $("#cs", r).textContent = "Boussole active : tournez-vous jusqu'à ce que l'aiguille pointe vers le haut.";
      }
      $("#cb", r).onclick = function () {
        function start() { window.addEventListener("deviceorientationabsolute", onOrient, true); window.addEventListener("deviceorientation", onOrient, true); compassOn = true; }
        if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") {
          DeviceOrientationEvent.requestPermission().then(function (s) { if (s === "granted") start(); else toast("Accès aux capteurs refusé."); }).catch(function () { toast("Capteur indisponible."); });
        } else if (window.DeviceOrientationEvent) start(); else toast("Capteur d'orientation indisponible.");
      };
      onLeave(function () { window.removeEventListener("deviceorientationabsolute", onOrient, true); window.removeEventListener("deviceorientation", onOrient, true); });
    } };
  });

  // Tidjaniya : compteurs
  route(/^\/tidjaniya$/, function () {
    var L = loc(), today = dayKey(ymd(Date.now(), L.tz));
    var log = S.tidj.log[today] || {};
    var html = '<h2>Tidjaniya</h2><div class="callout warn">Cet espace ne contient <strong>aucun texte de wird</strong>. Le wird est transmis par un mouqaddam autorisé. Vous créez ici vos propres compteurs, avec les noms et les quantités qui vous ont été prescrits.</div>' +
      '<div class="card"><h3>Ajouter un compteur</h3><label class="f" for="tn">Nom</label><input type="text" id="tn" placeholder="Ex. Lazim du matin">' +
      '<label class="f" for="tt">Quantité visée (facultatif)</label><input type="number" id="tt" min="0" inputmode="numeric"><p class="row" style="margin-top:.8rem"><button class="btn" id="ta">Ajouter</button></p>' +
      '<p class="muted">Modèles de noms : <button class="btn alt" data-tpl="Lazim — matin">Lazim matin</button> <button class="btn alt" data-tpl="Lazim — soir">Lazim soir</button> <button class="btn alt" data-tpl="Wazifa">Wazifa</button> <button class="btn alt" data-tpl="Hailala du vendredi">Hailala du vendredi</button></p></div><div id="tl"></div>' +
      '<p class="muted">Les compteurs se remettent à zéro chaque jour (date de votre lieu). L\'historique des 7 derniers jours est conservé sur l\'appareil.</p>';
    return { title: "Tidjaniya", html: html, back: "#/plus", bind: function (r) {
      function draw() {
        var lg = S.tidj.log[today] || {};
        $("#tl", r).innerHTML = S.tidj.items.map(function (it) {
          var n = lg[it.id] || 0, pct = it.target ? Math.min(100, Math.round(100 * n / it.target)) : 0;
          return '<div class="card counter"><div class="row between"><strong>' + esc(it.name) + '</strong><span class="pill">' + (it.target ? "objectif " + it.target : "libre") + '</span></div>' +
            '<div class="num" aria-live="polite">' + n + '</div>' + (it.target ? '<div class="bar"><i style="width:' + pct + '%"></i></div>' : "") +
            '<p><button class="tap" data-c="' + it.id + '" aria-label="Ajouter un à ' + esc(it.name) + '">+1</button></p>' +
            '<div class="row" style="justify-content:center"><button class="btn alt" data-u="' + it.id + '">−1</button><button class="btn alt" data-z="' + it.id + '">Remettre à zéro</button><button class="btn danger" data-d="' + it.id + '">Supprimer</button></div></div>';
        }).join("") || '<p class="muted">Aucun compteur pour le moment.</p>';
        $$("[data-c]", r).forEach(function (b) { b.onclick = function () { var id = b.dataset.c; S.tidj.log[today] = S.tidj.log[today] || {}; S.tidj.log[today][id] = (S.tidj.log[today][id] || 0) + 1; prune(); save(); if (navigator.vibrate) navigator.vibrate(15); draw(); }; });
        $$("[data-u]", r).forEach(function (b) { b.onclick = function () { var id = b.dataset.u; S.tidj.log[today] = S.tidj.log[today] || {}; S.tidj.log[today][id] = Math.max(0, (S.tidj.log[today][id] || 0) - 1); save(); draw(); }; });
        $$("[data-z]", r).forEach(function (b) { b.onclick = function () { S.tidj.log[today] = S.tidj.log[today] || {}; S.tidj.log[today][b.dataset.z] = 0; save(); draw(); }; });
        $$("[data-d]", r).forEach(function (b) { b.onclick = function () { if (confirm("Supprimer ce compteur ?")) { S.tidj.items = S.tidj.items.filter(function (x) { return String(x.id) !== b.dataset.d; }); save(); draw(); } }; });
      }
      function prune() { var keys = Object.keys(S.tidj.log).sort(); while (keys.length > 7) delete S.tidj.log[keys.shift()]; }
      $("#ta", r).onclick = function () {
        var n = $("#tn", r).value.trim(); if (!n) return toast("Donnez un nom au compteur.");
        S.tidj.items.push({ id: Date.now(), name: n, target: +$("#tt", r).value || 0 }); save(); $("#tn", r).value = ""; $("#tt", r).value = ""; draw();
      };
      $$("[data-tpl]", r).forEach(function (b) { b.onclick = function () { $("#tn", r).value = b.dataset.tpl; $("#tt", r).focus(); }; });
      draw();
    } };
  });

  // Espace enfant
  route(/^\/enfant$/, function () {
    return loadQ().then(function (q) {
      var html = '<div class="kid"><h2>Espace enfant</h2><p>Choisis une sourate, lis-la, puis touche chaque verset après l\'avoir répété.</p><div class="stars">' + "★".repeat(Math.min(S.stars, 20)) + '</div><ul class="list">' +
        [112, 108, 103, 110, 113, 114, 109, 111, 105, 107].map(function (n) { var s = q.byN[n]; return '<li><a href="#/enfant/' + n + '"><span class="badge">' + n + '</span><span class="nm">' + esc(s.fr) + '</span><span class="ar">' + esc(s.ar) + '</span></a></li>'; }).join("") + '</ul></div>' +
        '<p class="muted">Un code parental (dans les réglages) protège la sortie de cet espace.</p>';
      return { title: "Espace enfant", html: html, back: "#/plus", bind: function () { document.body.classList.add("kid"); onLeave(function () { document.body.classList.remove("kid"); }); } };
    });
  });
  route(/^\/enfant\/(\d+)$/, function (m, params) { return readerView(+m[1], params, true); });

  // Réglages
  route(/^\/reglages$/, function () { return guardParent(reglagesView); });
  function reglagesView() {
    var L = loc(), st = S.settings;
    var html = '<h2>Réglages</h2><div class="card"><h3>Lieu</h3><p><strong>' + esc(L.name) + '</strong></p><div class="row"><button class="btn" id="gps">Utiliser ma position</button></div>' +
      '<label class="f" for="city">Ou choisir une ville</label><select id="city"><option value="">—</option>' + CITIES.map(function (c, i) { return '<option value="' + i + '">' + esc(c[0]) + '</option>'; }).join("") + '</select>' +
      '<details style="margin-top:.7rem"><summary>Saisie manuelle</summary><label class="f" for="mla">Latitude</label><input type="number" step="0.0001" id="mla"><label class="f" for="mln">Longitude</label><input type="number" step="0.0001" id="mln"><label class="f" for="mtz">Fuseau horaire (ex. Europe/Paris)</label><input type="text" id="mtz" value="' + esc(Intl.DateTimeFormat().resolvedOptions().timeZone) + '"><p><button class="btn alt" id="mset">Enregistrer ce lieu</button></p></details></div>' +
      '<div class="card"><h3>Calcul des prières</h3><label class="f" for="meth">Méthode (angles du Fajr et de l\'Ichâʾ)</label><select id="meth">' + Object.keys(P.METHODS).map(function (k) { return '<option value="' + k + '"' + (st.method === k ? " selected" : "") + '>' + esc(P.METHODS[k].name) + '</option>'; }).join("") + '</select>' +
      '<div id="cust" ' + (st.method === "CUSTOM" ? "" : "hidden") + '><label class="f" for="cf">Angle du Fajr (°)</label><input type="number" step="0.5" id="cf" value="' + st.customFajr + '"><label class="f" for="ci">Angle de l\'Ichâʾ (°)</label><input type="number" step="0.5" id="ci" value="' + st.customIsha + '"></div>' +
      '<details style="margin-top:.7rem"><summary>Ajustements en minutes (pour s\'aligner sur la mosquée locale)</summary>' + [["fajr", "Fajr"], ["sunrise", "Chourouq"], ["dhuhr", "Dhuhr"], ["asr", "ʿAsr"], ["maghrib", "Maghrib"], ["isha", "ʿIshâʾ"]].map(function (p) { return '<label class="f" for="o_' + p[0] + '">' + p[1] + '</label><input type="number" step="1" id="o_' + p[0] + '" data-o="' + p[0] + '" value="' + ((st.offsets && st.offsets[p[0]]) || 0) + '">'; }).join("") + '</details>' +
      '<label class="f" for="hj">Ajustement de la date hégirienne (jours)</label><select id="hj">' + [-2, -1, 0, 1, 2].map(function (n) { return '<option value="' + n + '"' + ((st.hijriOffset || 0) === n ? " selected" : "") + '>' + (n > 0 ? "+" + n : n) + '</option>'; }).join("") + '</select><p class="muted">La date hégirienne affichée suit le calendrier civil d\'Oumm al-Qourâ ; elle peut différer d\'un jour de l\'observation locale.</p>' +
      '<p><label><input type="checkbox" id="nt"' + (st.notif ? " checked" : "") + '> Rappels de prière (uniquement lorsque l\'application est ouverte)</label></p></div>' +
      '<div class="card"><h3>Ma pratique</h3><p><label><input type="checkbox" id="ptk"' + (st.prayerTrack ? " checked" : "") + '> Suivre mes cinq prières (privé, ' + PRI + ' points par prière)</label></p><p class="muted">Désactivé par défaut. Les prières cochées restent sur cet appareil.</p><p class="row"><a class="btn alt" href="#/khatm">Lecture du jour et khatm</a><a class="btn alt" href="#/profils">Profils</a></p></div>' +
      '<div class="card"><h3>Affichage</h3><label class="f" for="th">Thème</label><select id="th">' + [["auto", "Automatique"], ["light", "Clair"], ["dark", "Sombre"], ["contrast", "Contraste élevé"]].map(function (t) { return '<option value="' + t[0] + '"' + (st.theme === t[0] ? " selected" : "") + '>' + t[1] + '</option>'; }).join("") + '</select><label class="f" for="fs">Taille du texte</label><input type="range" id="fs" min="0.8" max="1.8" step="0.1" value="' + st.fs + '"></div>' +
      '<div class="card"><h3>Code parental</h3><p class="muted">Protège les profils enfants : sortie du profil, réglages, validation des paliers. Le code reste sur l\'appareil.</p><label class="f" for="pin">Nouveau code (4 chiffres)</label><input type="password" id="pin" inputmode="numeric" maxlength="4" pattern="[0-9]*"><p class="row"><button class="btn alt" id="pset">Enregistrer</button>' + (STORE.pin ? '<button class="btn danger" id="pclr">Supprimer le code</button>' : "") + '</p></div>' +
      '<div class="card"><h3>Mes données</h3><p class="muted">Signets, mémorisation, journal, compteurs, points et parcours du profil actif : stockés uniquement sur cet appareil.</p><div class="row"><button class="btn alt" id="exp">Exporter</button><label class="btn alt" for="imp" style="margin:0">Importer</label><input type="file" id="imp" accept="application/json" hidden><button class="btn danger" id="rst">Tout effacer</button></div></div>' +
      '<div class="card"><h3>Hors ligne</h3><p id="offl" class="muted">Vérification…</p></div>';
    return { title: "Réglages", html: html, back: "#/plus", bind: function (r) {
      function setLoc(l) { S.settings.loc = l; save(); toast("Lieu enregistré : " + l.name); render(); }
      $("#gps", r).onclick = function () {
        if (!navigator.geolocation) return toast("Géolocalisation indisponible.");
        navigator.geolocation.getCurrentPosition(function (p) { setLoc({ name: "Ma position (GPS)", lat: +p.coords.latitude.toFixed(4), lng: +p.coords.longitude.toFixed(4), tz: Intl.DateTimeFormat().resolvedOptions().timeZone }); },
          function () { toast("Position refusée ou indisponible. Choisissez une ville."); }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
      };
      $("#city", r).onchange = function (e) { if (e.target.value === "") return; var c = CITIES[+e.target.value]; setLoc({ name: c[0], lat: c[1], lng: c[2], tz: c[3] }); };
      $("#mset", r).onclick = function () {
        var la = +$("#mla", r).value, ln = +$("#mln", r).value, tz = $("#mtz", r).value.trim();
        if (!(la >= -66 && la <= 66) || !(ln >= -180 && ln <= 180)) return toast("Coordonnées invalides (latitude entre -66 et 66).");
        try { new Intl.DateTimeFormat("fr", { timeZone: tz }); } catch (e) { return toast("Fuseau horaire invalide."); }
        setLoc({ name: "Lieu personnalisé", lat: la, lng: ln, tz: tz });
      };
      $("#meth", r).onchange = function (e) { st.method = e.target.value; save(); $("#cust", r).hidden = st.method !== "CUSTOM"; };
      $("#cf", r).onchange = function (e) { st.customFajr = +e.target.value; save(); };
      $("#ci", r).onchange = function (e) { st.customIsha = +e.target.value; save(); };
      $$("[data-o]", r).forEach(function (i) { i.onchange = function () { st.offsets = st.offsets || {}; st.offsets[i.dataset.o] = Math.max(-60, Math.min(60, Math.round(+i.value || 0))); save(); }; });
      $("#hj", r).onchange = function (e) { st.hijriOffset = +e.target.value; save(); };
      $("#nt", r).onchange = function (e) {
        if (e.target.checked && "Notification" in window) { Notification.requestPermission().then(function (p) { st.notif = p === "granted"; e.target.checked = st.notif; save(); scheduleNotifs(); if (!st.notif) toast("Notifications refusées."); }); }
        else { st.notif = false; save(); scheduleNotifs(); }
      };
      $("#ptk", r).onchange = function (e) { st.prayerTrack = e.target.checked; save(); toast(st.prayerTrack ? "Suivi des prières activé." : "Suivi des prières désactivé."); };
      $("#th", r).onchange = function (e) { st.theme = e.target.value; save(); applyTheme(); };
      $("#fs", r).oninput = function (e) { st.fs = +e.target.value; save(); applyTheme(); };
      $("#pset", r).onclick = function () { var v = $("#pin", r).value; if (!/^\d{4}$/.test(v)) return toast("Le code doit comporter 4 chiffres."); askPin("Code parental actuel").then(function (ok) { if (!ok) return; pinHash(v).then(function (h) { STORE.pin = h; save(); toast("Code enregistré."); render(); }); }); };
      if ($("#pclr", r)) $("#pclr", r).onclick = function () {
        if (STORE.profiles.some(function (p) { return isChild(p); })) return toast("Un profil enfant existe : le code parental ne peut pas être supprimé.");
        askPin("Code parental actuel").then(function (ok) { if (!ok) return; STORE.pin = null; save(); toast("Code supprimé."); render(); });
      };
      $("#exp", r).onclick = function () { download("nur-sauvegarde.json", JSON.stringify(S, null, 1)); };
      $("#imp", r).onchange = function (e) {
        var f = e.target.files[0]; if (!f) return; var fr = new FileReader();
        fr.onload = function () { try { S = merge(DEF(), JSON.parse(fr.result)); save(); applyTheme(); toast("Données importées."); render(); } catch (x) { toast("Fichier invalide."); } };
        fr.readAsText(f);
      };
      $("#rst", r).onclick = function () { if (confirm("Effacer tous les profils et toutes les données de NÛR sur cet appareil ?")) { localStorage.removeItem(KEY); localStorage.removeItem(KEY2); STORE = loadStore(); S = curData(); applyTheme(); toast("Données effacées."); location.hash = "#/bienvenue"; } };
      var off = $("#offl", r);
      if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistration().then(function (reg) { off.textContent = reg && reg.active ? "L'application et le texte du Coran sont disponibles hors ligne sur cet appareil." : "Le mode hors ligne s'active après le premier chargement complet (connexion requise une fois)."; });
      else off.textContent = "Ce navigateur ne permet pas le mode hors ligne.";
    } };
  }

  // À propos
  route(/^\/apropos$/, function () {
    var html = '<h2>À propos</h2><p>NÛR (نور) est une application islamique francophone, sans publicité, sans représentation d\'être vivant, conçue pour les croyants de tous niveaux, avec une attention particulière à la diaspora africaine de rite malikite.</p>' +
      '<div class="card"><h3>Riwaya</h3><p>Le texte est celui de la riwaya de Warsh ʿan Nâfiʿ, selon les données et la police du Complexe du Roi Fahd d\'impression du Noble Coran (KFGQPC), version 0.10 (5 août 2021).</p></div>' +
      '<div class="card"><h3>Sources et licences</h3><ul><li>Données du texte : KFGQPC, relayées par le dépôt public « thetruetruth/quran-data-kfgqpc » (github.com/thetruetruth/quran-data-kfgqpc).</li><li>Police « KFGQPC Warsh Uthmanic Script » : © KFGQPC. Usage, copie et distribution gratuits ; vente, modification et ingénierie inverse interdites. Licence complète : <a href="LICENCE-KFGQPC.txt">LICENCE-KFGQPC.txt</a>.</li><li>Calcul des prières : algorithme astronomique de position solaire, validé à moins d\'une minute contre une bibliothèque indépendante.</li></ul></div>' +
      '<div class="card"><h3>Points en attente</h3><ul><li>Contenus de la présente version (texte Warsh, tajwid, leçons, quiz, dhikr, hadiths, phonétique) : validés par l\'imam garant.</li><li>Phonétique : produite automatiquement pour tout le Coran à partir du texte Warsh ; d\'éventuelles corrections s\'ajoutent dans le fichier phonetique.json (fiche d\'export ci-dessous).</li><li>Traduction française : à intégrer à partir d\'une source dont les droits sont établis (fichier traduction-fr.json).</li><li>Récitations audio : à intégrer après accord des ayants droit.</li><li>Application gratuite, sans abonnement ni publicité.</li><li>Enregistrements des lettres et des leçons : à produire.</li><li>Notifications de prière : envoyées tant que l\'application est ouverte ou installée et active ; application fermée, le téléphone peut les retenir.</li></ul></div>' +
      '<p class="row"><button class="btn alt" id="expPh">Exporter la phonétique (6 214 versets)</button><button class="btn alt" id="expPc">Exporter le parcours et le quotidien</button></p><p class="muted">Version ' + VERSION + '. Aucune donnée personnelle n\'est collectée ni transmise.</p>';
    return { title: "À propos", html: html, back: "#/plus", bind: function (r) {
      $("#expPh", r).onclick = function () {
        Promise.all([loadQ(), loadOpt()]).then(function (res) {
          var q = res[0], o = res[1];
          var rows = ["Sourate;Verset;Texte Warsh;Phonétique proposée;Décision de l'imam;Correction"];
          q.suras.forEach(function (su) { su.v.forEach(function (v) {
            rows.push([su.n, v[0], '"' + v[1].replace(/\u00a0/g, " ").replace(/"/g, '""') + '"', '"' + (phonOf(o, su.n, v[0], q) || "") + '"', "", ""].join(";"));
          }); });
          download("fiche-validation-phonetique.csv", "\ufeff" + rows.join("\n"), "text/csv;charset=utf-8");
        });
      };
      $("#expPc", r).onclick = function () {
        loadOpt().then(function (o) {
          if (!o.parcours) return toast("Aucun contenu à exporter.");
          var rows = ["Partie;Repère;Élément;Texte;Décision de l'imam;Correction"], cell = function (t) { return '"' + String(t == null ? "" : t).replace(/"/g, '""') + '"'; };
          var add = function (a, b, c, t) { rows.push([cell(a), cell(b), cell(c), cell(t), "", ""].join(";")); };
          paliers(o).forEach(function (p) { (p.etapes || []).forEach(function (et) {
            et.lecons.forEach(function (l, i) {
              var rp = p.nom + " " + et.n + "." + (i + 1);
              add("Leçon", rp, "Titre", l.titre); l.texte.forEach(function (t) { add("Leçon", rp, "Texte", t); });
              (l.mots || []).forEach(function (w) { add("Leçon", rp, "Mot", w.ar + " | " + w.tr + " | " + w.ph + " | " + w.fr); });
              if (l.versets) l.versets.sens.forEach(function (t, k) { add("Leçon", rp, "Sens du verset " + l.versets.s + ":" + l.versets.a[k], t); });
              add("Leçon", rp, "À retenir", l.retenir);
            });
            et.quiz.forEach(function (qq, i) { add("Quiz", p.nom + " " + et.n + ", question " + (i + 1), qq.q, qq.c.map(function (c, j) { return (j === qq.r ? "[x] " : "[ ] ") + c; }).join(" / ")); });
          }); });
          var qt = o.quot || {};
          (qt.dhikr || []).forEach(function (w, i) { add("Dhikr du jour", String(i + 1), w.ar, w.tr + " | " + w.ph + " | " + w.fr + " | cible " + w.cible); });
          (qt.hadiths || []).forEach(function (h) { add("Hadith du jour", "an-Nawawî n° " + h.n, h.rapporteur + " ; " + h.recueils, h.sens); });
          if (qt.vendredi) add("Vendredi", "", "Suggestion", qt.vendredi);
          download("fiche-validation-parcours.csv", "\ufeff" + rows.join("\n"), "text/csv;charset=utf-8");
        });
      };
    } };
  });

  /* ------------------------------------------------------------ alphabet, repères de mémorisation */
  var LETTERS = [
    ["ا", "Alif", "â", "Support de la voyelle longue « â » ; porte aussi la hamza (ء)."],
    ["ب", "Bâʾ", "b", "Comme le « b » de « bateau »."],
    ["ت", "Tâʾ", "t", "Comme le « t » de « table »."],
    ["ث", "Thâʾ", "th", "Comme le « th » de l'anglais « think » (langue entre les dents)."],
    ["ج", "Jîm", "dj", "Comme « dj » dans « djembé »."],
    ["ح", "Ḥâʾ", "ḥ", "« h » soufflé, du fond de la gorge, sans équivalent en français."],
    ["خ", "Khâʾ", "kh", "Comme la « jota » espagnole ou le « ch » allemand de « Bach »."],
    ["د", "Dâl", "d", "Comme le « d » de « dent »."],
    ["ذ", "Dhâl", "dh", "Comme le « th » de l'anglais « this »."],
    ["ر", "Râʾ", "r", "« r » roulé du bout de la langue."],
    ["ز", "Zây", "z", "Comme le « z » de « zèbre »."],
    ["س", "Sîn", "s", "Comme le « s » de « soleil »."],
    ["ش", "Chîn", "ch", "Comme le « ch » de « chat »."],
    ["ص", "Ṣâd", "ṣ", "« s » emphatique : prononcé lourd, la langue plaquée au palais."],
    ["ض", "Ḍâd", "ḍ", "« d » emphatique : prononcé lourd."],
    ["ط", "Ṭâʾ", "ṭ", "« t » emphatique : prononcé lourd."],
    ["ظ", "Ẓâʾ", "ẓ", "« dh » emphatique : « dh » prononcé lourd."],
    ["ع", "ʿAyn", "ʿ", "Son guttural de la gorge, sans équivalent en français."],
    ["غ", "Ghayn", "gh", "« r » grasseyé, proche du « r » parisien."],
    ["ف", "Fâʾ", "f", "Comme le « f » de « feu »."],
    ["ق", "Qâf", "q", "« k » prononcé tout au fond de la gorge."],
    ["ك", "Kâf", "k", "Comme le « k » de « kilo »."],
    ["ل", "Lâm", "l", "Comme le « l » de « lune »."],
    ["م", "Mîm", "m", "Comme le « m » de « main »."],
    ["ن", "Noûn", "n", "Comme le « n » de « nuit »."],
    ["ه", "Hâʾ", "h", "« h » expiré, comme dans l'anglais « hat »."],
    ["و", "Wâw", "w / oû", "Consonne « w » (« oui ») ou voyelle longue « oû »."],
    ["ي", "Yâʾ", "y / î", "Consonne « y » (« yeux ») ou voyelle longue « î »."]
  ];
  var SHAMSI = "ت ث د ذ ر ز س ش ص ض ط ظ ل ن", QAMARI = "ا ب ج ح خ ع غ ف ق ك م ه و ي";
  route(/^\/alphabet$/, function () {
    var html = '<h2>Alphabet et lecture</h2>' + NOTE_VALIDATION +
      '<p>L\'arabe s\'écrit de droite à gauche. Il compte 28 lettres, toutes des consonnes ; les voyelles brèves s\'écrivent par de petits signes placés au-dessus ou au-dessous des lettres. Les approximations ci-dessous aident à démarrer, mais <strong>seule l\'écoute d\'un enseignant</strong> permet de bien prononcer.</p>' +
      '<h3>Les 28 lettres</h3><div class="lgrid">' + LETTERS.map(function (l) {
        return '<div class="lcard"><div class="lg ar" lang="ar">' + l[0] + '</div><div><strong>' + esc(l[1]) + '</strong> <span class="pill">' + esc(l[2]) + '</span><div class="muted">' + esc(l[3]) + '</div></div></div>';
      }).join("") + '</div>' +
      '<h3>Les voyelles brèves</h3><div class="card"><ul class="plain"><li><span class="ar big2">بَ</span> fatha : « a » (ba)</li><li><span class="ar big2">بُ</span> damma : « ou » (bou)</li><li><span class="ar big2">بِ</span> kasra : « i » (bi)</li></ul></div>' +
      '<h3>Les voyelles longues</h3><div class="card"><ul class="plain"><li><span class="ar big2">بَا</span> fatha + alif : « â » (bâ)</li><li><span class="ar big2">بُو</span> damma + wâw : « oû » (boû)</li><li><span class="ar big2">بِي</span> kasra + yâʾ : « î » (bî)</li><li><span class="ar big2">بَٰ</span> petit alif suscrit (alif-poignard) : « â », très fréquent en Warsh.</li></ul><p class="muted">Une voyelle longue dure environ deux fois plus longtemps qu\'une brève.</p></div>' +
      '<h3>Les autres signes</h3><div class="card"><ul class="plain"><li><span class="ar big2">بْ</span> soukoun : pas de voyelle ; la consonne est prononcée seule.</li><li><span class="ar big2">بَّ</span> chadda : la consonne est doublée (bba).</li><li><span class="ar big2">ءَ</span> hamza : coup de glotte, noté « \' » dans la phonétique.</li><li><span class="ar big2">بٗ ـ بٞ ـ بٖ</span> tanwîn : « an », « oun », « in » à la fin d\'un mot. Dans les mushafs maghrébins, comme celui de Warsh, ces trois signes s\'écrivent ainsi (et non ً ٌ ٍ).</li></ul></div>' +
      '<h3>Le « l » de l\'article (al-)</h3><div class="card"><p>Devant les <strong>lettres lunaires</strong>, le « l » se prononce : <em>al-qamar</em>. Devant les <strong>lettres solaires</strong>, il s\'assimile et la lettre est doublée : <em>ach-chams</em>, <em>ar-raḥmân</em>.</p><p class="ar" style="font-size:1.4rem;direction:rtl;text-align:right" lang="ar">' + SHAMSI + '</p><p class="muted">Lettres solaires (ci-dessus) et lunaires :</p><p class="ar" style="font-size:1.4rem;direction:rtl;text-align:right" lang="ar">' + QAMARI + '</p></div>' +
      '<h3>Comment lire la phonétique de l\'application</h3><div class="card"><p>La phonétique est écrite pour un lecteur francophone : <strong>ou</strong> se lit comme dans « loup », <strong>â, î, oû</strong> sont des voyelles longues, <strong>dj, ch, kh, dh, th, gh</strong> sont des sons simples, <strong>ḥ, ṣ, ḍ, ṭ, ẓ, ʿ</strong> sont des sons propres à l\'arabe, et <strong>\'</strong> marque un coup de glotte. Un trait d\'union relie l\'article à son mot (« al-ḥamdou », « ar-raḥmâni »).</p><p class="muted">La phonétique ne note pas les règles de tajwid (idghâm, ikhfâʾ, prolongations). Elle ne remplace pas l\'écoute de la récitation.</p></div>' +
      '<p><a class="btn" href="#/reciter/1">Lire la Fâtiha</a></p>';
    return { title: "Alphabet", html: html, back: "#/apprendre", tab: "#/apprendre" };
  });

  var LEVELS = [
    { id: "initie", nom: "Étincelle (débutant)", but: "Découvrir : alphabet, voyelles, lecture guidée verset par verset avec phonétique, traduction et audio.", cible: [1, 112, 113, 114], detail: "Mémoriser la Fâtiha (sourate 1) et les trois dernières sourates (112, 113, 114)." },
    { id: "intermediaire", nom: "Flamme", but: "Lire avec aisance, mémoriser les sourates courtes et acquérir les bases du tajwid.", cible: [99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111], detail: "Mémoriser les sourates 99 à 111." },
    { id: "disciple", nom: "Lanterne", but: "Mémoriser par parties, réviser régulièrement, étudier les règles propres à la riwaya de Warsh avec l'imam garant.", cible: null, detail: "Parcours à définir avec l'imam garant (partie du Coran, révision espacée)." },
    { id: "cheikh", nom: "Étoile", but: "Outils de transmission : suivi d'élèves, annotations validées, accompagnement.", cible: null, detail: "Fonctions de transmission et de validation à définir avec l'imam garant." }
  ];
  function levelProgress(l, q) {
    if (!l.cible) return null;
    var tot = 0, mem = 0;
    l.cible.forEach(function (n) { var s = q.byN[n]; tot += s.v.length; mem += (S.hifz[n] || []).length; });
    return { mem: mem, tot: tot, pct: Math.round(100 * mem / tot) };
  }
  route(/^\/niveaux$/, function () {
    return loadQ().then(function (q) {
      var html = '<h2>Repères de mémorisation</h2><div class="callout">Repères de mémorisation validés par l\'imam garant. Ils se calculent à partir des versets marqués comme mémorisés. Les points et les paliers se trouvent dans « Mon parcours ».</div>';
      var current = null;
      LEVELS.forEach(function (l) { var p = levelProgress(l, q); if (!current && (!p || p.pct < 100)) current = l.id; });
      html += LEVELS.map(function (l, i) {
        var p = levelProgress(l, q);
        return '<div class="card"><div class="row between"><h3 style="margin:0">' + (i + 1) + '. ' + esc(l.nom) + '</h3>' + (l.id === current ? '<span class="pill" style="border-color:var(--gold);color:var(--gold)">Niveau actuel</span>' : (p && p.pct === 100 ? '<span class="pill">Acquis</span>' : '')) + '</div>' +
          '<p>' + esc(l.but) + '</p><p class="muted">' + esc(l.detail) + '</p>' +
          (p ? '<div class="muted">' + p.mem + ' / ' + p.tot + ' versets mémorisés (' + p.pct + ' %)</div><div class="bar"><i style="width:' + p.pct + '%"></i></div>' : '') + '</div>';
      }).join("") + '<p class="row"><a class="btn" href="#/alphabet">Alphabet et lecture</a><a class="btn alt" href="#/parcours">Mon parcours</a></p>';
      return { title: "Mémorisation", html: html, back: "#/apprendre", tab: "#/apprendre" };
    });
  });

  /* ------------------------------------------------------------ bienvenue (premier lancement) et profils */
  var pf = { nom: "", type: null, age: "" };
  function profilFormHTML() {
    var kidSel = pf.type === "garcon" || pf.type === "fille";
    return '<label class="f" for="pn">Prénom (facultatif)</label><input type="text" id="pn" maxlength="24" autocomplete="off" value="' + esc(pf.nom) + '">' +
      '<p id="whoL" class="muted" style="margin:.9rem 0 .25rem">Qui utilise ce profil ?</p>' +
      '<div class="who" role="group" aria-labelledby="whoL">' +
      '<button type="button" data-t="homme" aria-pressed="' + (pf.type === "homme") + '">Homme</button>' +
      '<button type="button" data-t="femme" aria-pressed="' + (pf.type === "femme") + '">Femme</button>' +
      '<button type="button" class="sub" data-t="garcon" aria-pressed="' + (pf.type === "garcon") + '">Enfant (garçon)</button>' +
      '<button type="button" class="sub" data-t="fille" aria-pressed="' + (pf.type === "fille") + '">Enfant (fille)</button></div>' +
      '<div id="kidBox" class="card" style="text-align:left"' + (kidSel ? "" : " hidden") + '><h3>Profil enfant : accord de l\'adulte</h3>' +
      '<p class="muted">Un profil enfant se crée sous la responsabilité d\'un adulte, à partir de 7 ans.</p>' +
      '<label class="f" for="pa">Âge de l\'enfant</label><input type="number" id="pa" min="7" max="17" inputmode="numeric" value="' + esc(pf.age) + '">' +
      '<label class="chk" style="margin-top:.6rem"><input type="checkbox" id="pok"> Je suis l\'adulte responsable de cet enfant et j\'autorise ce profil.</label>' +
      '<label class="f" for="pc">' + (STORE.pin ? "Code parental" : "Choisir un code parental (4 chiffres)") + '</label><input type="password" id="pc" inputmode="numeric" maxlength="4" pattern="[0-9]*" autocomplete="off">' +
      '<p class="muted">Ce code sera demandé pour quitter le profil enfant, ouvrir ses réglages et valider ses paliers.</p></div>';
  }
  function bindProfilForm(r) {
    $$(".who button", r).forEach(function (b) { b.onclick = function () {
      pf.type = b.dataset.t; pf.nom = $("#pn", r).value;
      $$(".who button", r).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      $("#kidBox", r).hidden = !(pf.type === "garcon" || pf.type === "fille");
    }; });
  }
  function submitProfil(r) {
    var nom = $("#pn", r).value.trim().slice(0, 24), type = pf.type || "adulte";
    if (STORE.profiles.length >= MAXP) { toast("Cinq profils au plus sur cet appareil."); return Promise.resolve(null); }
    if (type === "garcon" || type === "fille") {
      var age = Math.round(+$("#pa", r).value), code = $("#pc", r).value;
      if (!(age >= 7 && age <= 17)) { toast("L'âge doit être compris entre 7 et 17 ans."); return Promise.resolve(null); }
      if (!$("#pok", r).checked) { toast("L'accord de l'adulte responsable est nécessaire."); return Promise.resolve(null); }
      if (!/^\d{4}$/.test(code)) { toast("Le code parental doit comporter 4 chiffres."); return Promise.resolve(null); }
      return pinHash(code).then(function (h) {
        if (STORE.pin && STORE.pin !== h) { toast("Code parental incorrect."); return null; }
        STORE.pin = h; return addProfile({ nom: nom, type: type, age: age });
      });
    }
    return Promise.resolve(addProfile({ nom: nom, type: type }));
  }
  function finishOb() {
    if (!STORE.profiles.length) switchProfile(addProfile({ nom: "", type: "adulte" }));
    STORE.onboarded = true; save(); pf = { nom: "", type: null, age: "" };
    var nxt = null; try { nxt = sessionStorage.getItem("nur:next"); sessionStorage.removeItem("nur:next"); } catch (e) {}
    location.hash = nxt && nxt.indexOf("#/") === 0 && nxt.indexOf("bienvenue") < 0 ? nxt : "#/";
  }
  route(/^\/bienvenue$/, function (m, params) {
    var e = Math.max(1, Math.min(4, +params.e || 1));
    if (e === 3 && STORE.profiles.length) e = 4;
    var bar = '<div class="prog"><div class="bar"><i style="width:' + (e * 25) + '%"></i></div><span class="muted">' + e + ' / 4</span></div>', html;
    if (e === 1) html = '<div class="obLogo ar" lang="ar" aria-hidden="true">نور</div><h2>Bienvenue dans NÛR</h2>' +
      '<p class="lead">Apprendre le Coran et les bases de la foi, pas à pas, à votre rythme.</p>' +
      '<ul class="plain"><li>Gratuit, sans publicité.</li><li>Vos données restent sur votre appareil.</li><li>Un parcours simple, pour qui découvre comme pour qui reprend.</li></ul>' +
      '<p><a class="btn big" href="#/bienvenue?e=2">Commencer</a></p><p><button class="btn alt" id="skip">Passer l\'introduction</button></p>';
    else if (e === 2) html = '<h2>Comment vous allez avancer</h2><ul class="plain">' +
      '<li><strong>Chaque jour</strong> : quatre petits objectifs, en quelques minutes. Une lecture, un verset, un dhikr, un hadith.</li>' +
      '<li><strong>Chaque étape</strong> : quatre leçons courtes, un quiz et des fiches de révision.</li>' +
      '<li><strong>Des points privés</strong> : ni classement, ni pénalité. Ils ouvrent les paliers : Étincelle, Flamme, Lanterne, Étoile.</li>' +
      '<li><strong>Rien ne presse</strong> : on passe à la suite quand on se sent prêt.</li></ul>' +
      '<p><a class="btn big" href="#/bienvenue?e=3">Continuer</a></p>';
    else if (e === 3) html = '<h2>Votre profil</h2><div style="text-align:left">' + profilFormHTML() + '</div>' +
      '<p><button class="btn big" id="go">Continuer</button></p><p><button class="btn alt" id="skip3">Passer</button></p>';
    else html = '<h2>Votre lieu</h2><p>Le lieu sert à calculer les heures de prière. Il reste sur votre appareil.</p>' +
      '<p><button class="btn big" id="gps">Utiliser ma position</button></p>' +
      '<div style="text-align:left"><label class="f" for="city">Ou choisir une ville</label><select id="city"><option value="">—</option>' + CITIES.map(function (c, i) { return '<option value="' + i + '">' + esc(c[0]) + '</option>'; }).join("") + '</select></div>' +
      '<p style="margin-top:1.2rem"><button class="btn alt" id="later">Plus tard</button></p>';
    return { title: "Bienvenue", html: '<div class="ob">' + bar + html + '</div>', bare: true, tab: null, bind: function (r) {
      var sk = $("#skip", r); if (sk) sk.onclick = finishOb;
      if (typeof bindLang === "function") bindLang(r);
      if (e === 3) {
        bindProfilForm(r);
        $("#go", r).onclick = function () { submitProfil(r).then(function (id) { if (!id) return; switchProfile(id); location.hash = "#/bienvenue?e=4"; }); };
        $("#skip3", r).onclick = function () { switchProfile(addProfile({ nom: "", type: "adulte" })); location.hash = "#/bienvenue?e=4"; };
      }
      if (e === 4) {
        var setL = function (l) { if (!STORE.profiles.length) switchProfile(addProfile({ nom: "", type: "adulte" })); S.settings.loc = l; save(); finishOb(); };
        $("#gps", r).onclick = function () {
          if (!navigator.geolocation) return toast("Géolocalisation indisponible. Choisissez une ville.");
          navigator.geolocation.getCurrentPosition(function (p) { setL({ name: "Ma position (GPS)", lat: +p.coords.latitude.toFixed(4), lng: +p.coords.longitude.toFixed(4), tz: Intl.DateTimeFormat().resolvedOptions().timeZone }); },
            function () { toast("Position refusée ou indisponible. Choisissez une ville."); }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
        };
        $("#city", r).onchange = function (ev) { if (ev.target.value === "") return; var c = CITIES[+ev.target.value]; setL({ name: c[0], lat: c[1], lng: c[2], tz: c[3] }); };
        $("#later", r).onclick = finishOb;
      }
    } };
  });

  route(/^\/profils$/, function () {
    return guardParent(function () {
      var html = '<h2>Profils</h2><p class="muted">Jusqu\'à ' + MAXP + ' profils sur cet appareil. Chacun garde ses points, sa lecture et son parcours.</p>';
      html += STORE.profiles.map(function (p, i) {
        var act = p.id === STORE.active;
        return '<div class="card"><div class="row between"><div><strong>' + esc(p.nom || ("Profil " + (i + 1))) + '</strong><div class="muted">' + esc(TYPES[p.type] || "Adulte") + (p.age ? ", " + p.age + " ans" : "") + '</div></div>' +
          (act ? '<span class="pill" style="border-color:var(--gold);color:var(--gold)">Profil actif</span>' : '') + '</div><p class="row" style="margin:.7rem 0 0">' +
          (act ? '' : '<button class="btn" data-use="' + p.id + '">Utiliser ce profil</button>') + (STORE.profiles.length > 1 ? '<button class="btn danger" data-del="' + p.id + '">Supprimer</button>' : '') + '</p></div>';
      }).join("");
      html += STORE.profiles.length < MAXP ? '<p><a class="btn alt" href="#/profils/nouveau">Ajouter un profil</a></p>' : '<p class="muted">Le nombre maximal de profils est atteint.</p>';
      html += '<p class="muted">Quitter un profil enfant, ouvrir ses réglages ou valider ses paliers demande le code parental.</p>';
      return { title: "Profils", html: html, back: "#/plus", bind: function (r) {
        $$("[data-use]", r).forEach(function (b) { b.onclick = function () { switchProfile(b.dataset.use); toast("Profil changé."); location.hash = "#/"; }; });
        $$("[data-del]", r).forEach(function (b) { b.onclick = function () {
          if (!confirm("Supprimer ce profil et toutes ses données ?")) return;
          askPin("Code parental").then(function (ok) {
            if (!ok) return;
            var id = b.dataset.del;
            STORE.profiles = STORE.profiles.filter(function (x) { return x.id !== id; }); delete STORE.data[id];
            if (STORE.active === id) { STORE.active = STORE.profiles[0].id; S = curData(); }
            save(); applyTheme(); toast("Profil supprimé."); render();
          });
        }; });
      } };
    });
  });
  route(/^\/profils\/nouveau$/, function () {
    return guardParent(function () {
      var html = '<h2>Nouveau profil</h2>' + profilFormHTML() + '<p class="row" style="margin-top:1rem"><button class="btn" id="go">Créer le profil</button><a class="btn alt" href="#/profils">Annuler</a></p>';
      return { title: "Nouveau profil", html: html, back: "#/profils", bind: function (r) {
        bindProfilForm(r);
        $("#go", r).onclick = function () { submitProfil(r).then(function (id) { if (!id) return; pf = { nom: "", type: null, age: "" }; switchProfile(id); toast("Profil créé."); location.hash = "#/"; }); };
      } };
    });
  });

  /* ------------------------------------------------------------ objectifs du jour */
  var dz = { k: null, n: 0 };
  route(/^\/jour$/, function (m, params) {
    return Promise.all([loadQ(), loadOpt()]).then(function (res) {
      var q = res[0], opt = res[1], qt = opt.quot || {}, d = dayRec();
      var AS = activeSteps(), pos = params.k ? posOf(params.k) : Math.max(1, Math.min(AS.length + 1, +params.e || firstPos(d)));
      var e = pos <= AS.length ? AS[pos - 1][2] : 5;
      var key = e <= 4 ? OBJ[e - 1][0] : null, done = !!(key && d.f[key]), nextHref = "#/jour?e=" + (pos + 1), bind = null;
      var html = e <= 4 ? '<div class="prog"><div class="bar"><i style="width:' + Math.round(pos * 100 / AS.length) + '%"></i></div><span class="muted">' + pos + ' / ' + AS.length + '</span></div>' : '';
      var doneNote = done ? '<div class="callout">Objectif déjà validé aujourd\'hui.</div>' : '';
      function nav(lbl) { return '<p class="row">' + (done ? '<a class="btn" href="' + nextHref + '">Suivant</a>' : '<button class="btn" id="ok">' + lbl + '</button><a class="btn alt" href="' + nextHref + '">Passer</a>') + '</p>'; }
      function give() { var p = award(key); toast(p ? "+" + p + " points" : "Objectif validé."); location.hash = nextHref; }
      function validate(r, before) { var b = $("#ok", r); if (b) b.onclick = function () { if (before) before(); give(); }; }
      if (e === 1) {
        var nx = done ? [] : kNext(q, S.settings.dose || 5);
        html += '<h2>Lecture du jour</h2>' + doneNote;
        if (nx.length) {
          var s0 = nx[0].s;
          html += '<p class="muted">' + esc(surahLabel(s0)) + (nx.length > 1 ? ', versets ' + nx[0].a + ' à ' + nx[nx.length - 1].a : ', verset ' + nx[0].a) + '. Lire lentement, à voix haute si possible.</p>';
          if (nx[0].i === 0) html += basmalaHTML(q, s0.n);
          html += '<div class="card">' + nx.map(function (v) {
            return '<div class="vline"><div class="ar-line mushaf" lang="ar" dir="rtl">' + esc(v.t) + '</div>' + phonLine(v.s.n, v.a, q) + '</div>';
          }).join("") + '</div>' + arSeulHTML() + '<p class="muted">Texte : riwaya de Warsh ʿan Nâfiʿ. ' + NOTE_PHON + '</p>' + nav("J'ai lu ces versets");
        } else if (!done) html += '<div class="callout">Toutes les sourates sont marquées comme lues. Le khatm peut être recommencé depuis « Ma lecture complète du Coran ».</div>' + nav("J'ai fait ma lecture du jour");
        else html += '<p class="row"><a class="btn" href="' + nextHref + '">Suivant</a><a class="btn alt" href="#/reciter">Lire encore</a></p>';
        bind = function (r) { bindArSeul(r); validate(r, function () { nx.forEach(function (v) { kMark(v.s.n, v.a, true); }); if (nx.length) { var l = nx[nx.length - 1]; S.last = { s: l.s.n, a: l.a }; } }); };
      } else if (e === 2) {
        var dv = dailyVerse(q);
        html += '<h2>Verset du jour</h2>' + doneNote + verseHTML(q, dv.sn, dv.a) + arSeulHTML() +
          '<p>Lire ce verset, puis garder un instant de silence pour y réfléchir.</p><p class="row"><a class="btn alt" href="#/mediter">Écrire dans mon journal</a></p>' + nav("J'ai médité ce verset");
        bind = function (r) { bindArSeul(r); validate(r); };
      } else if (e === 3) {
        var L3 = qt.dhikr || [], it = L3.length ? L3[dayIndex() % L3.length] : null, cible = it ? (isChild() ? Math.min(11, it.cible) : it.cible) : 0;
        if (dz.k !== today()) dz = { k: today(), n: 0 };
        html += '<h2>Dhikr du jour</h2>' + doneNote;
        if (!it) html += '<div class="callout warn">Contenu indisponible : une connexion est nécessaire au premier chargement.</div>';
        else html += '<div class="card counter"><div class="flashA ar" lang="ar" dir="rtl">' + esc(it.ar) + '</div><p><strong>' + esc(it.ph) + '</strong><br><span class="muted">translittération : ' + esc(it.tr) + '</span></p><p>' + esc(it.fr) + '</p>' +
          '<div class="num" id="dn" aria-live="polite">' + dz.n + ' / ' + cible + '</div><div class="bar"><i id="db" style="width:' + Math.min(100, Math.round(100 * dz.n / cible)) + '%"></i></div>' +
          '<p><button class="tap" id="dt">Toucher pour compter</button></p></div>' + NOTE_VALIDATION;
        html += done ? '<p class="row"><a class="btn" href="' + nextHref + '">Suivant</a></p>' :
          '<p class="row"><button class="btn" id="ok"' + (it && dz.n >= cible ? "" : " disabled") + '>J\'ai terminé ce dhikr</button><button class="btn alt" id="okAlt">Déjà fait sans compter</button><a class="btn alt" href="' + nextHref + '">Passer</a></p>';
        bind = function (r) {
          var t = $("#dt", r);
          if (t) t.onclick = function () {
            dz.n++; if (navigator.vibrate) navigator.vibrate(12);
            $("#dn", r).textContent = dz.n + " / " + cible; $("#db", r).style.width = Math.min(100, Math.round(100 * dz.n / cible)) + "%";
            var ok = $("#ok", r); if (ok && dz.n >= cible) ok.disabled = false;
          };
          validate(r); var alt = $("#okAlt", r); if (alt) alt.onclick = give;
        };
      } else if (e === 4) {
        var H = qt.hadiths || [], hd = H.length ? H[dayIndex() % H.length] : null;
        html += '<h2>Hadith du jour</h2>' + doneNote;
        if (!hd) html += '<div class="callout warn">Contenu indisponible : une connexion est nécessaire au premier chargement.</div>';
        else html += '<div class="card"><blockquote class="hq">' + esc(hd.sens) + '</blockquote><p class="muted">Sens du hadith, dans une formulation simplifiée. ' + esc(qt.hadith_source || "") + ', n° ' + hd.n + '. Rapporté par ' + esc(hd.rapporteur) + ' ; recueils : ' + esc(hd.recueils) + '.</p></div>' + NOTE_VALIDATION +
          '<p>Une question à se poser : comment mettre cette parole en pratique aujourd\'hui ?</p>';
        html += nav("J'ai lu et médité");
        bind = function (r) { validate(r); };
      } else {
        var n5 = 0, NA = AS.length; AS.forEach(function (o) { if (d.f[o[0]]) n5++; });
        html += '<h2>Bilan du jour</h2><div class="card"><p class="big" style="font-size:1.6rem">' + n5 + ' objectif' + (n5 > 1 ? "s" : "") + ' sur ' + NA + '</p><p>' + d.p + ' points de pratique aujourd\'hui (plafond quotidien : ' + CAP + ').</p>' + weekHTML() +
          '<p class="muted" style="margin-top:.8rem">Les points sont privés : ni classement, ni pénalité. Ce qui compte, c\'est la régularité.</p></div>' +
          (n5 < NA ? '<p class="row"><a class="btn" href="#/jour?e=' + firstPos(d) + '">Reprendre mes objectifs</a></p>' : '<p>À demain, si Dieu le veut.</p>') +
          '<p class="row"><a class="btn' + (n5 < NA ? " alt" : "") + '" href="#/parcours">Continuer mon parcours</a><a class="btn alt" href="#/">Retour à l\'accueil</a></p>';
      }
      return { title: "Objectifs du jour", html: html, back: "#/", tab: "#/", bind: bind };
    });
  });

  /* ------------------------------------------------------------ khatm : lecture complète */
  route(/^\/khatm$/, function () {
    return loadQ().then(function (q) {
      var st = kStats(q), dose = S.settings.dose || 5, mode = S.settings.lecture || "debutant";
      var html = '<h2>Ma lecture complète du Coran</h2><div class="card"><p class="big" style="font-size:1.6rem">' + st.v.toLocaleString("fr-FR") + ' / ' + st.tot.toLocaleString("fr-FR") + ' versets lus</p>' +
        '<div class="bar"><i style="width:' + st.pct + '%"></i></div><p class="muted" style="margin-top:.5rem">' + String(st.pct).replace(".", ",") + ' % · ' + st.s + ' / 114 sourates terminées' + (S.khatm.since ? ' · commencé le ' + esc(S.khatm.since.split("-").reverse().join("/")) : '') + '</p>' +
        '<p class="row"><a class="btn" href="#/jour?k=lecture">Lecture du jour</a><a class="btn alt" href="#/reciter">Choisir une sourate</a></p></div>' +
        '<div class="card"><h3>Réglage de la lecture du jour</h3><label class="f" for="kd">Nombre de versets par jour</label><select id="kd">' + [3, 5, 10, 20].map(function (n) { return '<option value="' + n + '"' + (dose === n ? " selected" : "") + '>' + n + ' versets</option>'; }).join("") + '</select>' +
        '<label class="f" for="km">Ordre de lecture</label><select id="km"><option value="debutant"' + (mode === "debutant" ? " selected" : "") + '>Débutant : Al-Fâtiha et sourates courtes d\'abord</option><option value="mushaf"' + (mode === "mushaf" ? " selected" : "") + '>Ordre du Coran, de la sourate 1 à la sourate 114</option></select>' +
        '<p class="muted">La lecture du jour rapporte ' + PTS.lecture + ' points, une fois par jour. Dans le lecteur, le bouton « Marquer lu » fait aussi avancer le khatm.</p></div>';
      var prog = q.suras.filter(function (s) { return kRead(s.n).length > 0; });
      html += '<h3>Sourates commencées</h3><ul class="list">' + (prog.map(function (s) {
        var n = Math.min(kRead(s.n).length, s.v.length);
        return '<li><a href="#/reciter/' + s.n + '"><span class="badge">' + s.n + '</span><span class="nm">' + esc(s.fr) + '<small>' + n + ' / ' + s.v.length + ' versets lus' + (n >= s.v.length ? " · terminée" : "") + '</small></span><span class="ar">' + esc(s.ar) + '</span></a></li>';
      }).join("") || '<li class="muted">Aucune sourate commencée.</li>') + '</ul><p style="margin-top:1rem"><button class="btn danger" id="kr">Recommencer le khatm à zéro</button></p>';
      return { title: "Khatm", html: html, back: "#/plus", tab: "#/reciter", bind: function (r) {
        $("#kd", r).onchange = function (ev) { S.settings.dose = +ev.target.value; save(); toast("Réglage enregistré."); };
        $("#km", r).onchange = function (ev) { S.settings.lecture = ev.target.value; save(); toast("Réglage enregistré."); };
        $("#kr", r).onclick = function () {
          if (!confirm("Remettre la progression du khatm à zéro ? Les points acquis sont conservés.")) return;
          (isChild() ? askPin("Code parental") : Promise.resolve(true)).then(function (ok) { if (!ok) return; S.khatm = { read: {}, since: null }; save(); toast("Khatm remis à zéro."); render(); });
        };
      } };
    });
  });

  /* ------------------------------------------------------------ parcours : paliers, étapes, leçons, quiz, fiches */
  function etapeOf(opt, pid, n) {
    var pal = palById(opt, pid); if (!pal || !pal.etapes) return null;
    for (var i = 0; i < pal.etapes.length; i++) if (pal.etapes[i].n === n) return { pal: pal, et: pal.etapes[i] };
    return null;
  }
  var NO_PARCOURS = { title: "Mon parcours", html: '<div class="callout warn">Le parcours n\'a pas pu être chargé : une connexion est nécessaire au premier chargement.</div><p><a class="btn" href="#/">Retour à l\'accueil</a></p>', back: "#/apprendre", tab: "#/apprendre" };
  function lockedView(back) { return { title: "Mon parcours", html: '<div class="callout">Cette partie s\'ouvrira quand la précédente sera terminée. Rien ne presse.</div><p><a class="btn" href="' + back + '">Retour</a></p>', back: back, tab: "#/apprendre" }; }

  route(/^\/parcours$/, function () {
    return loadOpt().then(function (opt) {
      if (!opt.parcours) return NO_PARCOURS;
      if (!S.parcours.opened) { S.parcours.opened = today(); save(); }
      var st = parcoursNow(opt), pal = st.pal, kid = isChild(), seuil = pal.seuil || 0, pct = seuil ? Math.min(100, Math.round(100 * st.pts / seuil)) : 0;
      var html = '<h2>Mon parcours</h2><div class="card"><div class="row between"><h3 style="margin:0">Palier : ' + esc(pal.nom) + '</h3>' + (seuil ? '<span class="pill">' + st.pts + ' / ' + seuil + ' points</span>' : '') + '</div>' +
        (pal.but ? '<p>' + esc(pal.but) + '</p>' : '') + (seuil ? '<div class="bar"><i style="width:' + pct + '%"></i></div>' : '') +
        '<p class="muted" style="margin-top:.6rem">Leçons et quiz : ' + lessonPts(opt) + ' · Objectifs du jour : ' + (S.pts.pratique || 0) + ' · Prières : ' + (S.pts.prieres || 0) + '</p>' +
        (kid ? '' : '<p class="muted">Parcours ouvert le ' + esc(S.parcours.opened.split("-").reverse().join("/")) + ' · temps passé dans NÛR : ' + durTxt(S.temps) + ' (pour information seulement).</p>') + '</div>';
      if (pal.etapes) {
        html += '<h3>Les étapes</h3><ul class="list">' + pal.etapes.map(function (et) {
          var s = etapeState(pal.id, et), open = etapeOpen(pal, et.n);
          var sub = s.complete ? "Étape terminée" : (open ? s.lec + " / " + s.tot + " leçons · quiz " + (s.quiz ? "réussi" : "à faire") : "S'ouvre après l'étape " + (et.n - 1));
          return '<li class="' + (open ? "" : "locked") + '"><a href="#/parcours/' + pal.id + '/' + et.n + '"><span class="badge">' + (s.complete ? "✓" : et.n) + '</span><span class="nm">' + esc(et.titre) + '<small>' + esc(sub) + '</small></span></a></li>';
        }).join("") + '</ul>';
        var c1 = st.done === st.tot, c2 = st.pts >= seuil;
        html += '<div class="card"><h3>Passer au palier suivant</h3><ul class="plain"><li>' + (c1 ? "✓" : "○") + ' Toutes les étapes terminées : ' + st.done + ' / ' + st.tot + '</li><li>' + (c2 ? "✓" : "○") + ' Seuil de points atteint : ' + st.pts + ' / ' + seuil + '</li><li>○ Validation orale auprès d\'un imam ou d\'un cheikh, déclarée ci-dessous</li></ul>';
        if (c1 && c2) html += '<label class="chk" style="margin-top:.6rem"><input type="checkbox" id="dcl"> Je déclare avoir validé ce palier oralement auprès d\'un imam ou d\'un cheikh.</label>' +
          '<label class="f" for="dim">Nom de l\'imam ou du cheikh (facultatif)</label><input type="text" id="dim" maxlength="60" autocomplete="off"><p class="row" style="margin-top:.8rem"><button class="btn" id="dgo">Déclarer le palier</button></p>' +
          (kid ? '<p class="muted">Pour un profil enfant, le code parental est demandé.</p>' : '');
        else html += '<p class="muted">La déclaration s\'ouvrira lorsque les deux premières conditions seront remplies. Les points manquants se gagnent avec les objectifs du jour.</p>';
        html += '</div>';
      } else html += '<div class="callout">' + esc(pal.etat || "Contenu en préparation.") + '</div>';
      html += '<h3>Les paliers</h3>' + paliers(opt).map(function (p) {
        var dc = S.parcours.declared[p.id], cur = p.id === pal.id, titres = p.titres || (p.etapes || []).map(function (x) { return x.titre; });
        return '<details class="card"' + (cur ? " open" : "") + '><summary><strong>' + esc(p.nom) + '</strong>' + (p.repere ? ' <span class="muted">(' + esc(p.repere) + ')</span>' : '') + ' <span class="pill">' + (dc ? "déclaré le " + esc(dc.date.split("-").reverse().join("/")) : (cur ? "en cours" : (p.seuil ? p.seuil + " points" : "à venir"))) + '</span></summary>' +
          (p.etat ? '<p class="muted">' + esc(p.etat) + '</p>' : '') + (titres.length ? '<ol>' + titres.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join("") + '</ol>' : '') + '</details>';
      }).join("");
      html += '<div class="callout">Les points sont privés : ni classement, ni pénalité. Les quiz se reprennent à volonté. ' + esc(opt.parcours.note || "") + '</div>';
      return { title: "Mon parcours", html: html, back: "#/apprendre", tab: "#/apprendre", bind: function (r) {
        var go = $("#dgo", r);
        if (go) go.onclick = function () {
          if (!$("#dcl", r).checked) return toast("Cochez d'abord la déclaration.");
          var nom = $("#dim", r).value.trim().slice(0, 60);
          (kid ? askPin("Code parental (validation par l'adulte)") : Promise.resolve(true)).then(function (ok) {
            if (!ok) return;
            S.parcours.declared[pal.id] = { date: today(), imam: nom }; S.parcours.base = totalPts(opt); save();
            toast("Palier " + pal.nom + " déclaré."); render();
          });
        };
      } };
    });
  });

  var lastQuiz = null;
  route(/^\/parcours\/([a-z]+)\/(\d+)\/quiz$/, function (m) {
    return loadOpt().then(function (opt) {
      var x = opt.parcours && etapeOf(opt, m[1], +m[2]); if (!x) return NO_PARCOURS;
      var pal = x.pal, et = x.et, back = "#/parcours/" + pal.id + "/" + et.n, key = pal.id + "." + et.n, B = bareme(opt), s = etapeState(pal.id, et);
      if (!etapeOpen(pal, et.n) || s.lec < s.tot) return lockedView(back);
      var res = lastQuiz && lastQuiz.key === key ? lastQuiz : null;
      var html = '<h2>Quiz : ' + esc(et.titre) + '</h2>';
      if (res) html += '<div class="callout' + (res.ok ? "" : " warn") + '"><strong>' + res.good + ' bonne' + (res.good > 1 ? "s" : "") + ' réponse' + (res.good > 1 ? "s" : "") + ' sur ' + et.quiz.length + ' (' + res.pct + ' %).</strong> ' +
        (res.ok ? "Quiz réussi." + (res.gain ? " +" + res.gain + " points." : "") : "Il faut " + B.quiz_seuil + " % pour valider. Le quiz se reprend à volonté, sans pénalité.") + '</div>';
      else html += '<p class="muted">' + et.quiz.length + ' questions. Il faut ' + B.quiz_seuil + ' % de bonnes réponses. Le quiz se reprend à volonté, sans pénalité.</p>';
      html += '<form class="qz" id="qf">' + et.quiz.map(function (qq, i) {
        return '<fieldset><legend>' + (i + 1) + '. ' + esc(qq.q) + '</legend>' + qq.c.map(function (c, j) {
          var mark = "";
          if (res) { if (j === qq.r) mark = ' <span class="ok">bonne réponse</span>'; else if (res.ans[i] === j) mark = ' <span class="ko">votre réponse</span>'; }
          return '<label><input type="radio" name="q' + i + '" value="' + j + '"' + (res ? (res.ans[i] === j ? " checked" : "") + " disabled" : "") + '> <span>' + esc(c) + mark + '</span></label>';
        }).join("") + '</fieldset>';
      }).join("") + '</form>';
      html += res ? '<p class="row">' + (res.ok ? '<a class="btn" href="#/parcours">Retour au parcours</a>' : '<button class="btn" id="again">Recommencer le quiz</button>') + '<a class="btn alt" href="' + back + '">Retour à l\'étape</a>' + (res.ok ? '<button class="btn alt" id="again">Refaire le quiz</button>' : '') + '</p>' :
        '<p class="row"><button class="btn" id="send">Valider mes réponses</button><a class="btn alt" href="' + back + '">Retour à l\'étape</a></p>';
      return { title: "Quiz", html: html, back: back, tab: "#/apprendre", bind: function (r) {
        var ag = $("#again", r); if (ag) ag.onclick = function () { lastQuiz = null; render(); window.scrollTo(0, 0); };
        var sd = $("#send", r);
        if (sd) sd.onclick = function () {
          var ans = [], good = 0, miss = false;
          et.quiz.forEach(function (qq, i) { var c = $('input[name="q' + i + '"]:checked', r); if (!c) miss = true; else { ans[i] = +c.value; if (+c.value === qq.r) good++; } });
          if (miss) return toast("Répondez à toutes les questions.");
          var pct = Math.round(100 * good / et.quiz.length), ok = pct >= B.quiz_seuil, prev = S.parcours.quiz[key] || { ok: false, best: 0 }, gain = ok && !prev.ok ? B.quiz : 0;
          S.parcours.quiz[key] = { ok: prev.ok || ok, best: Math.max(prev.best || 0, pct) }; save();
          lastQuiz = { key: key, ans: ans, good: good, pct: pct, ok: ok, gain: gain }; render(); window.scrollTo(0, 0);
        };
      } };
    });
  });

  var fi = { key: null, i: 0, flip: false };
  route(/^\/parcours\/([a-z]+)\/(\d+)\/fiches$/, function (m) {
    return loadOpt().then(function (opt) {
      var x = opt.parcours && etapeOf(opt, m[1], +m[2]); if (!x) return NO_PARCOURS;
      var pal = x.pal, et = x.et, back = "#/parcours/" + pal.id + "/" + et.n, key = pal.id + "." + et.n, cards = [];
      if (!etapeOpen(pal, et.n)) return lockedView("#/parcours");
      et.lecons.forEach(function (l) {
        (l.mots || []).forEach(function (w) { cards.push({ a: w.ar, b: w.ph, c: "translittération : " + w.tr, d: w.fr }); });
        if (l.lettres) LETTERS.slice(l.lettres[0], l.lettres[1]).forEach(function (t) { cards.push({ a: t[0], b: t[1], c: "son : " + t[2], d: t[3] }); });
      });
      if (!cards.length) return { title: "Fiches", html: '<p>Aucune fiche pour cette étape.</p>', back: back, tab: "#/apprendre" };
      if (fi.key !== key) fi = { key: key, i: 0, flip: false };
      fi.i = Math.max(0, Math.min(cards.length - 1, fi.i));
      var c = cards[fi.i];
      var html = '<h2>Fiches de révision</h2><p class="muted">' + esc(et.titre) + ' · fiche ' + (fi.i + 1) + ' sur ' + cards.length + '. Toucher la fiche pour la retourner.</p>' +
        '<button class="card flash" id="fc" aria-live="polite">' + (fi.flip ? '<strong style="font-size:1.4rem">' + esc(c.b) + '</strong><span class="muted">' + esc(c.c) + '</span><span style="font-size:1.15rem;margin-top:.6rem">' + esc(c.d) + '</span>' : '<span class="a" lang="ar">' + esc(c.a) + '</span><span class="muted">Que veut dire ce mot ? Comment se lit-il ?</span>') + '</button>' +
        '<p class="row between"><button class="btn alt" id="fp"' + (fi.i === 0 ? " disabled" : "") + '>Précédente</button><button class="btn alt" id="fn"' + (fi.i === cards.length - 1 ? " disabled" : "") + '>Suivante</button></p>' +
        '<p><a class="btn alt" href="' + back + '">Retour à l\'étape</a></p>';
      return { title: "Fiches", html: html, back: back, tab: "#/apprendre", bind: function (r) {
        $("#fc", r).onclick = function () { fi.flip = !fi.flip; render(); };
        $("#fp", r).onclick = function () { fi.i--; fi.flip = false; render(); };
        $("#fn", r).onclick = function () { fi.i++; fi.flip = false; render(); };
      } };
    });
  });

  route(/^\/parcours\/([a-z]+)\/(\d+)\/(\d+)$/, function (m) {
    return Promise.all([loadQ(), loadOpt()]).then(function (res) {
      var q = res[0], opt = res[1], x = opt.parcours && etapeOf(opt, m[1], +m[2]); if (!x) return NO_PARCOURS;
      var pal = x.pal, et = x.et, li = +m[3], lc = et.lecons[li - 1], back = "#/parcours/" + pal.id + "/" + et.n, B = bareme(opt);
      if (!lc) return NO_PARCOURS;
      var key = pal.id + "." + et.n + "." + li, done = !!S.parcours.lecons[key];
      if (!etapeOpen(pal, et.n) || (li > 1 && !S.parcours.lecons[pal.id + "." + et.n + "." + (li - 1)])) return lockedView(back);
      var nextHref = li < et.lecons.length ? back + "/" + (li + 1) : back;
      var html = '<p class="muted">Étape ' + et.n + ' · leçon ' + li + ' sur ' + et.lecons.length + '</p><div class="lesson"><h2>' + esc(lc.titre) + '</h2>' + lc.texte.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join("");
      if (lc.lettres) html += '<div class="lgrid">' + LETTERS.slice(lc.lettres[0], lc.lettres[1]).map(function (l) {
        return '<div class="lcard"><div class="lg ar" lang="ar">' + l[0] + '</div><div><strong>' + esc(l[1]) + '</strong> <span class="pill">' + esc(l[2]) + '</span><div class="muted">' + esc(l[3]) + '</div></div></div>';
      }).join("") + '</div>';
      if (lc.versets) {
        var sv = q.byN[lc.versets.s];
        html += '<div class="card">' + lc.versets.a.map(function (a, k) {
          var v = sv.v.filter(function (z) { return z[0] === a; })[0];
          return '<div class="vline"><div class="ar-line mushaf" lang="ar" dir="rtl">' + esc(v ? v[1] : "") + '</div>' + phonLine(sv.n, a, q) + '<div class="trfr">' + esc(lc.versets.sens[k] || "") + '</div></div>';
        }).join("") + '</div>' + arSeulHTML() + '<p class="muted">Texte : riwaya de Warsh ʿan Nâfiʿ. ' + NOTE_PHON + ' Le sens en français est une formulation approchée, rédigée pour NÛR.</p>';
      }
      html += motsHTML(lc.mots) + (lc.source ? '<p class="muted">Source : ' + esc(lc.source) + '</p>' : '') + '<div class="callout"><strong>À retenir.</strong> ' + esc(lc.retenir || "") + '</div>' +
        (lc.lien ? '<p><a class="btn alt" href="' + esc(lc.lien.href) + '">' + esc(lc.lien.txt) + '</a></p>' : '') + '</div>' + NOTE_VALIDATION +
        '<p class="muted">Audio de la leçon : à venir, après accord des ayants droit.</p>' +
        '<p class="row">' + (done ? '<a class="btn" href="' + nextHref + '">' + (li < et.lecons.length ? "Leçon suivante" : "Retour à l'étape") + '</a><span class="pill">Leçon terminée</span>' : '<button class="btn" id="fin">J\'ai compris : leçon terminée</button>') + '<a class="btn alt" href="' + back + '">Retour à l\'étape</a></p>';
      return { title: "Leçon", html: html, back: back, tab: "#/apprendre", bind: function (r) {
        var f = $("#fin", r); bindArSeul(r);
        if (f) f.onclick = function () { S.parcours.lecons[key] = today(); save(); toast("+" + B.lecon + " points"); location.hash = nextHref; };
      } };
    });
  });

  route(/^\/parcours\/([a-z]+)\/(\d+)$/, function (m) {
    return loadOpt().then(function (opt) {
      var x = opt.parcours && etapeOf(opt, m[1], +m[2]); if (!x) return NO_PARCOURS;
      var pal = x.pal, et = x.et, s = etapeState(pal.id, et), base = "#/parcours/" + pal.id + "/" + et.n, B = bareme(opt);
      if (!etapeOpen(pal, et.n)) return lockedView("#/parcours");
      var html = '<p class="muted">' + esc(pal.nom) + ' · étape ' + et.n + ' sur ' + pal.etapes.length + '</p><h2>' + esc(et.titre) + '</h2><p>' + esc(et.resume || "") + '</p>' +
        '<h3>Les leçons</h3><ul class="list">' + et.lecons.map(function (l, i) {
          var dn = !!S.parcours.lecons[pal.id + "." + et.n + "." + (i + 1)], open = i === 0 || !!S.parcours.lecons[pal.id + "." + et.n + "." + i];
          return '<li class="' + (open ? "" : "locked") + '"><a href="' + base + '/' + (i + 1) + '"><span class="badge">' + (dn ? "✓" : (i + 1)) + '</span><span class="nm">' + esc(l.titre) + '<small>' + (dn ? "Terminée" : (open ? "+" + B.lecon + " points" : "S'ouvre après la leçon précédente")) + '</small></span></a></li>';
        }).join("") + '</ul>' +
        '<h3>Le quiz</h3><div class="card"><p>' + (s.quiz ? "Quiz réussi" + (s.best != null ? " (meilleur résultat : " + s.best + " %)." : ".") : (s.lec < s.tot ? "Le quiz s'ouvre quand les " + s.tot + " leçons sont terminées." : "Les leçons sont terminées : le quiz est ouvert." + (s.best != null ? " Meilleur résultat : " + s.best + " %." : ""))) + '</p>' +
        '<p class="row">' + (s.lec === s.tot ? '<a class="btn' + (s.quiz ? " alt" : "") + '" href="' + base + '/quiz">' + (s.quiz ? "Refaire le quiz" : "Passer le quiz (+" + B.quiz + " points)") + '</a>' : '') + '<a class="btn alt" href="' + base + '/fiches">Fiches de révision</a></p></div>';
      if (s.complete) {
        var nx = etapeOf(opt, pal.id, et.n + 1);
        html += '<div class="callout">Étape terminée. ' + (nx ? "L'étape suivante est ouverte." : "Toutes les étapes de ce palier sont terminées.") + '</div><p><a class="btn" href="' + (nx ? "#/parcours/" + pal.id + "/" + (et.n + 1) : "#/parcours") + '">' + (nx ? "Étape suivante : " + esc(nx.et.titre) : "Voir mon palier") + '</a></p>';
      }
      return { title: "Étape " + et.n, html: html, back: "#/parcours", tab: "#/apprendre" };
    });
  });
  route(/^\/offres$/, function () { location.hash = "#/parcours"; return { title: "NÛR", html: "" }; });

  /* ------------------------------------------------------------ routeur */
  var deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredPrompt = e; });
  var TABS = [["#/apprendre", "Apprendre", "✎"], ["#/priere", "Prière", "◎"], ["#/", "Quotidien", "☾"], ["#/reciter", "Coran", "❖"], ["#/plus", "Plus", "⋯"]];
  function drawPts(hide) {
    var el = $("#pts"); if (!el) return;
    if (hide || !STORE.active) { el.hidden = true; return; }
    loadOpt().then(function (opt) {
      var st = opt.parcours ? parcoursNow(opt) : null;
      el.textContent = totalPts(opt) + " pts" + (st ? " · " + st.pal.nom : "");
      el.setAttribute("aria-label", "Mes points : " + totalPts(opt) + (st ? ", palier " + st.pal.nom : "") + ". Ouvrir mon parcours.");
      el.hidden = false;
    }).catch(function () { el.hidden = true; });
  }
  function drawTabs(active) {
    $("#tabs").innerHTML = TABS.map(function (t) { return '<a href="' + t[0] + '"' + (t[0] === active ? ' aria-current="page"' : "") + '><span class="g" aria-hidden="true">' + t[2] + '</span>' + t[1] + '</a>'; }).join("");
  }
  var rendering = 0, prevHash = null;
  function render() {
    var token = ++rendering, keepScroll = prevHash === location.hash, y0 = window.scrollY || 0;
    prevHash = location.hash;
    cleanups.splice(0).forEach(function (f) { try { f(); } catch (e) {} });
    var raw = location.hash.replace(/^#/, "") || "/", qi = raw.indexOf("?"), path = qi >= 0 ? raw.slice(0, qi) : raw, params = {};
    if (qi >= 0) raw.slice(qi + 1).split("&").forEach(function (kv) { var p = kv.split("="); params[p[0]] = decodeURIComponent(p[1] || ""); });
    if (!STORE.onboarded && path.indexOf("/bienvenue") !== 0 && path !== "/carte") { try { if (path !== "/") sessionStorage.setItem("nur:next", location.hash); } catch (e) {} location.hash = "#/bienvenue"; return; }
    var found = null;
    for (var i = 0; i < routes.length; i++) { var m = routes[i][0].exec(path); if (m) { found = [routes[i][1], m]; break; } }
    if (!found) { found = [function () { return { title: "NÛR", html: '<p>Page introuvable. <a href="#/">Retour à l\'accueil</a></p>' }; }, []]; }
    Promise.resolve().then(function () { return found[0](found[1], params); }).then(function (v) {
      if (token !== rendering) return;
      var main = $("#main"); main.innerHTML = v.html;
      document.title = (v.title && v.title !== "NÛR" ? v.title + " — " : "") + "NÛR";
      $("#title").innerHTML = v.title === "NÛR" ? 'NÛR <span class="ar" aria-hidden="true">نور</span>' : esc(v.title);
      var back = $("#back"); back.hidden = !v.back; back.onclick = function () {
        if (v.kid && STORE.pin) { var c = prompt("Code parental"); if (c == null) return; pinHash(c).then(function (h) { if (h === STORE.pin) location.hash = v.back; else toast("Code incorrect."); }); }
        else if (v.back === "#/plus" && v.title === "Espace enfant" && STORE.pin) { var c2 = prompt("Code parental"); if (c2 == null) return; pinHash(c2).then(function (h) { if (h === STORE.pin) location.hash = v.back; else toast("Code incorrect."); }); }
        else location.hash = v.back;
      };
      drawTabs(v.tab === undefined ? null : v.tab); drawPts(!!v.bare);
      $("#tabs").hidden = !!v.bare; document.body.classList.toggle("enfant", isChild());
      if (v.bind) v.bind(main);
      $("#title").textContent = v.title === "NÛR" ? "NÛR" : tr(v.title || ""); if (v.title === "NÛR") $("#title").innerHTML = 'NÛR <span class="ar" aria-hidden="true">نور</span>';
      i18n(main); i18n($("#tabs")); setTimeout(function () { i18n($("#top")); }, 60);
      if (keepScroll) window.scrollTo(0, y0); else if (!params.a) window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    }).catch(function (e) {
      if (token !== rendering) return;
      $("#main").innerHTML = '<div class="callout warn">Impossible de charger le contenu (' + esc(e && e.message || "erreur") + '). Vérifiez la connexion pour le premier chargement, puis <a href="#/" onclick="location.reload()">réessayez</a>.</div>';
    });
  }
  window.addEventListener("hashchange", render);

  function applyTheme() { document.documentElement.setAttribute("data-theme", S.settings.theme || "auto"); document.documentElement.style.setProperty("--fs", S.settings.fs || 1); }
  var notifTimers = [];
  function notify(title, body, tag) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    var o = { body: tr(body), icon: "icon-192.png", badge: "icon-192.png", tag: tag || "nur", renotify: true, lang: UIL(), dir: LANG() === "ar" ? "rtl" : "ltr", data: { url: location.pathname + "#/priere" } };
    var fall = function () { try { new Notification(title, o); } catch (e) {} };
    if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then(function (r) { if (r && r.showNotification) r.showNotification(title, o).catch(fall); else fall(); }).catch(fall);
    else fall();
  }
  function scheduleNotifs() {
    notifTimers.forEach(clearTimeout); notifTimers = [];
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    var RP = S.settings.rappels || {};
    if (RP.routine || RP.verset) {
      var Lr = loc(), tn = ymd(Date.now(), Lr.tz), nine = Date.UTC(tn.y, tn.m - 1, tn.d, 9) - (new Date(new Date().toLocaleString("en-US", { timeZone: Lr.tz })) - new Date(new Date().toLocaleString("en-US", { timeZone: "UTC" }))), dl = nine - Date.now();
      if (dl < 0) dl += 864e5;
      notifTimers.push(setTimeout(function () { notify("NÛR", RP.routine ? "Tes objectifs du jour t'attendent." : "Ton verset du jour t'attend.", "nur-jour"); }, dl));
    }
    if (!S.settings.notif) return;
    var L = loc(), now = Date.now(), t0 = ymd(now, L.tz);
    [0, 1].forEach(function (off) {
      var T = timesFor(L, addDays(t0, off));
      ORDER.forEach(function (p) {
        if (S.settings.alerts && S.settings.alerts[p[0]] === false) return;
        var d = T[p[0]] - now;
        if (d > 0 && d < 36 * 3600e3) notifTimers.push(setTimeout(function () {
          notify("NÛR — " + p[1], "C'est l'heure de la prière.", "nur-" + p[0]);
        }, d));
      });
    });
  }
  function netState() { var n = $("#net"); n.textContent = navigator.onLine ? "" : "Hors ligne"; }
  window.addEventListener("online", netState); window.addEventListener("offline", netState);

  applyLang(); applyTheme(); netState(); render(); scheduleNotifs(); setTimeout(autoLocate, 1500);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") { autoLocate(); scheduleNotifs(); } });
  setInterval(function () {
    if (STORE.active && document.visibilityState !== "hidden") { S.temps = (S.temps || 0) + 60; save(); }
    if (location.hash === "" || location.hash === "#/") render();
  }, 60000);
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    var hadCtrl = !!navigator.serviceWorker.controller, reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () { if (hadCtrl && !reloaded) { reloaded = true; location.reload(); } });
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(function (reg) {
      reg.update();
      document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") reg.update(); });
    }).catch(function () {});
  }
  window.__NUR__ = { render: render, state: function () { return S; }, store: function () { return STORE; } };
})();
