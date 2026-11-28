/* NÛR — page de présentation : prochaine prière calculée en direct pour la ville choisie. */
(function () {
  "use strict";
  var P = window.NurPrayer, sel = document.getElementById("ville"), emb = document.getElementById("emb");
  if (emb && window.NurEmblem) emb.innerHTML = window.NurEmblem.svg({ text: false });
  if (!P || !sel) return;
  var ORDER = [["fajr", "Fajr"], ["dhuhr", "Dhuhr"], ["asr", "ʿAsr"], ["maghrib", "Maghrib"], ["isha", "ʿIshâʾ"]];
  function ymd(ts, tz) {
    var p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(ts));
    var g = function (t) { return +p.filter(function (x) { return x.type === t; })[0].value; };
    return { y: g("year"), m: g("month"), d: g("day") };
  }
  function fmt(ts, tz) { return new Intl.DateTimeFormat("fr-FR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(ts)); }
  function draw() {
    var v = sel.value.split(","), lat = +v[0], lng = +v[1], tz = v[2], now = Date.now(), o = ymd(now, tz);
    var T = P.compute(o.y, o.m, o.d, lat, lng, { method: "MWL", offsets: {} }), next = null;
    for (var i = 0; i < ORDER.length; i++) if (T[ORDER[i][0]] > now) { next = [ORDER[i][1], T[ORDER[i][0]], ORDER[i][0]]; break; }
    if (!next) { var d2 = new Date(Date.UTC(o.y, o.m - 1, o.d + 1, 12)), T2 = P.compute(d2.getUTCFullYear(), d2.getUTCMonth() + 1, d2.getUTCDate(), lat, lng, { method: "MWL", offsets: {} }); next = ["Fajr", T2.fajr, "fajr"]; }
    if (emb && window.NurEmblem) window.NurEmblem.place(emb, T, tz, next[2]);
    var m = Math.max(0, Math.round((next[1] - now) / 60000));
    document.getElementById("lvn").textContent = next[0];
    document.getElementById("lvt").textContent = fmt(next[1], tz) + " · dans " + Math.floor(m / 60) + " h " + String(m % 60).padStart(2, "0");
    document.getElementById("lvc").innerHTML = ORDER.map(function (x) { return '<span' + (x[1] === next[0] ? ' class="on"' : '') + '><small>' + x[1] + '</small>' + fmt(T[x[0]], tz) + '</span>'; }).join("");
  }
  sel.addEventListener("change", draw);
  draw(); setInterval(draw, 30000);
})();

/* Encart « En direct » : présence anonyme, visible seulement quand le compteur est activé (ou en aperçu ?apercu=1). */
(function () {
  "use strict";
  var box = document.getElementById("live"); if (!box) return;
  var shown = {};
  function tween(el, to) {
    var from = shown[el.dataset.n] || 0; shown[el.dataset.n] = to; if (from === to) { el.textContent = to.toLocaleString("fr-FR"); return; }
    var t0 = performance.now(), d = 900;
    (function step(t) { var k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e).toLocaleString("fr-FR"); if (k < 1) requestAnimationFrame(step); else { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); } })(t0);
  }
  function set(k, v) { var el = box.querySelector('[data-n="' + k + '"]'); if (el && v != null) tween(el, v); }
  if (/[?&]apercu=1/.test(location.search)) {
    box.hidden = false; box.classList.add("demo"); document.getElementById("lnNote").textContent = "aperçu du design, chiffres fictifs";
    set("page", 3); set("app", 41); set("total", 1280);
    setInterval(function () { set("page", 2 + Math.round(Math.random() * 3)); set("app", 38 + Math.round(Math.random() * 8)); }, 4000);
    return;
  }
  fetch("../config.json").then(function (r) { return r.json(); }).then(function (c) {
    var cfg = c && c.presence; if (!cfg || !cfg.url || !cfg.key || !window.NurPresence) return;
    box.hidden = false;
    NurPresence.start(cfg, "page", function (n) { set("page", n.page); set("app", n.app); });
    var tot = function () { NurPresence.installs(cfg, false).then(function (n) { set("total", n); }); }; tot(); setInterval(tot, 60000);
  }).catch(function () {});
})();
