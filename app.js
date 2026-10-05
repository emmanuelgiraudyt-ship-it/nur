/* NÛR — application installable (PWA). Aucun traceur, aucune publicité, aucune donnée envoyée à un serveur.
 * Toutes les données de l'utilisateur restent sur son appareil (stockage local). */
(function () {
  "use strict";
  var P = window.NurPrayer;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var VERSION = "1.0.0";
  var KEY = "nur:v1";

  /* ------------------------------------------------------------ état persistant */
  function DEF() {
    return {
      settings: { method: "MWL", theme: "auto", fs: 1, hijriOffset: 0, loc: null, offsets: {}, dhuhrMin: 0, customFajr: 18, customIsha: 17, pin: null, notif: false },
      last: null, bookmarks: [], hifz: {}, journal: [], gratitudes: [], intentions: [], stars: 0,
      tidj: { items: [], log: {} }
    };
  }
  function merge(d, r) {
    for (var k in r) {
      if (r[k] && typeof r[k] === "object" && !Array.isArray(r[k]) && d[k] && typeof d[k] === "object" && !Array.isArray(d[k])) merge(d[k], r[k]);
      else d[k] = r[k];
    }
    return d;
  }
  function load() { try { return merge(DEF(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return DEF(); } }
  var S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Enregistrement local impossible (stockage plein ou désactivé)."); } }
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 2600); }

  /* ------------------------------------------------------------ données du Coran */
  var Q = null;
  function loadQ() {
    if (Q) return Promise.resolve(Q);
    return fetch("quran.json").then(function (r) { if (!r.ok) throw new Error("data"); return r.json(); }).then(function (j) {
      j.byN = {}; j.suras.forEach(function (s) { j.byN[s.n] = s; }); Q = j; return Q;
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
  function fmtT(ts, tz) { if (!(ts === ts)) return "—"; return new Intl.DateTimeFormat("fr-FR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(ts)); }
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
      return new Intl.DateTimeFormat("fr-FR-u-ca-islamic-umalqura", { timeZone: L.tz, day: "numeric", month: "long", year: "numeric" }).format(new Date(now + shift * 864e5));
    } catch (e) { return ""; }
  }
  function gregStr() { return new Intl.DateTimeFormat("fr-FR", { timeZone: loc().tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()); }

  /* ------------------------------------------------------------ outils d'interface */
  var cleanups = [];
  function onLeave(fn) { cleanups.push(fn); }
  function surahLabel(s) { return s.n + ". " + s.en; }
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
  var NOTE_VALIDATION = '<div class="callout">Contenu rédigé pour cette version et <strong>à faire valider par l\'imam garant</strong> avant toute publication.</div>';

  /* ------------------------------------------------------------ vues */
  var routes = [];
  function route(re, fn) { routes.push([re, fn]); }

  // Accueil
  route(/^\/?$/, function () {
    var np = nextPrayer(), L = loc();
    var last = S.last, lastTxt = "";
    var html = '<div class="card"><div class="muted">' + esc(gregStr()) + '</div><div class="big" style="margin:.2rem 0">' + esc(hijriStr()) + '</div>';
    if (np) html += '<p style="margin:.4rem 0 0"><strong>' + np.name + ' à ' + fmtT(np.ts, np.tz) + '</strong> <span class="muted">(dans ' + countdown(np.ts) + ' — ' + esc(L.name) + ')</span></p>';
    html += '<p class="row" style="margin:.6rem 0 0"><a class="btn alt" href="#/prieres">Heures de prière et qibla</a></p></div>';
    html += '<div class="grid keep">' +
      '<a class="tile" href="#/apprendre"><strong>Apprendre</strong><span>Mémorisation, tajwid, parcours</span></a>' +
      '<a class="tile" href="#/reciter"><strong>Réciter</strong><span>Coran en Warsh ʿan Nâfiʿ</span></a>' +
      '<a class="tile" href="#/mediter"><strong>Méditer</strong><span>Verset du jour, journal</span></a>' +
      '<a class="tile" href="#/aimer"><strong>Aimer</strong><span>Gratitude, invocations, partage</span></a></div>';
    if (last) html += '<p style="margin-top:1rem"><a class="btn" href="#/reciter/' + last.s + '?a=' + last.a + '">Reprendre ma lecture</a></p>';
    html += '<p class="muted" style="margin-top:1.2rem">Sans publicité, sans traceur. Vos données restent sur votre appareil. <a href="#/plus">Plus d\'options</a>.</p>';
    return { title: "NÛR", html: html, tab: "#/" };
  });

  // Plus (menu secondaire)
  route(/^\/plus$/, function () {
    var html = '<ul class="list">' +
      '<li><a href="#/prieres"><span class="nm">Heures de prière et qibla</span></a></li>' +
      '<li><a href="#/tidjaniya"><span class="nm">Tidjaniya — compteurs de dhikr<small>Contenus à fournir par votre mouqaddam</small></span></a></li>' +
      '<li><a href="#/enfant"><span class="nm">Espace enfant<small>Sourates courtes, étoiles</small></span></a></li>' +
      '<li><a href="#/reglages"><span class="nm">Réglages</span></a></li>' +
      '<li><a href="#/apropos"><span class="nm">À propos, sources et licences</span></a></li></ul>' +
      '<div id="install" class="card" hidden><p>Installer NÛR sur cet appareil pour l\'utiliser hors ligne.</p><button class="btn" id="doInstall">Installer l\'application</button></div>' +
      '<div class="callout">Sur iPhone ou iPad : ouvrez ce site dans Safari, touchez « Partager », puis « Sur l\'écran d\'accueil ».</div>';
    return { title: "Plus", html: html, back: "#/", bind: function (r) {
      if (deferredPrompt) { $("#install", r).hidden = false; $("#doInstall", r).onclick = function () { deferredPrompt.prompt(); deferredPrompt = null; $("#install", r).hidden = true; }; }
    } };
  });

  // Réciter : liste
  route(/^\/reciter$/, function () {
    return loadQ().then(function (q) {
      var html = '<h2>Réciter</h2><label class="f" for="q">Rechercher une sourate (nom ou numéro)</label><input type="search" id="q" placeholder="Ex. 18, Al-Kahf, الكهف" autocomplete="off">' +
        (S.last ? '<p style="margin-top:.8rem"><a class="btn" href="#/reciter/' + S.last.s + '?a=' + S.last.a + '">Reprendre : ' + esc(q.byN[S.last.s].en) + ', verset ' + S.last.a + '</a></p>' : '') +
        '<ul class="list" id="sl" style="margin-top:1rem">' + q.suras.map(function (s) {
          return '<li data-k="' + esc((s.n + " " + s.en + " " + s.ar).toLowerCase()) + '"><a href="#/reciter/' + s.n + '"><span class="badge">' + s.n + '</span><span class="nm">' + esc(s.en) + '<small>' + s.v.length + ' versets</small></span><span class="ar">' + esc(s.ar) + '</span></a></li>';
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
  var readMode = "lecture";
  function readerHTML(s, q, mode) {
    var mem = S.hifz[s.n] || [], bms = S.bookmarks;
    var out = '<div class="suraHead">' + esc(s.ar) + '</div>';
    if (s.n !== 1 && s.n !== 9) out += '<div class="basmala">' + esc(q.basmala) + '</div>';
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
      out += '<span class="' + cls + '" role="button" tabindex="0" data-a="' + v[0] + '" aria-label="Verset ' + v[0] + '">' + txt + '</span> ';
    });
    return out + '</div>';
  }
  function readerView(sn, params, kid) {
    return loadQ().then(function (q) {
      var s = q.byN[sn]; if (!s) return { title: "Introuvable", html: '<p>Sourate introuvable.</p>', back: "#/reciter" };
      var mode = kid ? "lecture" : readMode;
      var mem = (S.hifz[sn] || []).length;
      var html = '<div class="row between"><h2 style="margin:0">' + esc(surahLabel(s)) + '</h2><span class="pill">' + s.v.length + ' versets</span></div>';
      if (!kid) {
        html += '<div class="row" style="margin:.7rem 0"><label class="f" for="mode" style="margin:0">Mode</label><select id="mode" style="max-width:260px">' +
          '<option value="lecture"' + (mode === "lecture" ? " selected" : "") + '>Lecture</option>' +
          '<option value="premier"' + (mode === "premier" ? " selected" : "") + '>Récitation : premier mot visible</option>' +
          '<option value="masque"' + (mode === "masque" ? " selected" : "") + '>Récitation : texte masqué</option></select>' +
          '<button class="btn alt" id="fm" aria-label="Réduire la taille du texte">A−</button><button class="btn alt" id="fp" aria-label="Augmenter la taille du texte">A+</button></div>' +
          '<div class="muted">Mémorisés : ' + mem + ' / ' + s.v.length + '</div><div class="bar"><i style="width:' + Math.round(100 * mem / s.v.length) + '%"></i></div>' +
          '<p class="muted">Touchez un verset pour le marquer, le garder en signet ou le méditer. En mode récitation, touchez pour révéler.</p>';
      } else html += '<p class="muted">Touchez un verset après l\'avoir répété pour gagner une étoile.</p>';
      html += readerHTML(s, q, mode) + '<div id="sheetBox"></div>';
      if (!kid) {
        html += '<div class="row between" style="margin-top:1rem">' + (sn > 1 ? '<a class="btn alt" href="#/reciter/' + (sn - 1) + '">Sourate précédente</a>' : '<span></span>') +
          (sn < 114 ? '<a class="btn alt" href="#/reciter/' + (sn + 1) + '">Sourate suivante</a>' : '<span></span>') + '</div>';
        html += '<p class="muted">Texte : complexe du Roi Fahd (KFGQPC), riwaya de Warsh ʿan Nâfiʿ. Traduction française et translittération : non incluses dans cette version.</p>';
      }
      return { title: s.en, html: html, back: kid ? "#/enfant" : "#/reciter", tab: kid ? null : "#/reciter", kid: kid, bind: function (r) {
        var sel = null;
        if (!kid) {
          $("#mode", r).onchange = function (e) { readMode = e.target.value; render(); };
          $("#fm", r).onclick = function () { S.settings.fs = Math.max(.8, +(S.settings.fs - .1).toFixed(1)); save(); applyTheme(); };
          $("#fp", r).onclick = function () { S.settings.fs = Math.min(1.8, +(S.settings.fs + .1).toFixed(1)); save(); applyTheme(); };
        }
        if (kid) { document.body.classList.add("kid"); onLeave(function () { document.body.classList.remove("kid"); }); }
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
          box.innerHTML = '<div class="sheet"><strong>' + esc(s.en) + ', verset ' + a + '</strong>' +
            '<button class="btn alt" id="aMem">' + (isMem ? "Retirer des mémorisés" : "Marquer mémorisé") + '</button>' +
            '<button class="btn alt" id="aBm">' + (isBm ? "Retirer le signet" : "Signet") + '</button>' +
            '<a class="btn alt" href="#/mediter/' + sn + '/' + a + '">Méditer</a>' +
            '<button class="btn alt" id="aSh">Partager la référence</button></div>';
          $("#aMem", box).onclick = function () {
            var m = S.hifz[sn] || []; var i = m.indexOf(a); if (i >= 0) m.splice(i, 1); else m.push(a); S.hifz[sn] = m; save(); render();
          };
          $("#aBm", box).onclick = function () { var i = S.bookmarks.indexOf(sn + ":" + a); if (i >= 0) S.bookmarks.splice(i, 1); else S.bookmarks.push(sn + ":" + a); save(); render(); };
          $("#aSh", box).onclick = function () { share("NÛR", "Sourate " + s.en + " (" + sn + "), verset " + a + " — à lire dans NÛR."); };
        }
        $$(".v", r).forEach(function (el) {
          el.addEventListener("click", function () { pick(el); });
          el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(el); } });
        });
        if (startA) { var t = $('.v[data-a="' + startA + '"]', r); if (t) { if (t.scrollIntoView) t.scrollIntoView({ block: "center" }); t.classList.add("sel"); } }
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
      var html = '<h2>Apprendre</h2><div class="card"><h3>Parcours de mémorisation</h3><p>Commencez par les dernières sourates, courtes et fréquemment récitées, puis remontez progressivement. Ouvrez une sourate, choisissez le mode « premier mot visible » ou « texte masqué », puis marquez chaque verset mémorisé.</p>' +
        '<ul class="list">' + [114, 113, 112, 111, 110, 109, 108, 107, 106, 105].map(function (n) {
          var s = q.byN[n], m = (S.hifz[n] || []).length;
          return '<li><a href="#/reciter/' + n + '"><span class="badge">' + n + '</span><span class="nm">' + esc(s.en) + '<small>' + m + ' / ' + s.v.length + ' mémorisés</small></span><span class="ar">' + esc(s.ar) + '</span></a></li>';
        }).join("") + '</ul></div>';
      if (started.length) html += '<div class="card"><h3>Mon suivi</h3><ul class="list">' + started.map(function (s) {
        var m = S.hifz[s.n].length;
        return '<li><a href="#/reciter/' + s.n + '"><span class="badge">' + s.n + '</span><span class="nm">' + esc(s.en) + '<small>' + m + ' / ' + s.v.length + '</small></span></a></li>';
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
    return '<div class="card"><div class="muted">' + esc(s.en) + ', verset ' + a + '</div><div class="mushaf" style="margin-top:.5rem">' + esc(v[1]) + '</div></div>';
  }
  route(/^\/mediter(?:\/(\d+)\/(\d+))?$/, function (m) {
    return loadQ().then(function (q) {
      var sn, a, daily = false;
      if (m[1]) { sn = +m[1]; a = +m[2]; }
      else { var pool = versePool(q), L = loc(), t = ymd(Date.now(), L.tz); var idx = Math.floor(Date.UTC(t.y, t.m - 1, t.d) / 864e5) % pool.length; sn = pool[idx][0]; a = pool[idx][1]; daily = true; }
      var html = '<h2>Méditer</h2><h3 style="margin-top:0">' + (daily ? "Verset du jour" : "Verset choisi") + '</h3>' + verseHTML(q, sn, a) +
        '<p class="muted">Ce verset est tiré des sourates courtes (91 à 114). Pour méditer un autre verset, ouvrez-le dans « Réciter » puis touchez « Méditer ».</p>' +
        '<label class="f" for="note">Ma méditation (enregistrée sur cet appareil)</label><textarea id="note" rows="5"></textarea>' +
        '<p><button class="btn" id="saveNote">Enregistrer</button></p><h3>Mon journal</h3><ul class="list" id="jl"></ul>';
      return { title: "Méditer", html: html, tab: "#/mediter", bind: function (r) {
        function drawJ() {
          $("#jl", r).innerHTML = S.journal.slice().reverse().slice(0, 30).map(function (e) {
            var s = q.byN[e.s];
            return '<li><div class="card"><div class="muted">' + esc(e.date) + ' — ' + esc(s ? s.en : "") + ', verset ' + e.a + '</div><div>' + esc(e.text).replace(/\n/g, "<br>") + '</div><button class="btn danger" data-id="' + e.id + '" style="margin-top:.5rem">Supprimer</button></div></li>';
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
        [112, 108, 103, 110, 113, 114, 109, 111, 105, 107].map(function (n) { var s = q.byN[n]; return '<li><a href="#/enfant/' + n + '"><span class="badge">' + n + '</span><span class="nm">' + esc(s.en) + '</span><span class="ar">' + esc(s.ar) + '</span></a></li>'; }).join("") + '</ul></div>' +
        '<p class="muted">Un code parental (dans les réglages) protège la sortie de cet espace.</p>';
      return { title: "Espace enfant", html: html, back: "#/plus", bind: function () { document.body.classList.add("kid"); onLeave(function () { document.body.classList.remove("kid"); }); } };
    });
  });
  route(/^\/enfant\/(\d+)$/, function (m, params) { return readerView(+m[1], params, true); });

  // Réglages
  route(/^\/reglages$/, function () {
    var L = loc(), st = S.settings;
    var html = '<h2>Réglages</h2><div class="card"><h3>Lieu</h3><p><strong>' + esc(L.name) + '</strong></p><div class="row"><button class="btn" id="gps">Utiliser ma position</button></div>' +
      '<label class="f" for="city">Ou choisir une ville</label><select id="city"><option value="">—</option>' + CITIES.map(function (c, i) { return '<option value="' + i + '">' + esc(c[0]) + '</option>'; }).join("") + '</select>' +
      '<details style="margin-top:.7rem"><summary>Saisie manuelle</summary><label class="f" for="mla">Latitude</label><input type="number" step="0.0001" id="mla"><label class="f" for="mln">Longitude</label><input type="number" step="0.0001" id="mln"><label class="f" for="mtz">Fuseau horaire (ex. Europe/Paris)</label><input type="text" id="mtz" value="' + esc(Intl.DateTimeFormat().resolvedOptions().timeZone) + '"><p><button class="btn alt" id="mset">Enregistrer ce lieu</button></p></details></div>' +
      '<div class="card"><h3>Calcul des prières</h3><label class="f" for="meth">Méthode (angles du Fajr et de l\'Ichâʾ)</label><select id="meth">' + Object.keys(P.METHODS).map(function (k) { return '<option value="' + k + '"' + (st.method === k ? " selected" : "") + '>' + esc(P.METHODS[k].name) + '</option>'; }).join("") + '</select>' +
      '<div id="cust" ' + (st.method === "CUSTOM" ? "" : "hidden") + '><label class="f" for="cf">Angle du Fajr (°)</label><input type="number" step="0.5" id="cf" value="' + st.customFajr + '"><label class="f" for="ci">Angle de l\'Ichâʾ (°)</label><input type="number" step="0.5" id="ci" value="' + st.customIsha + '"></div>' +
      '<details style="margin-top:.7rem"><summary>Ajustements en minutes (pour s\'aligner sur la mosquée locale)</summary>' + [["fajr", "Fajr"], ["sunrise", "Chourouq"], ["dhuhr", "Dhuhr"], ["asr", "ʿAsr"], ["maghrib", "Maghrib"], ["isha", "ʿIshâʾ"]].map(function (p) { return '<label class="f" for="o_' + p[0] + '">' + p[1] + '</label><input type="number" step="1" id="o_' + p[0] + '" data-o="' + p[0] + '" value="' + ((st.offsets && st.offsets[p[0]]) || 0) + '">'; }).join("") + '</details>' +
      '<label class="f" for="hj">Ajustement de la date hégirienne (jours)</label><select id="hj">' + [-2, -1, 0, 1, 2].map(function (n) { return '<option value="' + n + '"' + ((st.hijriOffset || 0) === n ? " selected" : "") + '>' + (n > 0 ? "+" + n : n) + '</option>'; }).join("") + '</select><p class="muted">La date hégirienne affichée suit le calendrier civil d\'Oumm al-Qourâ ; elle peut différer d\'un jour de l\'observation locale.</p>' +
      '<p><label><input type="checkbox" id="nt"' + (st.notif ? " checked" : "") + '> Rappels de prière (uniquement lorsque l\'application est ouverte)</label></p></div>' +
      '<div class="card"><h3>Affichage</h3><label class="f" for="th">Thème</label><select id="th">' + [["auto", "Automatique"], ["light", "Clair"], ["dark", "Sombre"], ["contrast", "Contraste élevé"]].map(function (t) { return '<option value="' + t[0] + '"' + (st.theme === t[0] ? " selected" : "") + '>' + t[1] + '</option>'; }).join("") + '</select><label class="f" for="fs">Taille du texte</label><input type="range" id="fs" min="0.8" max="1.8" step="0.1" value="' + st.fs + '"></div>' +
      '<div class="card"><h3>Code parental</h3><p class="muted">Protège la sortie de l\'espace enfant. Le code reste sur l\'appareil.</p><label class="f" for="pin">Nouveau code (4 chiffres)</label><input type="password" id="pin" inputmode="numeric" maxlength="4" pattern="[0-9]*"><p class="row"><button class="btn alt" id="pset">Enregistrer</button>' + (st.pin ? '<button class="btn danger" id="pclr">Supprimer le code</button>' : "") + '</p></div>' +
      '<div class="card"><h3>Mes données</h3><p class="muted">Signets, mémorisation, journal, compteurs : stockés uniquement sur cet appareil.</p><div class="row"><button class="btn alt" id="exp">Exporter</button><label class="btn alt" for="imp" style="margin:0">Importer</label><input type="file" id="imp" accept="application/json" hidden><button class="btn danger" id="rst">Tout effacer</button></div></div>' +
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
      $("#th", r).onchange = function (e) { st.theme = e.target.value; save(); applyTheme(); };
      $("#fs", r).oninput = function (e) { st.fs = +e.target.value; save(); applyTheme(); };
      $("#pset", r).onclick = function () { var v = $("#pin", r).value; if (!/^\d{4}$/.test(v)) return toast("Le code doit comporter 4 chiffres."); pinHash(v).then(function (h) { st.pin = h; save(); toast("Code enregistré."); render(); }); };
      if ($("#pclr", r)) $("#pclr", r).onclick = function () { st.pin = null; save(); toast("Code supprimé."); render(); };
      $("#exp", r).onclick = function () { download("nur-sauvegarde.json", JSON.stringify(S, null, 1)); };
      $("#imp", r).onchange = function (e) {
        var f = e.target.files[0]; if (!f) return; var fr = new FileReader();
        fr.onload = function () { try { S = merge(DEF(), JSON.parse(fr.result)); save(); applyTheme(); toast("Données importées."); render(); } catch (x) { toast("Fichier invalide."); } };
        fr.readAsText(f);
      };
      $("#rst", r).onclick = function () { if (confirm("Effacer toutes les données de NÛR sur cet appareil ?")) { localStorage.removeItem(KEY); S = DEF(); applyTheme(); toast("Données effacées."); render(); } };
      var off = $("#offl", r);
      if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistration().then(function (reg) { off.textContent = reg && reg.active ? "L'application et le texte du Coran sont disponibles hors ligne sur cet appareil." : "Le mode hors ligne s'active après le premier chargement complet (connexion requise une fois)."; });
      else off.textContent = "Ce navigateur ne permet pas le mode hors ligne.";
    } };
  });

  // À propos
  route(/^\/apropos$/, function () {
    var html = '<h2>À propos</h2><p>NÛR (نور) est une application islamique francophone, sans publicité, sans représentation d\'être vivant, conçue pour les croyants de tous niveaux, avec une attention particulière à la diaspora africaine de rite malikite.</p>' +
      '<div class="card"><h3>Riwaya</h3><p>Le texte est celui de la riwaya de Warsh ʿan Nâfiʿ, selon les données et la police du Complexe du Roi Fahd d\'impression du Noble Coran (KFGQPC), version 0.10 (5 août 2021).</p></div>' +
      '<div class="card"><h3>Sources et licences</h3><ul><li>Données du texte : KFGQPC, relayées par le dépôt public « thetruetruth/quran-data-kfgqpc » (github.com/thetruetruth/quran-data-kfgqpc).</li><li>Police « KFGQPC Warsh Uthmanic Script » : © KFGQPC. Usage, copie et distribution gratuits ; vente, modification et ingénierie inverse interdites. Licence complète : <a href="LICENCE-KFGQPC.txt">LICENCE-KFGQPC.txt</a>.</li><li>Calcul des prières : algorithme astronomique de position solaire, validé à moins d\'une minute contre une bibliothèque indépendante.</li></ul></div>' +
      '<div class="card"><h3>Points en attente</h3><ul><li>Validation par l\'imam garant de la présente version (texte Warsh, leçons de tajwid, formulations).</li><li>Traduction française et translittération : à intégrer à partir d\'une source dont les droits sont établis.</li><li>Récitations audio : à intégrer après accord des ayants droit.</li><li>Abonnements et paiements : non inclus dans cette version, gratuite.</li><li>Notifications d\'adhan en arrière-plan : nécessitent une application native.</li></ul></div>' +
      '<p class="muted">Version ' + VERSION + '. Aucune donnée personnelle n\'est collectée ni transmise.</p>';
    return { title: "À propos", html: html, back: "#/plus" };
  });

  /* ------------------------------------------------------------ routeur */
  var deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredPrompt = e; });
  var TABS = [["#/", "Accueil", "⌂"], ["#/apprendre", "Apprendre", "✎"], ["#/reciter", "Réciter", "❖"], ["#/mediter", "Méditer", "☾"], ["#/aimer", "Aimer", "♡"]];
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
    var found = null;
    for (var i = 0; i < routes.length; i++) { var m = routes[i][0].exec(path); if (m) { found = [routes[i][1], m]; break; } }
    if (!found) { found = [function () { return { title: "NÛR", html: '<p>Page introuvable. <a href="#/">Retour à l\'accueil</a></p>' }; }, []]; }
    Promise.resolve().then(function () { return found[0](found[1], params); }).then(function (v) {
      if (token !== rendering) return;
      var main = $("#main"); main.innerHTML = v.html;
      document.title = (v.title && v.title !== "NÛR" ? v.title + " — " : "") + "NÛR";
      $("#title").innerHTML = v.title === "NÛR" ? 'NÛR <span class="ar" aria-hidden="true">نور</span>' : esc(v.title);
      var back = $("#back"); back.hidden = !v.back; back.onclick = function () {
        if (v.kid && S.settings.pin) { var c = prompt("Code parental"); if (c == null) return; pinHash(c).then(function (h) { if (h === S.settings.pin) location.hash = v.back; else toast("Code incorrect."); }); }
        else if (v.back === "#/plus" && v.title === "Espace enfant" && S.settings.pin) { var c2 = prompt("Code parental"); if (c2 == null) return; pinHash(c2).then(function (h) { if (h === S.settings.pin) location.hash = v.back; else toast("Code incorrect."); }); }
        else location.hash = v.back;
      };
      drawTabs(v.tab === undefined ? null : v.tab);
      if (v.bind) v.bind(main);
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
  function scheduleNotifs() {
    notifTimers.forEach(clearTimeout); notifTimers = [];
    if (!S.settings.notif || !("Notification" in window) || Notification.permission !== "granted") return;
    var L = loc(), now = Date.now(), t0 = ymd(now, L.tz);
    [0, 1].forEach(function (off) {
      var T = timesFor(L, addDays(t0, off));
      ORDER.forEach(function (p) {
        var d = T[p[0]] - now;
        if (d > 0 && d < 36 * 3600e3) notifTimers.push(setTimeout(function () {
          try { new Notification("NÛR — " + p[1], { body: "C'est l'heure de la prière.", icon: "icon-192.png" }); } catch (e) {}
        }, d));
      });
    });
  }
  function netState() { var n = $("#net"); n.textContent = navigator.onLine ? "" : "Hors ligne"; }
  window.addEventListener("online", netState); window.addEventListener("offline", netState);

  applyTheme(); netState(); render(); scheduleNotifs();
  setInterval(function () { if (location.hash === "" || location.hash === "#/") render(); }, 60000);
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(function () {});
  window.__NUR__ = { render: render, state: function () { return S; } };
})();
