/* NÛR — page de présentation : prochaine prière calculée en direct pour la ville choisie. */
(function () {
  "use strict";
  var P = window.NurPrayer, sel = document.getElementById("ville");
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
    for (var i = 0; i < ORDER.length; i++) if (T[ORDER[i][0]] > now) { next = [ORDER[i][1], T[ORDER[i][0]]]; break; }
    if (!next) { var d2 = new Date(Date.UTC(o.y, o.m - 1, o.d + 1, 12)), T2 = P.compute(d2.getUTCFullYear(), d2.getUTCMonth() + 1, d2.getUTCDate(), lat, lng, { method: "MWL", offsets: {} }); next = ["Fajr", T2.fajr]; }
    var m = Math.max(0, Math.round((next[1] - now) / 60000));
    document.getElementById("lvn").textContent = next[0];
    document.getElementById("lvt").textContent = fmt(next[1], tz) + " · dans " + Math.floor(m / 60) + " h " + String(m % 60).padStart(2, "0");
    document.getElementById("lvc").innerHTML = ORDER.map(function (x) { return '<span' + (x[1] === next[0] ? ' class="on"' : '') + '><small>' + x[1] + '</small>' + fmt(T[x[0]], tz) + '</span>'; }).join("");
  }
  sel.addEventListener("change", draw);
  draw(); setInterval(draw, 30000);
})();
